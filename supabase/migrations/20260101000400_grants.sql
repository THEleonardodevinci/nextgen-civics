-- ============================================================
-- Role grants
--
-- Supabase applies these to a new project automatically. They are repeated
-- here so the schema can be rebuilt from scratch — after a
-- `drop schema public cascade`, or on a self-hosted Postgres — without the
-- API silently losing access and returning 42501 "permission denied".
--
-- Granting broadly to `anon` looks alarming and is not. Postgres access here
-- has two independent layers:
--
--   GRANTS  decide whether a role may address a table at all.
--   RLS     decides which rows it may actually see or change.
--
-- 20260101000100_rls.sql enables Row Level Security on every table in this
-- schema. With RLS on, a grant alone gives access to nothing: each statement
-- is filtered by policy, and a table with no matching policy returns zero
-- rows and rejects every write. This is Supabase's standard model, not a
-- loosening of it.
--
-- The practical consequence: never create a table in this schema without
-- enabling RLS on it in the same migration. The grants below apply to future
-- tables automatically, so an un-RLS'd table would be fully public.
-- ============================================================

grant usage on schema public to postgres, anon, authenticated, service_role;

grant all on all tables    in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;
grant all on all routines  in schema public to postgres, anon, authenticated, service_role;

-- Apply the same to anything created later, so a new table is reachable
-- without re-running this file.
alter default privileges in schema public
  grant all on tables    to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on routines  to postgres, anon, authenticated, service_role;
