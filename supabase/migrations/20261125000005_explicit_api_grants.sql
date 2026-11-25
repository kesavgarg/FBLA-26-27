-- =====================================================================
-- Explicit Data API privileges.
-- ---------------------------------------------------------------------
-- Hosted Supabase no longer exposes new tables to the API roles
-- automatically, so every permission is granted here, on purpose.
-- GRANT decides which tables a role may touch at all; Row Level Security
-- (migration 2) then decides which ROWS. Both must allow an action.
-- =====================================================================

-- Signed-out visitors: only the public catalog and store information.
grant select on public.products, public.inventory, public.store_settings, public.pickup_slots to anon;

-- Signed-in users: table access, narrowed row-by-row by RLS policies.
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Re-apply the narrower rules from migration 2 that the line above widened.
revoke update on public.profiles from authenticated;
grant update (full_name, phone, date_of_birth) on public.profiles to authenticated;
revoke insert, update, delete on public.audit_logs from authenticated;

-- Server-only code (seed script, account creation) bypasses RLS by design.
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
