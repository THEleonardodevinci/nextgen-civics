-- ============================================================
-- Allow the first administrator to be created
--
-- guard_role_change() blocks any change to profiles.role unless the caller
-- already has SUPER_ADMIN. That is correct for every client — it is what stops
-- a compromised session from escalating itself — but it also blocks the
-- bootstrap: with no SUPER_ADMIN in the table yet, nobody can create one.
--
-- The carve-out below permits a role change only when the statement arrives
-- with NO request context at all. Every PostgREST request sets
-- request.jwt.claims, including anon, authenticated, and service_role calls.
-- Only a direct database connection — psql, or scripts/promote-super-admin.mjs
-- using DATABASE_URL — has it unset.
--
-- This grants nothing new. Anyone holding the database connection string can
-- already alter the table, drop the trigger, or rewrite this function. The
-- carve-out just lets the intended path work without disabling safety
-- machinery, and keeps the check meaningful for everything reachable over the
-- API.
-- ============================================================

create or replace function guard_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  claims text := current_setting('request.jwt.claims', true);
begin
  if new.role is distinct from old.role then
    -- Direct database connection: no API request context exists.
    if claims is null or claims = '' then
      return new;
    end if;

    if not has_role('SUPER_ADMIN') then
      raise exception 'Role changes require SUPER_ADMIN.';
    end if;
  end if;

  return new;
end; $$;
