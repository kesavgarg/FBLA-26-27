-- =====================================================================
-- Ordering: cart, atomic checkout, cancellation, refill requests.
-- ---------------------------------------------------------------------
-- Every rule that protects stock, prescriptions or money is enforced
-- HERE, inside one database transaction, even though the website checks
-- the same rules first to show friendly messages. A request that skips
-- the website (for example from a browser console) still hits these.
--
-- Errors are raised as 'CODE' or 'CODE:detail' (SQLSTATE P0001). The
-- website maps each CODE to an English/Spanish message.
-- =====================================================================

-- ---------- Settings: delivery area ------------------------------------
alter table public.store_settings
  add column delivery_zips text[] not null default array['30040', '30041', '30028'],
  add column max_line_quantity int not null default 10 check (max_line_quantity between 1 and 20);

-- ---------- Prescriptions: first fill vs refills ------------------------
-- An approved prescription may be bought ONCE through the shop (its first
-- fill). After that, more supply comes only through a refill request.
alter table public.prescriptions add column first_filled_at timestamptz;
update public.prescriptions set first_filled_at = created_at where status = 'active' or status = 'inactive';

-- ---------- Cart --------------------------------------------------------
create table public.cart_items (
  profile_id       uuid not null references public.profiles (id) on delete cascade,
  product_id       uuid not null references public.products (id) on delete cascade,
  quantity         int not null check (quantity between 1 and 20),
  prescription_id  uuid references public.prescriptions (id) on delete cascade,
  added_at         timestamptz not null default now(),
  primary key (profile_id, product_id)
);
alter table public.cart_items enable row level security;
create policy "cart: owner manages" on public.cart_items
  for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
grant select, insert, update, delete on public.cart_items to authenticated;
grant all on public.cart_items to service_role;

-- ---------- Shared checks ----------------------------------------------

-- Is this prescription usable for a first fill of this product by this patient?
create or replace function public.rx_first_fill_ok(p_rx uuid, p_patient uuid, p_product uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.prescriptions r
    where r.id = p_rx and r.patient_id = p_patient and r.product_id = p_product
      and r.status = 'active' and r.expires_on >= current_date and r.first_filled_at is null
  );
$$;

-- Does the patient have an allergy that matches this product's ingredient?
-- (Simple fictional demo rule: exact ingredient name match. Phase 4 adds a
-- small, clearly labelled drug-class table, e.g. amoxicillin → penicillin.)
create or replace function public.allergy_conflict(p_patient uuid, p_product uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select a.substance
  from public.products p
  join public.allergies a on a.profile_id = p_patient
  where p.id = p_product and p.active_ingredient is not null
    and lower(a.substance) = lower(p.active_ingredient)
  limit 1;
$$;

-- Readable order number: GD-YYYYMMDD-#### (store date, daily sequence).
-- The advisory lock makes two simultaneous checkouts take turns here.
create or replace function public.next_order_number()
returns text language plpgsql security definer set search_path = ''
as $$
declare
  today date := (now() at time zone 'America/New_York')::date;
  prefix text := 'GD-' || to_char(today, 'YYYYMMDD') || '-';
  seq int;
begin
  perform pg_advisory_xact_lock(hashtext('goodson_order_number'));
  select coalesce(max(substring(order_number from 13)::int), 0) + 1 into seq
  from public.orders where order_number like prefix || '%';
  return prefix || lpad(seq::text, 4, '0');
end;
$$;

-- ---------- Cart: add or change a line ----------------------------------
create or replace function public.set_cart_quantity(p_product uuid, p_quantity int, p_prescription uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_product public.products%rowtype;
  v_stock int;
  v_max int;
  v_allergen text;
begin
  if v_user is null then raise exception 'SIGN_IN_REQUIRED'; end if;

  if p_quantity <= 0 then
    delete from public.cart_items where profile_id = v_user and product_id = p_product;
    return;
  end if;

  select * into v_product from public.products where id = p_product;
  if not found or not v_product.is_active then raise exception 'PRODUCT_UNAVAILABLE'; end if;

  select max_line_quantity into v_max from public.store_settings where id = 1;
  if p_quantity > v_max then raise exception 'QUANTITY_LIMIT:%', v_max; end if;

  select quantity into v_stock from public.inventory where product_id = p_product;
  if coalesce(v_stock, 0) = 0 then raise exception 'OUT_OF_STOCK:%', v_product.name; end if;
  if p_quantity > v_stock then raise exception 'NOT_ENOUGH_STOCK:%|%', v_product.name, v_stock; end if;

  v_allergen := public.allergy_conflict(v_user, p_product);
  if v_allergen is not null then raise exception 'ALLERGY_BLOCK:%', v_allergen; end if;

  if v_product.requires_rx then
    if p_prescription is null or not public.rx_first_fill_ok(p_prescription, v_user, p_product) then
      raise exception 'RX_REQUIRED:%', v_product.name;
    end if;
    if p_quantity <> 1 then raise exception 'RX_QUANTITY_ONE'; end if;
  elsif p_prescription is not null then
    raise exception 'PRODUCT_UNAVAILABLE';
  end if;

  insert into public.cart_items (profile_id, product_id, quantity, prescription_id)
  values (v_user, p_product, p_quantity, p_prescription)
  on conflict (profile_id, product_id)
  do update set quantity = excluded.quantity, prescription_id = excluded.prescription_id;
end;
$$;

-- ---------- Checkout: one atomic transaction ----------------------------
-- 1. Lock every product's stock row (in a fixed order, so two checkouts
--    can never deadlock) and re-check stock, allergies and prescriptions.
-- 2. Check the pickup slot (locked) or the delivery ZIP.
-- 3. Price the order from DATABASE prices, never from the browser.
-- 4. Insert order + lines, subtract stock, use the slot, mark first fills,
--    empty the cart, write the audit log.
-- If anything fails, the whole transaction rolls back: no half orders.
create or replace function public.place_order(
  p_fulfillment public.fulfillment_method,
  p_idempotency_key uuid,
  p_slot uuid default null,
  p_line1 text default null,
  p_city text default null,
  p_zip text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  s public.store_settings%rowtype;
  v_existing public.orders%rowtype;
  line record;
  v_order uuid := gen_random_uuid();
  v_number text;
  v_sub int := 0;
  v_taxable int := 0;
  v_tax int;
  v_fee int := 0;
  v_slot public.pickup_slots%rowtype;
  v_allergen text;
  v_lines int := 0;
begin
  if v_user is null then raise exception 'SIGN_IN_REQUIRED'; end if;

  -- Same request sent twice (double click, refresh): return the first order.
  select * into v_existing from public.orders where idempotency_key = p_idempotency_key;
  if found then
    if v_existing.customer_id <> v_user then raise exception 'DUPLICATE_REQUEST'; end if;
    return jsonb_build_object('order_id', v_existing.id, 'order_number', v_existing.order_number, 'duplicate', true);
  end if;

  select * into s from public.store_settings where id = 1;

  -- Lock stock rows for everything in the cart, in product-id order.
  perform 1 from public.inventory i
  where i.product_id in (select product_id from public.cart_items where profile_id = v_user)
  order by i.product_id
  for update;

  for line in
    select c.product_id, c.quantity, c.prescription_id, p.name, p.price_cents, p.requires_rx, p.is_active,
           coalesce(i.quantity, 0) as stock
    from public.cart_items c
    join public.products p on p.id = c.product_id
    left join public.inventory i on i.product_id = c.product_id
    where c.profile_id = v_user
    order by c.product_id
  loop
    v_lines := v_lines + 1;
    if not line.is_active then raise exception 'PRODUCT_UNAVAILABLE:%', line.name; end if;
    if line.stock = 0 then raise exception 'OUT_OF_STOCK:%', line.name; end if;
    if line.quantity > line.stock then raise exception 'NOT_ENOUGH_STOCK:%|%', line.name, line.stock; end if;
    v_allergen := public.allergy_conflict(v_user, line.product_id);
    if v_allergen is not null then raise exception 'ALLERGY_BLOCK:%', v_allergen; end if;
    if line.requires_rx and (line.prescription_id is null
        or not public.rx_first_fill_ok(line.prescription_id, v_user, line.product_id)) then
      raise exception 'RX_REQUIRED:%', line.name;
    end if;
    v_sub := v_sub + line.quantity * line.price_cents;
    if not line.requires_rx then v_taxable := v_taxable + line.quantity * line.price_cents; end if;
  end loop;

  if v_lines = 0 then raise exception 'CART_EMPTY'; end if;

  -- Fulfillment details.
  if p_fulfillment = 'pickup' then
    select * into v_slot from public.pickup_slots where id = p_slot for update;
    if not found or v_slot.starts_at < now() + interval '30 minutes' then raise exception 'SLOT_UNAVAILABLE'; end if;
    if v_slot.booked_count >= v_slot.capacity then raise exception 'SLOT_FULL'; end if;
    update public.pickup_slots set booked_count = booked_count + 1 where id = p_slot;
  else
    if coalesce(trim(p_line1), '') = '' then raise exception 'ADDRESS_REQUIRED'; end if;
    if p_zip is null or not (p_zip = any (s.delivery_zips)) then raise exception 'ZIP_OUT_OF_AREA'; end if;
    if v_sub < s.free_delivery_threshold_cents then v_fee := s.delivery_fee_cents; end if;
  end if;

  -- Georgia generally exempts prescription drugs from sales tax; OTC items
  -- are taxed at the configurable store rate (basis points, rounded half up).
  v_tax := round(v_taxable * s.tax_rate_bps / 10000.0);

  v_number := public.next_order_number();
  insert into public.orders (id, order_number, customer_id, fulfillment, pickup_slot_id,
    delivery_line1, delivery_city, delivery_zip, delivery_notes,
    subtotal_cents, tax_cents, delivery_fee_cents, total_cents, idempotency_key)
  values (v_order, v_number, v_user, p_fulfillment,
    case when p_fulfillment = 'pickup' then p_slot end,
    case when p_fulfillment = 'delivery' then trim(p_line1) end,
    case when p_fulfillment = 'delivery' then coalesce(nullif(trim(p_city), ''), 'Cumming') end,
    case when p_fulfillment = 'delivery' then p_zip end,
    case when p_fulfillment = 'delivery' then nullif(trim(p_notes), '') end,
    v_sub, v_tax, v_fee, v_sub + v_tax + v_fee, p_idempotency_key);

  insert into public.order_items (order_id, product_id, prescription_id, quantity, unit_price_cents, is_taxable)
  select v_order, c.product_id, c.prescription_id, c.quantity, p.price_cents, not p.requires_rx
  from public.cart_items c join public.products p on p.id = c.product_id
  where c.profile_id = v_user;

  update public.inventory i set quantity = i.quantity - c.quantity, updated_at = now()
  from public.cart_items c
  where c.profile_id = v_user and c.product_id = i.product_id;

  update public.prescriptions r set first_filled_at = now()
  from public.cart_items c
  where c.profile_id = v_user and c.prescription_id = r.id;

  delete from public.cart_items where profile_id = v_user;

  insert into public.messages (order_id, sender_id, kind, body)
  values (v_order, null, 'status_update', 'Order received. We will let you know when it is being prepared.');

  insert into public.audit_logs (actor_id, actor_role, action, target_type, target_id, details)
  values (v_user, public.current_user_role(), 'order.placed', 'order', v_order::text,
          jsonb_build_object('order_number', v_number, 'total_cents', v_sub + v_tax + v_fee, 'fulfillment', p_fulfillment));

  return jsonb_build_object('order_id', v_order, 'order_number', v_number, 'duplicate', false);
end;
$$;

-- ---------- Customer cancels an order ------------------------------------
-- Allowed only while the order is still 'received' (before preparing).
-- Stock and the pickup slot are given back.
create or replace function public.cancel_my_order(p_order uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order for update;
  if not found or o.customer_id <> v_user then raise exception 'ORDER_NOT_FOUND'; end if;
  if o.status <> 'received' then raise exception 'CANNOT_CANCEL'; end if;

  update public.orders set status = 'cancelled', cancel_reason = left(nullif(trim(p_reason), ''), 300) where id = p_order;
  update public.inventory i set quantity = i.quantity + oi.quantity, updated_at = now()
    from public.order_items oi where oi.order_id = p_order and oi.product_id = i.product_id;
  update public.prescriptions r set first_filled_at = null
    from public.order_items oi where oi.order_id = p_order and oi.prescription_id = r.id;
  if o.pickup_slot_id is not null then
    update public.pickup_slots set booked_count = greatest(booked_count - 1, 0) where id = o.pickup_slot_id;
  end if;

  insert into public.messages (order_id, sender_id, kind, body)
  values (p_order, v_user, 'status_update', 'Order cancelled by the customer.');
  insert into public.audit_logs (actor_id, actor_role, action, target_type, target_id, details)
  values (v_user, public.current_user_role(), 'order.cancelled', 'order', p_order::text,
          jsonb_build_object('by', 'customer'));
end;
$$;

-- ---------- Refill request ----------------------------------------------
-- Allowed only if the prescription is the caller's own, active, not
-- expired, has refills left, and has no refill already in progress.
create or replace function public.request_refill(
  p_prescription uuid,
  p_fulfillment public.fulfillment_method,
  p_slot uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  r public.prescriptions%rowtype;
  v_slot public.pickup_slots%rowtype;
  v_id uuid;
begin
  if v_user is null then raise exception 'SIGN_IN_REQUIRED'; end if;
  select * into r from public.prescriptions where id = p_prescription for update;
  if not found or r.patient_id <> v_user then raise exception 'RX_NOT_FOUND'; end if;
  if r.status <> 'active' then raise exception 'RX_INACTIVE'; end if;
  if r.expires_on < current_date then raise exception 'RX_EXPIRED'; end if;
  if r.refills_remaining <= 0 then raise exception 'RX_NO_REFILLS'; end if;
  if exists (select 1 from public.refill_requests
             where prescription_id = r.id and status in ('requested', 'verified', 'preparing', 'ready')) then
    raise exception 'REFILL_IN_PROGRESS';
  end if;

  if p_fulfillment = 'pickup' then
    select * into v_slot from public.pickup_slots where id = p_slot for update;
    if not found or v_slot.starts_at < now() + interval '30 minutes' then raise exception 'SLOT_UNAVAILABLE'; end if;
    if v_slot.booked_count >= v_slot.capacity then raise exception 'SLOT_FULL'; end if;
    update public.pickup_slots set booked_count = booked_count + 1 where id = p_slot;
  end if;

  insert into public.refill_requests (prescription_id, patient_id, fulfillment, pickup_slot_id)
  values (r.id, v_user, p_fulfillment, case when p_fulfillment = 'pickup' then p_slot end)
  returning id into v_id;

  insert into public.audit_logs (actor_id, actor_role, action, target_type, target_id, details)
  values (v_user, public.current_user_role(), 'refill.requested', 'refill', v_id::text,
          jsonb_build_object('rx_number', r.rx_number));
  return v_id;
end;
$$;

-- ---------- Privileges ----------------------------------------------------
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.set_cart_quantity(uuid, int, uuid)',
    'public.place_order(public.fulfillment_method, uuid, uuid, text, text, text, text)',
    'public.cancel_my_order(uuid, text)',
    'public.request_refill(uuid, public.fulfillment_method, uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated, service_role', fn);
  end loop;
  -- Internal helpers: not callable through the API at all.
  foreach fn in array array[
    'public.rx_first_fill_ok(uuid, uuid, uuid)',
    'public.allergy_conflict(uuid, uuid)',
    'public.next_order_number()'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end;
$$;

-- ---------- Demo reset, extended ----------------------------------------
-- The original reset (migration 3) is kept as reset_demo_data_base(); this
-- wrapper runs it and then applies the extra demo state each later phase
-- needs. Seeded long-term prescriptions count as already filled, so they
-- are renewed through Refills, not bought again in the shop.
alter function public.reset_demo_data() rename to reset_demo_data_base;
revoke execute on function public.reset_demo_data_base() from public, anon, authenticated;
grant execute on function public.reset_demo_data_base() to service_role;

create or replace function public.reset_demo_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  result := public.reset_demo_data_base(); -- includes the owner-only check
  delete from public.cart_items where true;
  update public.prescriptions set first_filled_at = created_at where first_filled_at is null;
  return result;
end;
$$;
revoke execute on function public.reset_demo_data() from public, anon;
grant execute on function public.reset_demo_data() to authenticated, service_role;
