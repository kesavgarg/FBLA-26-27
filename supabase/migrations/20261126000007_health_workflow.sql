-- =====================================================================
-- Health workflow: symptom check → consult → doctor decision → Rx,
-- plus the pharmacy staff tools (order status, refills, stock, messages).
-- ---------------------------------------------------------------------
-- The software never decides what to prescribe. Only a signed-in DOCTOR
-- can approve, and only the approval function creates a prescription.
-- Every decision and staff change is written to audit_logs.
-- All clinical content is fictional demo data.
-- =====================================================================

-- ---------- Ingredient classes for allergy checks (fictional demo table) --
-- Lets "allergic to penicillin" also block amoxicillin. Deliberately tiny
-- and labelled demo data — NOT a medical reference.
create table public.ingredient_classes (
  ingredient  text primary key,
  drug_class  text not null
);
insert into public.ingredient_classes (ingredient, drug_class) values
  ('amoxicillin', 'penicillin'),
  ('aspirin', 'nsaid'),
  ('ibuprofen', 'nsaid'),
  ('naproxen', 'nsaid');
alter table public.ingredient_classes enable row level security;
create policy "classes: anyone reads" on public.ingredient_classes for select to anon, authenticated using (true);
grant select on public.ingredient_classes to anon, authenticated;
grant all on public.ingredient_classes to service_role;

-- Allergy match by exact ingredient OR by drug class.
create or replace function public.allergy_conflict(p_patient uuid, p_product uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select a.substance
  from public.products p
  left join public.ingredient_classes c on c.ingredient = lower(p.active_ingredient)
  join public.allergies a on a.profile_id = p_patient
  where p.id = p_product and p.active_ingredient is not null
    and (lower(a.substance) = lower(p.active_ingredient) or lower(a.substance) = c.drug_class)
  limit 1;
$$;

-- ---------- Consults: what the doctor approved ---------------------------
alter table public.consult_requests
  add column triage_result public.triage_outcome,
  add column wearable_snapshot jsonb;

-- ---------- Customer submits a consult request ------------------------------
-- Snapshots the patient's allergies and medications at this moment, so the
-- doctor reviews exactly what was submitted.
create or replace function public.submit_consult(p_symptom_log uuid, p_summary text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_log public.symptom_logs%rowtype;
  v_id uuid;
begin
  if v_user is null then raise exception 'SIGN_IN_REQUIRED'; end if;
  select * into v_log from public.symptom_logs where id = p_symptom_log and patient_id = v_user;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_log.triage_result = 'EMERGENCY' then raise exception 'EMERGENCY_NOT_CONSULT'; end if;
  if char_length(coalesce(trim(p_summary), '')) < 10 then raise exception 'SUMMARY_SHORT'; end if;
  if exists (select 1 from public.consult_requests where patient_id = v_user and status in ('submitted', 'under_review', 'needs_info')) then
    raise exception 'CONSULT_OPEN';
  end if;

  insert into public.consult_requests
    (patient_id, symptom_log_id, summary, allergies_snapshot, medications_snapshot, triage_result, wearable_snapshot)
  values (
    v_user, v_log.id, left(trim(p_summary), 1000),
    coalesce((select array_agg(substance || coalesce(' (' || reaction || ')', '')) from public.allergies where profile_id = v_user), '{}'),
    coalesce((select array_agg(name) from public.current_medications where profile_id = v_user), '{}'),
    v_log.triage_result, v_log.wearable_snapshot
  )
  returning id into v_id;

  insert into public.audit_logs (actor_id, actor_role, action, target_type, target_id, details)
  values (v_user, public.current_user_role(), 'consult.submitted', 'consult', v_id::text, '{}'::jsonb);
  return v_id;
end;
$$;

-- ---------- Customer answers "need more information" ------------------------
create or replace function public.reply_to_consult(p_consult uuid, p_reply text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  c public.consult_requests%rowtype;
begin
  select * into c from public.consult_requests where id = p_consult for update;
  if not found or c.patient_id <> v_user then raise exception 'NOT_FOUND'; end if;
  if c.status <> 'needs_info' then raise exception 'NOT_WAITING_FOR_REPLY'; end if;
  if char_length(coalesce(trim(p_reply), '')) < 2 then raise exception 'REPLY_REQUIRED'; end if;

  update public.consult_requests set patient_reply = left(trim(p_reply), 1000), status = 'under_review' where id = p_consult;
  insert into public.messages (consult_id, sender_id, kind, body) values (p_consult, v_user, 'message', left(trim(p_reply), 1000));
  insert into public.audit_logs (actor_id, actor_role, action, target_type, target_id, details)
  values (v_user, public.current_user_role(), 'consult.replied', 'consult', p_consult::text, '{}'::jsonb);
end;
$$;

-- ---------- Doctor opens a request (claims it) ----------------------------
create or replace function public.doctor_open_consult(p_consult uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_doctor() then raise exception 'NOT_ALLOWED'; end if;
  update public.consult_requests
  set status = 'under_review', doctor_id = coalesce(doctor_id, (select auth.uid()))
  where id = p_consult and status = 'submitted';
end;
$$;

-- ---------- Doctor decides ------------------------------------------------
-- approve   → creates an ACTIVE prescription for THIS patient and THIS
--             product (never a controlled substance: only products already
--             in the catalog's prescription category can be chosen)
-- deny      → no prescription; the product stays locked
-- needs_info→ question goes to the patient
create or replace function public.doctor_decide_consult(
  p_consult uuid,
  p_decision text,
  p_note text,
  p_product uuid default null,
  p_directions text default null,
  p_refills int default 0,
  p_valid_days int default 180
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doctor uuid := (select auth.uid());
  c public.consult_requests%rowtype;
  v_product public.products%rowtype;
  v_allergen text;
  v_rx uuid;
  v_rx_number text;
begin
  if not public.is_doctor() then raise exception 'NOT_ALLOWED'; end if;
  select * into c from public.consult_requests where id = p_consult for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if c.status not in ('submitted', 'under_review') then raise exception 'ALREADY_DECIDED'; end if;
  if char_length(coalesce(trim(p_note), '')) < 3 then raise exception 'NOTE_REQUIRED'; end if;

  if p_decision = 'needs_info' then
    update public.consult_requests
    set status = 'needs_info', doctor_id = v_doctor, info_request = left(trim(p_note), 500)
    where id = p_consult;
    insert into public.messages (consult_id, sender_id, kind, body) values (p_consult, v_doctor, 'message', left(trim(p_note), 1000));
    insert into public.audit_logs (actor_id, actor_role, action, target_type, target_id, details)
    values (v_doctor, 'doctor', 'consult.info_requested', 'consult', p_consult::text, '{}'::jsonb);
    return jsonb_build_object('status', 'needs_info');
  end if;

  if p_decision = 'deny' then
    update public.consult_requests
    set status = 'denied', doctor_id = v_doctor, doctor_note = left(trim(p_note), 1000), decided_at = now()
    where id = p_consult;
    insert into public.audit_logs (actor_id, actor_role, action, target_type, target_id, details)
    values (v_doctor, 'doctor', 'consult.denied', 'consult', p_consult::text, '{}'::jsonb);
    return jsonb_build_object('status', 'denied');
  end if;

  if p_decision <> 'approve' then raise exception 'BAD_DECISION'; end if;

  select * into v_product from public.products where id = p_product;
  if not found or not v_product.requires_rx or not v_product.is_active then raise exception 'RX_PRODUCT_REQUIRED'; end if;
  if char_length(coalesce(trim(p_directions), '')) < 5 then raise exception 'DIRECTIONS_REQUIRED'; end if;
  if p_refills not between 0 and 5 then raise exception 'REFILLS_RANGE'; end if;
  if p_valid_days not between 7 and 365 then raise exception 'VALID_DAYS_RANGE'; end if;
  v_allergen := public.allergy_conflict(c.patient_id, p_product);
  if v_allergen is not null then raise exception 'ALLERGY_BLOCK:%', v_allergen; end if;

  perform pg_advisory_xact_lock(hashtext('goodson_rx_number'));
  select 'RX-' || lpad((coalesce(max(substring(rx_number from 4)::int), 100299) + 1)::text, 6, '0')
    into v_rx_number from public.prescriptions;

  insert into public.prescriptions
    (rx_number, patient_id, product_id, prescriber_id, consult_id, directions, refills_remaining, status, written_on, expires_on)
  values
    (v_rx_number, c.patient_id, p_product, v_doctor, p_consult, left(trim(p_directions), 300), p_refills, 'active',
     current_date, current_date + p_valid_days)
  returning id into v_rx;

  update public.consult_requests
  set status = 'approved', doctor_id = v_doctor, doctor_note = left(trim(p_note), 1000),
      requested_product_id = p_product, decided_at = now()
  where id = p_consult;

  insert into public.audit_logs (actor_id, actor_role, action, target_type, target_id, details)
  values (v_doctor, 'doctor', 'consult.approved', 'consult', p_consult::text,
          jsonb_build_object('rx_number', v_rx_number, 'product', v_product.slug, 'refills', p_refills));
  return jsonb_build_object('status', 'approved', 'prescription_id', v_rx, 'rx_number', v_rx_number);
end;
$$;

-- ---------- Staff: move an order along ----------------------------------
-- Allowed steps:
--   received → preparing → ready_for_pickup (pickup) / out_for_delivery (delivery) → completed
--   any step before completed → cancelled (reason required; stock and slot returned)
create or replace function public.staff_set_order_status(p_order uuid, p_status public.order_status, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff uuid := (select auth.uid());
  o public.orders%rowtype;
  v_ok boolean;
  v_pharmacist text;
  v_body text;
begin
  if not public.is_staff() then raise exception 'NOT_ALLOWED'; end if;
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  v_ok := case
    when p_status = 'cancelled' then o.status not in ('completed', 'cancelled')
    when o.status = 'received' then p_status = 'preparing'
    when o.status = 'preparing' then p_status = case o.fulfillment when 'pickup' then 'ready_for_pickup'::public.order_status else 'out_for_delivery'::public.order_status end
    when o.status in ('ready_for_pickup', 'out_for_delivery') then p_status = 'completed'
    else false
  end;
  if not v_ok then raise exception 'BAD_TRANSITION:%|%', o.status, p_status; end if;
  if p_status = 'cancelled' and char_length(coalesce(trim(p_reason), '')) < 3 then raise exception 'REASON_REQUIRED'; end if;

  update public.orders set status = p_status, cancel_reason = case when p_status = 'cancelled' then left(trim(p_reason), 300) end
  where id = p_order;

  if p_status = 'cancelled' then
    update public.inventory i set quantity = i.quantity + oi.quantity, updated_at = now()
      from public.order_items oi where oi.order_id = p_order and oi.product_id = i.product_id;
    update public.prescriptions r set first_filled_at = null
      from public.order_items oi where oi.order_id = p_order and oi.prescription_id = r.id;
    if o.pickup_slot_id is not null then
      update public.pickup_slots set booked_count = greatest(booked_count - 1, 0) where id = o.pickup_slot_id;
    end if;
  end if;

  select pharmacist_name into v_pharmacist from public.store_settings where id = 1;
  v_body := case p_status
    when 'preparing' then 'Your order is being prepared.'
    when 'ready_for_pickup' then 'Your order is ready for pickup at 116 W. Maple St. Pharmacist: ' || v_pharmacist || '.'
    when 'out_for_delivery' then 'Your order is out for delivery.'
    when 'completed' then 'Order completed. Thank you for choosing Goodson.'
    else 'Order cancelled by the pharmacy: ' || left(trim(p_reason), 200)
  end;
  insert into public.messages (order_id, sender_id, kind, body)
  values (p_order, v_staff, case when p_status = 'ready_for_pickup' then 'pickup_ready'::public.message_kind else 'status_update'::public.message_kind end, v_body);

  insert into public.audit_logs (actor_id, actor_role, action, target_type, target_id, details)
  values (v_staff, public.current_user_role(), 'order.status_changed', 'order', p_order::text,
          jsonb_build_object('from', o.status, 'to', p_status, 'order_number', o.order_number));
end;
$$;

-- ---------- Staff: move a refill along ----------------------------------
-- requested → verified → preparing → ready → completed (uses one refill);
-- requested/verified → rejected (note required).
-- Verifying re-checks eligibility in case the prescription changed.
create or replace function public.staff_set_refill_status(p_refill uuid, p_status public.refill_status, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff uuid := (select auth.uid());
  r public.refill_requests%rowtype;
  rx public.prescriptions%rowtype;
  v_ok boolean;
begin
  if not public.is_staff() then raise exception 'NOT_ALLOWED'; end if;
  select * into r from public.refill_requests where id = p_refill for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  select * into rx from public.prescriptions where id = r.prescription_id for update;

  v_ok := case
    when p_status = 'rejected' then r.status in ('requested', 'verified')
    when r.status = 'requested' then p_status = 'verified'
    when r.status = 'verified' then p_status = 'preparing'
    when r.status = 'preparing' then p_status = 'ready'
    when r.status = 'ready' then p_status = 'completed'
    else false
  end;
  if not v_ok then raise exception 'BAD_TRANSITION:%|%', r.status, p_status; end if;
  if p_status = 'rejected' and char_length(coalesce(trim(p_note), '')) < 3 then raise exception 'REASON_REQUIRED'; end if;

  if p_status = 'verified' then
    if rx.status <> 'active' then raise exception 'RX_INACTIVE'; end if;
    if rx.expires_on < current_date then raise exception 'RX_EXPIRED'; end if;
    if rx.refills_remaining <= 0 then raise exception 'RX_NO_REFILLS'; end if;
  end if;
  if p_status = 'completed' then
    update public.prescriptions set refills_remaining = refills_remaining - 1 where id = rx.id and refills_remaining > 0;
  end if;
  if p_status = 'rejected' and r.pickup_slot_id is not null then
    update public.pickup_slots set booked_count = greatest(booked_count - 1, 0) where id = r.pickup_slot_id;
  end if;

  update public.refill_requests
  set status = p_status, staff_note = coalesce(left(nullif(trim(p_note), ''), 300), staff_note),
      completed_at = case when p_status = 'completed' then now() else completed_at end
  where id = p_refill;

  insert into public.messages (refill_id, sender_id, kind, body)
  values (p_refill, v_staff, case when p_status = 'ready' then 'pickup_ready'::public.message_kind else 'status_update'::public.message_kind end,
          case p_status
            when 'verified' then 'Your pharmacist verified this refill.'
            when 'preparing' then 'Your refill is being prepared.'
            when 'ready' then 'Your refill is ready.'
            when 'completed' then 'Refill completed.'
            else 'Refill not approved: ' || left(trim(p_note), 200)
          end);
  insert into public.audit_logs (actor_id, actor_role, action, target_type, target_id, details)
  values (v_staff, public.current_user_role(), 'refill.status_changed', 'refill', p_refill::text,
          jsonb_build_object('from', r.status, 'to', p_status, 'rx_number', rx.rx_number));
end;
$$;

-- ---------- Staff: stock, price and availability ---------------------------
create or replace function public.staff_update_product(
  p_product uuid,
  p_quantity int,
  p_price_cents int,
  p_is_active boolean,
  p_low_stock_threshold int default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff uuid := (select auth.uid());
  old_p public.products%rowtype;
  old_qty int;
begin
  if not public.is_staff() then raise exception 'NOT_ALLOWED'; end if;
  if p_quantity < 0 or p_quantity > 9999 then raise exception 'QUANTITY_RANGE'; end if;
  if p_price_cents < 0 or p_price_cents > 100000 then raise exception 'PRICE_RANGE'; end if;
  select * into old_p from public.products where id = p_product for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  select quantity into old_qty from public.inventory where product_id = p_product for update;

  update public.products set price_cents = p_price_cents, is_active = p_is_active where id = p_product;
  update public.inventory
  set quantity = p_quantity, low_stock_threshold = coalesce(p_low_stock_threshold, low_stock_threshold),
      updated_by = v_staff, updated_at = now()
  where product_id = p_product;

  insert into public.audit_logs (actor_id, actor_role, action, target_type, target_id, details)
  values (v_staff, public.current_user_role(), 'inventory.updated', 'product', p_product::text,
          jsonb_build_object('slug', old_p.slug,
            'quantity', jsonb_build_object('from', old_qty, 'to', p_quantity),
            'price_cents', jsonb_build_object('from', old_p.price_cents, 'to', p_price_cents),
            'active', jsonb_build_object('from', old_p.is_active, 'to', p_is_active)));
end;
$$;

create or replace function public.staff_add_product(
  p_name text, p_name_es text, p_description text, p_description_es text,
  p_category public.product_category, p_price_cents int, p_quantity int, p_active_ingredient text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff uuid := (select auth.uid());
  v_id uuid;
  v_slug text;
begin
  if not public.is_staff() then raise exception 'NOT_ALLOWED'; end if;
  if p_category = 'prescription' then raise exception 'NO_NEW_RX_PRODUCTS'; end if;
  if char_length(trim(p_name)) < 2 then raise exception 'NAME_REQUIRED'; end if;
  if p_price_cents < 0 or p_price_cents > 100000 then raise exception 'PRICE_RANGE'; end if;
  if p_quantity < 0 or p_quantity > 9999 then raise exception 'QUANTITY_RANGE'; end if;

  v_slug := left(trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g')), 70);
  if char_length(v_slug) < 3 then v_slug := 'product'; end if;
  v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4);

  insert into public.products (slug, name, name_es, description, description_es, category, price_cents, requires_rx, active_ingredient, image_alt)
  values (v_slug, left(trim(p_name), 80), left(coalesce(nullif(trim(p_name_es), ''), trim(p_name)), 80),
          left(trim(p_description), 600), left(coalesce(nullif(trim(p_description_es), ''), trim(p_description)), 600),
          p_category, p_price_cents, false, nullif(lower(trim(p_active_ingredient)), ''), left(trim(p_name), 80))
  returning id into v_id;
  insert into public.inventory (product_id, quantity, updated_by) values (v_id, p_quantity, v_staff);

  insert into public.audit_logs (actor_id, actor_role, action, target_type, target_id, details)
  values (v_staff, public.current_user_role(), 'product.added', 'product', v_id::text, jsonb_build_object('slug', v_slug));
  return v_id;
end;
$$;

-- ---------- Staff message on an order ------------------------------------
create or replace function public.staff_message_order(p_order uuid, p_body text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_staff() then raise exception 'NOT_ALLOWED'; end if;
  if char_length(coalesce(trim(p_body), '')) < 1 then raise exception 'MESSAGE_REQUIRED'; end if;
  insert into public.messages (order_id, sender_id, kind, body) values (p_order, (select auth.uid()), 'message', left(trim(p_body), 1000));
  insert into public.audit_logs (actor_id, actor_role, action, target_type, target_id, details)
  values ((select auth.uid()), public.current_user_role(), 'order.message_sent', 'order', p_order::text, '{}'::jsonb);
end;
$$;

-- ---------- Privileges ----------------------------------------------------
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.submit_consult(uuid, text)',
    'public.reply_to_consult(uuid, text)',
    'public.doctor_open_consult(uuid)',
    'public.doctor_decide_consult(uuid, text, text, uuid, text, int, int)',
    'public.staff_set_order_status(uuid, public.order_status, text)',
    'public.staff_set_refill_status(uuid, public.refill_status, text)',
    'public.staff_update_product(uuid, int, int, boolean, int)',
    'public.staff_add_product(text, text, text, text, public.product_category, int, int, text)',
    'public.staff_message_order(uuid, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated, service_role', fn);
  end loop;
end;
$$;
revoke execute on function public.allergy_conflict(uuid, uuid) from public, anon, authenticated;
grant execute on function public.allergy_conflict(uuid, uuid) to service_role;

-- Products are only changed through the staff functions above (audited),
-- so remove the direct table write policies added in migration 2.
drop policy if exists "products: staff insert" on public.products;
drop policy if exists "products: staff update" on public.products;
drop policy if exists "inventory: staff insert" on public.inventory;
drop policy if exists "inventory: staff update" on public.inventory;

-- Staff and doctors also need to see the messages/consults/refills of the
-- patients they help; customers keep seeing only their own (migration 2).
-- Consult requests are only created through submit_consult() (which takes
-- the allergy/medication snapshot), never by a direct insert.
drop policy if exists "consults: patient creates own" on public.consult_requests;

create policy "consults: staff read" on public.consult_requests
  for select to authenticated using (public.is_staff());

-- ---------- Demo reset extension ------------------------------------------
create or replace function public.reset_demo_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  result := public.reset_demo_data_base();
  delete from public.cart_items where true;
  update public.prescriptions set first_filled_at = created_at where first_filled_at is null;
  -- Daniel's pending consult carries the triage result of its symptom log.
  update public.consult_requests c set triage_result = l.triage_result
    from public.symptom_logs l where c.symptom_log_id = l.id;
  return result;
end;
$$;
