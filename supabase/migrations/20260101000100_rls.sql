-- =====================================================================
-- 0002 ROW LEVEL SECURITY
-- Authorization lives here, in the database. The frontend hides buttons
-- for UX only; these policies are what actually enforces permissions.
-- =====================================================================

-- Role helpers. SECURITY DEFINER so a policy on profiles can read profiles
-- without recursing into its own policy.
create or replace function auth_role()
returns user_role language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid()), 'USER'::user_role);
$$;

create or replace function role_rank(r user_role)
returns int language sql immutable as $$
  select case r
    when 'USER' then 0 when 'WRITER' then 1 when 'EDITOR' then 2
    when 'ADMIN' then 3 when 'SUPER_ADMIN' then 4 end;
$$;

-- True for trusted server-side calls made with the service-role key
-- (used only by our own API routes; the key never reaches the browser).
create or replace function is_service_role()
returns boolean language sql stable as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', '') = 'service_role';
$$;

-- True when the signed-in user is at or above the given role.
create or replace function has_role(min_role user_role)
returns boolean language sql stable security definer set search_path = public as $$
  select is_service_role()
      or (auth.uid() is not null and role_rank(auth_role()) >= role_rank(min_role));
$$;

alter table profiles              enable row level security;
alter table authors               enable row level security;
alter table categories            enable row level security;
alter table tags                  enable row level security;
alter table articles              enable row level security;
alter table article_tags          enable row level security;
alter table districts             enable row level security;
alter table zip_districts         enable row level security;
alter table political_figures     enable row level security;
alter table resource_categories   enable row level security;
alter table resources             enable row level security;
alter table team_members          enable row level security;
alter table bookmarks             enable row level security;
alter table saved_districts       enable row level security;
alter table newsletter_subscribers enable row level security;
alter table correction_reports    enable row level security;
alter table contact_submissions   enable row level security;
alter table audit_logs            enable row level security;
alter table site_settings         enable row level security;
alter table page_events           enable row level security;

-- ---------- profiles ----------
create policy "read own profile" on profiles for select using (id = auth.uid());
create policy "admins read profiles" on profiles for select using (has_role('ADMIN'));
create policy "update own profile" on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
-- Role changes are NOT allowed through this policy path; see set_user_role().
create policy "super admins manage profiles" on profiles for all
  using (has_role('SUPER_ADMIN')) with check (has_role('SUPER_ADMIN'));

-- A user cannot escalate their own role by updating their profile row.
create or replace function guard_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not has_role('SUPER_ADMIN') then
    raise exception 'Role changes require SUPER_ADMIN.';
  end if;
  return new;
end; $$;
create trigger profiles_guard_role before update on profiles
  for each row execute function guard_role_change();

-- ---------- public reference data: world-readable, staff-writable ----------
create policy "public read authors"     on authors     for select using (active);
create policy "editors write authors"   on authors     for all using (has_role('EDITOR')) with check (has_role('EDITOR'));

create policy "public read categories"  on categories  for select using (true);
create policy "editors write categories" on categories for all using (has_role('EDITOR')) with check (has_role('EDITOR'));

create policy "public read tags"        on tags        for select using (true);
create policy "editors write tags"      on tags        for all using (has_role('EDITOR')) with check (has_role('EDITOR'));

create policy "public read districts"   on districts   for select using (true);
create policy "admins write districts"  on districts   for all using (has_role('ADMIN')) with check (has_role('ADMIN'));

create policy "public read zips"        on zip_districts for select using (true);
create policy "admins write zips"       on zip_districts for all using (has_role('ADMIN')) with check (has_role('ADMIN'));

create policy "public read rescats"     on resource_categories for select using (true);
create policy "admins write rescats"    on resource_categories for all using (has_role('ADMIN')) with check (has_role('ADMIN'));

create policy "public read resources"   on resources   for select using (active or has_role('ADMIN'));
create policy "admins write resources"  on resources   for all using (has_role('ADMIN')) with check (has_role('ADMIN'));

create policy "public read team"        on team_members for select using (active or has_role('ADMIN'));
create policy "admins write team"       on team_members for all using (has_role('ADMIN')) with check (has_role('ADMIN'));

-- ---------- political figures ----------
-- Inactive records stay in the table (deactivate rather than delete) but are
-- hidden from the public site.
create policy "public read active figures" on political_figures for select
  using (state <> 'inactive' or has_role('ADMIN'));
create policy "admins write figures" on political_figures for all
  using (has_role('ADMIN')) with check (has_role('ADMIN'));

-- ---------- articles ----------
create policy "public read published" on articles for select
  using (status = 'published' and published_at <= now());
create policy "writers read own drafts" on articles for select
  using (has_role('WRITER') and created_by = auth.uid());
create policy "editors read all articles" on articles for select using (has_role('EDITOR'));

create policy "writers create articles" on articles for insert
  with check (has_role('WRITER') and created_by = auth.uid() and status in ('draft', 'scheduled'));
create policy "writers update own drafts" on articles for update
  using (has_role('WRITER') and created_by = auth.uid() and status = 'draft')
  with check (created_by = auth.uid() and status in ('draft', 'scheduled'));
create policy "editors manage articles" on articles for all
  using (has_role('EDITOR')) with check (has_role('EDITOR'));

create policy "public read article tags" on article_tags for select using (true);
create policy "writers tag own articles" on article_tags for all
  using (
    has_role('EDITOR') or exists (
      select 1 from articles a where a.id = article_id and a.created_by = auth.uid()
    )
  )
  with check (
    has_role('EDITOR') or exists (
      select 1 from articles a where a.id = article_id and a.created_by = auth.uid()
    )
  );

-- ---------- member-owned rows ----------
create policy "own bookmarks" on bookmarks for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own saved districts" on saved_districts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- submissions: anyone may write, only staff may read ----------
create policy "anyone submits corrections" on correction_reports for insert with check (true);
create policy "admins read corrections" on correction_reports for select using (has_role('EDITOR'));
create policy "admins update corrections" on correction_reports for update
  using (has_role('EDITOR')) with check (has_role('EDITOR'));

create policy "anyone submits contact" on contact_submissions for insert with check (true);
create policy "admins read contact" on contact_submissions for select using (has_role('ADMIN'));
create policy "admins update contact" on contact_submissions for update
  using (has_role('ADMIN')) with check (has_role('ADMIN'));

create policy "anyone subscribes" on newsletter_subscribers for insert with check (true);
create policy "admins read subscribers" on newsletter_subscribers for select using (has_role('ADMIN'));

-- ---------- audit / settings / analytics ----------
create policy "admins read audit" on audit_logs for select using (has_role('ADMIN'));
-- Audit rows are written by log_action() (SECURITY DEFINER) only; no INSERT policy.

create policy "public read settings" on site_settings for select using (true);
create policy "super admins write settings" on site_settings for all
  using (has_role('SUPER_ADMIN')) with check (has_role('SUPER_ADMIN'));

create policy "admins read events" on page_events for select using (has_role('ADMIN'));

-- ---------- audit helper ----------
create or replace function log_action(
  p_action text, p_object_type text, p_object_id text, p_details jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into audit_logs (actor_id, actor_email, action, object_type, object_id, details)
  values (auth.uid(), (select email from profiles where id = auth.uid()), p_action, p_object_type, p_object_id, p_details);
end; $$;

-- ---------- role assignment (SUPER_ADMIN only, audited) ----------
create or replace function set_user_role(target_user uuid, new_role user_role)
returns void language plpgsql security definer set search_path = public as $$
declare old_role user_role;
begin
  if not has_role('SUPER_ADMIN') then
    raise exception 'Only a SUPER_ADMIN can change roles.';
  end if;
  select role into old_role from profiles where id = target_user;
  update profiles set role = new_role, updated_at = now() where id = target_user;
  perform log_action('user.role_changed', 'profile', target_user::text,
    jsonb_build_object('from', old_role, 'to', new_role));
end; $$;

-- ---------- article view counter (no user identifier recorded) ----------
create or replace function increment_article_view(p_slug text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update articles set view_count = view_count + 1 where slug = p_slug and status = 'published';
  perform record_event('article_view', p_slug);
end; $$;

grant execute on function increment_article_view(text) to anon, authenticated;
grant execute on function record_event(text, text) to anon, authenticated;
grant execute on function set_user_role(uuid, user_role) to authenticated;
grant execute on function has_role(user_role) to authenticated;
