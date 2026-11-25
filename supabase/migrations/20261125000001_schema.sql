-- =====================================================================
-- Goodson Drug Co. ordering platform — core schema
-- ---------------------------------------------------------------------
-- All data in this database is FICTIONAL (student demo).
-- Money is stored as integer cents to avoid floating-point rounding.
-- Status columns use Postgres enums so invalid states cannot be saved.
-- Row Level Security policies are in the next migration.
-- =====================================================================

-- ---------- Enumerated types -----------------------------------------
create type public.user_role as enum ('customer', 'staff', 'doctor', 'owner');

create type public.product_category as enum (
  'pain_relief', 'cold_flu', 'vitamins', 'first_aid',
  'personal_care', 'health_essentials', 'gifts', 'prescription'
);

create type public.prescription_status as enum ('pending_approval', 'active', 'inactive', 'denied');

create type public.consult_status as enum ('submitted', 'under_review', 'needs_info', 'approved', 'denied');

create type public.fulfillment_method as enum ('pickup', 'delivery');

create type public.order_status as enum (
  'received', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'completed', 'cancelled'
);

create type public.refill_status as enum ('requested', 'verified', 'preparing', 'ready', 'completed', 'rejected', 'cancelled');

create type public.message_kind as enum ('message', 'status_update', 'pickup_ready');

create type public.triage_outcome as enum ('EMERGENCY', 'CONSULT', 'SELF_CARE');

-- ---------- People ----------------------------------------------------

-- One row per signed-up user. `id` matches auth.users.id (Supabase Auth).
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null unique,
  full_name     text not null check (char_length(full_name) between 2 and 80),
  phone         text check (phone is null or phone ~ '^\d{3}-\d{3}-\d{4}$'),
  date_of_birth date check (date_of_birth is null or date_of_birth <= current_date),
  role          public.user_role not null default 'customer',
  -- Doctors show their (fictional) practice name; staff show their title.
  title         text check (title is null or char_length(title) <= 80),
  is_demo       boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.profiles is 'App user profile. Role can only be changed by an owner (enforced by trigger).';

-- People a caregiver manages from one login (a parent, a child).
create table public.family_members (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  full_name     text not null check (char_length(full_name) between 2 and 80),
  birth_year    int not null check (birth_year between 1900 and extract(year from now())::int),
  relationship  text not null check (relationship in ('child', 'parent', 'spouse', 'sibling', 'grandparent', 'other')),
  created_at    timestamptz not null default now()
);
create index family_members_owner_idx on public.family_members (owner_id);

-- Allergies belong to either the account holder or one family member.
create table public.allergies (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid references public.profiles (id) on delete cascade,
  family_member_id  uuid references public.family_members (id) on delete cascade,
  substance         text not null check (char_length(substance) between 2 and 60),
  reaction          text check (reaction is null or char_length(reaction) <= 120),
  severity          text not null default 'moderate' check (severity in ('mild', 'moderate', 'severe')),
  created_at        timestamptz not null default now(),
  constraint allergies_one_owner check (num_nonnulls(profile_id, family_member_id) = 1)
);
create index allergies_profile_idx on public.allergies (profile_id);
create index allergies_family_idx on public.allergies (family_member_id);

-- Medications the patient already takes (used by safety checks + doctor view).
create table public.current_medications (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  name         text not null check (char_length(name) between 2 and 80),
  ingredient   text check (ingredient is null or char_length(ingredient) <= 60),
  created_at   timestamptz not null default now()
);
create index current_medications_profile_idx on public.current_medications (profile_id);

-- ---------- Catalog and stock -----------------------------------------

create table public.products (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  name               text not null check (char_length(name) between 2 and 80),
  name_es            text not null check (char_length(name_es) between 2 and 80),
  description        text not null check (char_length(description) <= 600),
  description_es     text not null check (char_length(description_es) <= 600),
  category           public.product_category not null,
  price_cents        int not null check (price_cents between 0 and 100000),
  requires_rx        boolean not null default false,
  -- Main ingredient used by the allergy and interaction checks (fictional table).
  active_ingredient  text,
  image_path         text,
  image_alt          text,
  is_active          boolean not null default true,
  is_featured        boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- Prescription items always live in the prescription category.
  constraint products_rx_category check (requires_rx = (category = 'prescription'))
);
create index products_category_idx on public.products (category) where is_active;

-- Stock is kept apart from the catalog so stock changes can be locked and
-- audited without touching product details.
create table public.inventory (
  product_id           uuid primary key references public.products (id) on delete cascade,
  quantity             int not null check (quantity >= 0),
  low_stock_threshold  int not null default 5 check (low_stock_threshold >= 0),
  updated_by           uuid references public.profiles (id) on delete set null,
  updated_at           timestamptz not null default now()
);

-- ---------- Store configuration ---------------------------------------

-- Single-row table (id is always 1) holding business rules as settings.
create table public.store_settings (
  id                            int primary key default 1 check (id = 1),
  tax_rate_bps                  int not null default 700 check (tax_rate_bps between 0 and 2000), -- 700 = 7.00%
  delivery_fee_cents            int not null default 599 check (delivery_fee_cents >= 0),
  free_delivery_threshold_cents int not null default 3500 check (free_delivery_threshold_cents >= 0),
  slot_minutes                  int not null default 30 check (slot_minutes in (15, 30, 60)),
  slot_capacity                 int not null default 4 check (slot_capacity between 1 and 50),
  -- Opening hours per weekday (0 = Sunday). null = closed.
  hours                         jsonb not null,
  pharmacist_name               text not null default 'Dana Whitfield, PharmD (fictional)',
  updated_at                    timestamptz not null default now()
);

create table public.pickup_slots (
  id           uuid primary key default gen_random_uuid(),
  starts_at    timestamptz not null unique,
  capacity     int not null check (capacity >= 0),
  booked_count int not null default 0,
  constraint pickup_slots_not_overbooked check (booked_count between 0 and capacity)
);

-- ---------- Health workflow -------------------------------------------

create table public.symptom_logs (
  id                     uuid primary key default gen_random_uuid(),
  patient_id             uuid not null references public.profiles (id) on delete cascade,
  family_member_id       uuid references public.family_members (id) on delete cascade,
  symptoms               text[] not null check (cardinality(symptoms) between 1 and 12),
  red_flags              text[] not null default '{}',
  severity               int not null check (severity between 1 and 10),
  started_on             date not null check (started_on <= current_date),
  notes                  text check (notes is null or char_length(notes) <= 1000),
  temperature_f          numeric(4, 1) check (temperature_f is null or temperature_f between 90 and 110),
  triage_result          public.triage_outcome,
  -- Apple Watch demo import. Only SIMULATED sample data is ever stored here.
  wearable_snapshot      jsonb,
  is_simulated_wearable  boolean not null default false,
  logged_at              timestamptz not null default now(),
  constraint symptom_logs_wearable_is_simulated check (wearable_snapshot is null or is_simulated_wearable)
);
create index symptom_logs_patient_idx on public.symptom_logs (patient_id, logged_at desc);

create table public.consult_requests (
  id                      uuid primary key default gen_random_uuid(),
  patient_id              uuid not null references public.profiles (id) on delete cascade,
  symptom_log_id          uuid references public.symptom_logs (id) on delete set null,
  requested_product_id    uuid references public.products (id) on delete set null,
  summary                 text not null check (char_length(summary) between 10 and 1000),
  -- Snapshot of allergies/medications at the time of the request, so the
  -- doctor reviews exactly what the patient submitted.
  allergies_snapshot      text[] not null default '{}',
  medications_snapshot    text[] not null default '{}',
  status                  public.consult_status not null default 'submitted',
  doctor_id               uuid references public.profiles (id) on delete set null,
  doctor_note             text check (doctor_note is null or char_length(doctor_note) <= 1000),
  info_request            text check (info_request is null or char_length(info_request) <= 500),
  patient_reply           text check (patient_reply is null or char_length(patient_reply) <= 1000),
  created_at              timestamptz not null default now(),
  decided_at              timestamptz,
  updated_at              timestamptz not null default now()
);
create index consult_requests_status_idx on public.consult_requests (status, created_at);
create index consult_requests_patient_idx on public.consult_requests (patient_id);

create table public.prescriptions (
  id                 uuid primary key default gen_random_uuid(),
  rx_number          text not null unique check (rx_number ~ '^RX-\d{6}$'),
  patient_id         uuid not null references public.profiles (id) on delete cascade,
  product_id         uuid not null references public.products (id),
  prescriber_id      uuid references public.profiles (id) on delete set null,
  consult_id         uuid references public.consult_requests (id) on delete set null,
  -- Directions come ONLY from the prescriber's record; the app never doses.
  directions         text not null check (char_length(directions) between 5 and 300),
  refills_remaining  int not null default 0 check (refills_remaining between 0 and 12),
  status             public.prescription_status not null default 'pending_approval',
  written_on         date not null default current_date,
  expires_on         date not null,
  created_at         timestamptz not null default now(),
  constraint prescriptions_expiry_after_written check (expires_on > written_on)
);
create index prescriptions_patient_idx on public.prescriptions (patient_id, status);

-- ---------- Orders ----------------------------------------------------

create table public.orders (
  id                 uuid primary key default gen_random_uuid(),
  order_number       text not null unique check (order_number ~ '^GD-\d{8}-\d{4}$'),
  customer_id        uuid not null references public.profiles (id) on delete cascade,
  family_member_id   uuid references public.family_members (id) on delete set null,
  fulfillment        public.fulfillment_method not null,
  pickup_slot_id     uuid references public.pickup_slots (id),
  delivery_line1     text check (delivery_line1 is null or char_length(delivery_line1) <= 120),
  delivery_city      text check (delivery_city is null or char_length(delivery_city) <= 60),
  delivery_zip       text check (delivery_zip is null or delivery_zip ~ '^\d{5}$'),
  delivery_notes     text check (delivery_notes is null or char_length(delivery_notes) <= 300),
  status             public.order_status not null default 'received',
  subtotal_cents     int not null check (subtotal_cents >= 0),
  tax_cents          int not null check (tax_cents >= 0),
  delivery_fee_cents int not null default 0 check (delivery_fee_cents >= 0),
  total_cents        int not null check (total_cents = subtotal_cents + tax_cents + delivery_fee_cents),
  -- Same key sent twice (double-click, refresh) cannot create two orders.
  idempotency_key    uuid not null unique,
  cancel_reason      text check (cancel_reason is null or char_length(cancel_reason) <= 300),
  is_simulated_payment boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint orders_fulfillment_details check (
    (fulfillment = 'pickup' and pickup_slot_id is not null)
    or (fulfillment = 'delivery' and delivery_line1 is not null and delivery_zip is not null)
  )
);
create index orders_customer_idx on public.orders (customer_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at);
create index orders_created_idx on public.orders (created_at);

create table public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders (id) on delete cascade,
  product_id       uuid not null references public.products (id),
  prescription_id  uuid references public.prescriptions (id),
  quantity         int not null check (quantity between 1 and 20),
  unit_price_cents int not null check (unit_price_cents >= 0),
  is_taxable       boolean not null,
  unique (order_id, product_id)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.refill_requests (
  id               uuid primary key default gen_random_uuid(),
  prescription_id  uuid not null references public.prescriptions (id) on delete cascade,
  patient_id       uuid not null references public.profiles (id) on delete cascade,
  fulfillment      public.fulfillment_method not null,
  pickup_slot_id   uuid references public.pickup_slots (id),
  status           public.refill_status not null default 'requested',
  order_id         uuid references public.orders (id) on delete set null,
  staff_note       text check (staff_note is null or char_length(staff_note) <= 300),
  requested_at     timestamptz not null default now(),
  completed_at     timestamptz,
  updated_at       timestamptz not null default now()
);
create index refill_requests_status_idx on public.refill_requests (status, requested_at);
create index refill_requests_patient_idx on public.refill_requests (patient_id);

-- ---------- Communication and accountability --------------------------

create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid references public.orders (id) on delete cascade,
  refill_id    uuid references public.refill_requests (id) on delete cascade,
  consult_id   uuid references public.consult_requests (id) on delete cascade,
  sender_id    uuid references public.profiles (id) on delete set null,
  kind         public.message_kind not null default 'message',
  body         text not null check (char_length(body) between 1 and 1000),
  read_at      timestamptz,
  created_at   timestamptz not null default now(),
  constraint messages_one_thread check (num_nonnulls(order_id, refill_id, consult_id) = 1)
);
create index messages_order_idx on public.messages (order_id, created_at);
create index messages_refill_idx on public.messages (refill_id, created_at);
create index messages_consult_idx on public.messages (consult_id, created_at);

-- Insert-only record of who did what, when. No update or delete policy exists.
create table public.audit_logs (
  id           bigint generated always as identity primary key,
  actor_id     uuid references public.profiles (id) on delete set null,
  actor_role   public.user_role,
  action       text not null check (char_length(action) between 3 and 60),
  target_type  text not null check (char_length(target_type) between 2 and 40),
  target_id    text,
  details      jsonb not null default '{}',
  created_at   timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_target_idx on public.audit_logs (target_type, target_id);

create table public.user_preferences (
  profile_id          uuid primary key references public.profiles (id) on delete cascade,
  locale              text not null default 'en' check (locale in ('en', 'es')),
  large_text          boolean not null default false,
  high_contrast       boolean not null default false,
  reduce_motion       boolean not null default false,
  budget_limit_cents  int check (budget_limit_cents is null or budget_limit_cents between 100 and 100000),
  updated_at          timestamptz not null default now()
);

-- Usability testing log. Starts EMPTY — results are only recorded from real
-- sessions with participants who gave permission.
create table public.usability_sessions (
  id                uuid primary key default gen_random_uuid(),
  participant_code  text not null check (participant_code ~ '^P\d{2,3}$'),
  consent_given     boolean not null check (consent_given),
  task              text not null check (task in ('find_product', 'request_refill', 'complete_checkout', 'find_order_status', 'other')),
  method            text not null check (method in ('previous_process', 'digital')),
  seconds_taken     int check (seconds_taken is null or seconds_taken between 0 and 3600),
  click_count       int check (click_count is null or click_count between 0 and 500),
  completed         boolean not null,
  feedback          text check (feedback is null or char_length(feedback) <= 1000),
  recorded_by       uuid references public.profiles (id) on delete set null,
  recorded_at       timestamptz not null default now()
);

-- ---------- Housekeeping triggers --------------------------------------

-- Keep updated_at current on every UPDATE.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();
create trigger consults_touch before update on public.consult_requests for each row execute function public.touch_updated_at();
create trigger refills_touch before update on public.refill_requests for each row execute function public.touch_updated_at();
create trigger prefs_touch before update on public.user_preferences for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.store_settings for each row execute function public.touch_updated_at();
