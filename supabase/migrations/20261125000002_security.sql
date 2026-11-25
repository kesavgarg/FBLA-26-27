-- =====================================================================
-- Security: role helpers, profile creation, role protection, RLS.
-- ---------------------------------------------------------------------
-- Three layers protect every record:
--   1. Next.js server code checks the user's role before any action.
--   2. Row Level Security (below) limits which rows each role can see/change.
--   3. Sensitive multi-step changes run in SECURITY DEFINER functions that
--      re-check the caller's role inside one transaction.
-- =====================================================================

-- ---------- Role helper functions --------------------------------------
-- SECURITY DEFINER lets these read profiles without being blocked by RLS
-- (otherwise a policy that calls them would recurse). They only ever look
-- up the CURRENT user's own role.

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_user_role() in ('staff', 'owner'), false); $$;

create or replace function public.is_doctor()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_user_role() = 'doctor', false); $$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_user_role() = 'owner', false); $$;

-- Staff, doctors and the owner may read patient context; customers may not.
create or replace function public.is_care_team()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_user_role() in ('staff', 'doctor', 'owner'), false); $$;

-- ---------- Profile creation on sign-up -------------------------------
-- Every new Supabase Auth user gets a profile. The role is ALWAYS
-- 'customer' here; nothing the user sends at sign-up can change that.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_name text := nullif(trim(meta ->> 'full_name'), '');
  requested_dob date;
begin
  -- Accept a date of birth only if it parses and is in the past.
  begin
    requested_dob := (meta ->> 'date_of_birth')::date;
    if requested_dob > current_date then requested_dob := null; end if;
  exception when others then
    requested_dob := null;
  end;

  insert into public.profiles (id, email, full_name, date_of_birth, role)
  values (
    new.id,
    lower(new.email),
    left(coalesce(requested_name, split_part(new.email, '@', 1)), 80),
    requested_dob,
    'customer'
  );

  insert into public.user_preferences (profile_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the profile email in step if the auth email changes.
create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles set email = lower(new.email) where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------- Role protection -------------------------------------------
-- Defence in depth: even if a column grant were changed by mistake, this
-- trigger stops anyone except an owner (or the server's service role) from
-- changing a role, and stops an owner from changing their own role.

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  jwt_role text := (select auth.role());
begin
  if new.role is distinct from old.role then
    if jwt_role is null or jwt_role = 'service_role' then
      return new; -- migrations, seed scripts, server-only admin code
    end if;
    if not public.is_owner() then
      raise exception 'Only the owner can change user roles' using errcode = '42501';
    end if;
    if old.id = (select auth.uid()) then
      raise exception 'Owners cannot change their own role' using errcode = '42501';
    end if;
  end if;
  if new.is_demo is distinct from old.is_demo and jwt_role is not null and jwt_role <> 'service_role' then
    raise exception 'The demo flag cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- Owners change roles through this function (called from a server action).
create or replace function public.set_user_role(target_user uuid, new_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_owner() then
    raise exception 'Only the owner can change user roles' using errcode = '42501';
  end if;
  if target_user = (select auth.uid()) then
    raise exception 'Owners cannot change their own role' using errcode = '42501';
  end if;

  update public.profiles set role = new_role where id = target_user;
  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, target_type, target_id, details)
  values ((select auth.uid()), 'owner', 'role.changed', 'profile', target_user::text,
          jsonb_build_object('new_role', new_role));
end;
$$;

-- ---------- Audit helper ----------------------------------------------
-- Server actions call this to record staff/doctor/owner actions. The actor
-- is always taken from the session, never from the caller's arguments.

create or replace function public.log_audit(
  p_action text, p_target_type text, p_target_id text, p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  insert into public.audit_logs (actor_id, actor_role, action, target_type, target_id, details)
  values ((select auth.uid()), public.current_user_role(), p_action, p_target_type, p_target_id,
          coalesce(p_details, '{}'::jsonb));
end;
$$;

-- ---------- Turn on Row Level Security everywhere ---------------------
alter table public.profiles            enable row level security;
alter table public.family_members      enable row level security;
alter table public.allergies           enable row level security;
alter table public.current_medications enable row level security;
alter table public.products            enable row level security;
alter table public.inventory           enable row level security;
alter table public.store_settings      enable row level security;
alter table public.pickup_slots        enable row level security;
alter table public.symptom_logs        enable row level security;
alter table public.consult_requests    enable row level security;
alter table public.prescriptions       enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.refill_requests     enable row level security;
alter table public.messages            enable row level security;
alter table public.audit_logs          enable row level security;
alter table public.user_preferences    enable row level security;
alter table public.usability_sessions  enable row level security;

-- ---------- Column-level privileges -----------------------------------
-- Customers may only edit their own name, phone and date of birth.
-- Role, email and the demo flag are not writable by the API at all.
revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone, date_of_birth) on public.profiles to authenticated;

-- Audit logs are append-only and written through log_audit().
revoke insert, update, delete on public.audit_logs from authenticated, anon;

-- ---------- Policies: people ------------------------------------------

create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: care team reads all" on public.profiles
  for select to authenticated using (public.is_care_team());
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "family: owner manages" on public.family_members
  for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "family: care team reads" on public.family_members
  for select to authenticated using (public.is_care_team());

create policy "allergies: owner manages" on public.allergies
  for all to authenticated
  using (
    profile_id = (select auth.uid())
    or family_member_id in (select id from public.family_members where owner_id = (select auth.uid()))
  )
  with check (
    profile_id = (select auth.uid())
    or family_member_id in (select id from public.family_members where owner_id = (select auth.uid()))
  );
create policy "allergies: care team reads" on public.allergies
  for select to authenticated using (public.is_care_team());

create policy "medications: owner manages" on public.current_medications
  for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "medications: care team reads" on public.current_medications
  for select to authenticated using (public.is_care_team());

create policy "prefs: owner manages" on public.user_preferences
  for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

-- ---------- Policies: catalog, stock, store ----------------------------

create policy "products: anyone reads active" on public.products
  for select to anon, authenticated using (is_active or public.is_staff());
create policy "products: staff insert" on public.products
  for insert to authenticated with check (public.is_staff());
create policy "products: staff update" on public.products
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "inventory: anyone reads" on public.inventory
  for select to anon, authenticated using (true);
create policy "inventory: staff insert" on public.inventory
  for insert to authenticated with check (public.is_staff());
create policy "inventory: staff update" on public.inventory
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "settings: anyone reads" on public.store_settings
  for select to anon, authenticated using (true);
create policy "settings: owner updates" on public.store_settings
  for update to authenticated using (public.is_owner()) with check (public.is_owner());

create policy "slots: anyone reads" on public.pickup_slots
  for select to anon, authenticated using (true);

-- ---------- Policies: health workflow ---------------------------------

create policy "symptoms: patient manages" on public.symptom_logs
  for all to authenticated
  using (patient_id = (select auth.uid())) with check (patient_id = (select auth.uid()));
create policy "symptoms: doctor reads" on public.symptom_logs
  for select to authenticated using (public.is_doctor() or public.is_owner());

create policy "consults: patient reads own" on public.consult_requests
  for select to authenticated using (patient_id = (select auth.uid()));
create policy "consults: patient creates own" on public.consult_requests
  for insert to authenticated
  with check (patient_id = (select auth.uid()) and status = 'submitted' and doctor_id is null);
create policy "consults: doctor and owner read" on public.consult_requests
  for select to authenticated using (public.is_doctor() or public.is_owner());
-- Decisions and replies go through SECURITY DEFINER functions (Phase 4).

create policy "rx: patient reads own" on public.prescriptions
  for select to authenticated using (patient_id = (select auth.uid()));
create policy "rx: care team reads" on public.prescriptions
  for select to authenticated using (public.is_care_team());
-- Prescriptions are only created by the doctor-approval function.

-- ---------- Policies: orders and refills -------------------------------

create policy "orders: customer reads own" on public.orders
  for select to authenticated using (customer_id = (select auth.uid()));
create policy "orders: staff reads all" on public.orders
  for select to authenticated using (public.is_staff());
-- Orders are created only by place_order() and changed only by status functions.

create policy "order items: visible with order" on public.order_items
  for select to authenticated using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.customer_id = (select auth.uid()) or public.is_staff())
    )
  );

create policy "refills: patient reads own" on public.refill_requests
  for select to authenticated using (patient_id = (select auth.uid()));
create policy "refills: staff reads all" on public.refill_requests
  for select to authenticated using (public.is_staff());

-- ---------- Policies: messages, audit, usability -----------------------

create policy "messages: thread participants read" on public.messages
  for select to authenticated using (
    (order_id is not null and (public.is_staff() or exists (
      select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid()))))
    or (refill_id is not null and (public.is_staff() or exists (
      select 1 from public.refill_requests r where r.id = refill_id and r.patient_id = (select auth.uid()))))
    or (consult_id is not null and (public.is_doctor() or exists (
      select 1 from public.consult_requests c where c.id = consult_id and c.patient_id = (select auth.uid()))))
  );
create policy "messages: participants send" on public.messages
  for insert to authenticated with check (
    sender_id = (select auth.uid())
    and kind = 'message'
    and (
      (order_id is not null and (public.is_staff() or exists (
        select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid()))))
      or (refill_id is not null and (public.is_staff() or exists (
        select 1 from public.refill_requests r where r.id = refill_id and r.patient_id = (select auth.uid()))))
      or (consult_id is not null and (public.is_doctor() or exists (
        select 1 from public.consult_requests c where c.id = consult_id and c.patient_id = (select auth.uid()))))
    )
  );

create policy "audit: owner reads" on public.audit_logs
  for select to authenticated using (public.is_owner());

create policy "usability: owner manages" on public.usability_sessions
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- ---------- Function privileges ---------------------------------------
-- Functions are callable by PUBLIC by default; tighten that.
revoke execute on function public.set_user_role(uuid, public.user_role) from public, anon;
grant execute on function public.set_user_role(uuid, public.user_role) to authenticated;
revoke execute on function public.log_audit(text, text, text, jsonb) from public, anon;
grant execute on function public.log_audit(text, text, text, jsonb) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
