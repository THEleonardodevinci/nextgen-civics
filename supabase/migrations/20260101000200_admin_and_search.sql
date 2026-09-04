-- =====================================================================
-- 0003 ADMIN ENROLLMENT, RATE LIMITING, SEARCH
-- =====================================================================

-- Records every attempt to redeem the admin access code so the API route
-- can lock out brute force. Never readable from the browser.
create table admin_code_attempts (
  id         bigserial primary key,
  user_id    uuid references profiles(id) on delete cascade,
  ip_hash    text,                       -- salted hash, not a raw IP
  successful boolean not null default false,
  created_at timestamptz not null default now()
);
create index admin_attempts_recent_idx on admin_code_attempts(user_id, created_at desc);
alter table admin_code_attempts enable row level security;
-- No policies: only the service role (our API route) can touch this table.

-- Attempts in the last window, used by /api/admin/enroll for rate limiting.
create or replace function recent_admin_attempts(p_user uuid, p_minutes int default 15)
returns int language sql security definer set search_path = public as $$
  select count(*)::int from admin_code_attempts
  where user_id = p_user
    and successful = false
    and created_at > now() - make_interval(mins => p_minutes);
$$;

-- Promotes a user after the API route has verified the access code
-- server-side. Callable only with the service-role key.
create or replace function grant_role_via_access_code(target_user uuid, new_role user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_service_role() then
    raise exception 'This function is callable only by the server.';
  end if;
  if new_role = 'SUPER_ADMIN' then
    raise exception 'SUPER_ADMIN must be granted manually. See README > Admin bootstrapping.';
  end if;
  update profiles set role = new_role, updated_at = now() where id = target_user;
  insert into audit_logs (actor_id, action, object_type, object_id, details)
  values (target_user, 'user.enrolled_via_code', 'profile', target_user::text,
          jsonb_build_object('role', new_role));
end; $$;

-- =====================================================================
-- Site-wide search across articles, political figures, and resources.
-- One round trip, grouped in the UI by the `kind` column.
-- =====================================================================
create or replace function site_search(q text, per_group int default 5)
returns table (kind text, id text, title text, subtitle text, href text, meta text)
language sql stable set search_path = public as $$
  with needle as (select '%' || trim(q) || '%' as pat)
  (
    select 'article', a.id::text, a.title, coalesce(a.excerpt, a.subtitle, ''),
           '/articles/' || a.slug,
           to_char(a.published_at, 'Mon DD, YYYY')
    from articles a, needle n
    where a.status = 'published' and a.published_at <= now()
      and (a.title ilike n.pat or a.excerpt ilike n.pat or a.subtitle ilike n.pat)
    order by a.published_at desc limit per_group
  )
  union all
  (
    select 'figure', f.id::text, f.name,
           coalesce(f.office, '') ,
           '/districts/' || lower(coalesce(f.district_code, '')) || '/' || f.slug,
           coalesce(f.district_code, f.state_code) || ' · ' || coalesce(f.party, 'Independent')
    from political_figures f, needle n
    where f.state <> 'inactive'
      and (f.name ilike n.pat or f.party ilike n.pat or f.district_code ilike n.pat)
    order by f.name limit per_group
  )
  union all
  (
    select 'resource', r.id::text, r.name, r.description, r.url, coalesce(c.name, '')
    from resources r
    left join resource_categories c on c.id = r.category_id, needle n
    where r.active and (r.name ilike n.pat or r.description ilike n.pat)
    order by r.featured desc, r.name limit per_group
  );
$$;

grant execute on function site_search(text, int) to anon, authenticated;

-- Political figures whose verification is older than the configured window.
create or replace function figures_needing_verification(p_days int default 180)
returns setof political_figures language sql stable security definer set search_path = public as $$
  select * from political_figures
  where state <> 'inactive'
    and (last_verified is null or last_verified < current_date - p_days)
  order by last_verified nulls first;
$$;
