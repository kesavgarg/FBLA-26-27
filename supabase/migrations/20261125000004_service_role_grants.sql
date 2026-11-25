-- The server-side seed script uses the service role. Revoking EXECUTE from
-- PUBLIC in earlier migrations also removed the service role's access on the
-- hosted project, so grant it back explicitly for the admin-only functions.
grant execute on function public.reset_demo_data() to service_role;
grant execute on function public.ensure_pickup_slots(int) to service_role;
grant execute on function public.set_user_role(uuid, public.user_role) to service_role;
grant execute on function public.log_audit(text, text, text, jsonb) to service_role;
