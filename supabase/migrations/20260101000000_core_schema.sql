-- =====================================================================
-- 0001 CORE SCHEMA
-- Districts are keyed by a stable district_code (e.g. 'IL-05', 'AK-AL').
-- Geography (GeoJSON) lives in /public/data, NOT in the database, so a
-- redistricting cycle only requires swapping the boundary file and
-- inserting new district rows -- political_figures keeps working.
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------- enums ----------
create type user_role as enum ('USER', 'WRITER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN');
create type article_status as enum ('draft', 'scheduled', 'published', 'archived');
create type affiliation_type as enum ('third_party', 'independent', 'other');
create type candidate_status as enum (
  'current_officeholder', 'declared_candidate', 'independent_candidate',
  'third_party_candidate', 'local_party_contact'
);
create type record_state as enum ('active', 'inactive', 'needs_verification');
create type submission_state as enum ('new', 'reviewing', 'resolved', 'dismissed');

-- ---------- profiles (1:1 with auth.users) ----------
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text,
  avatar_url   text,
  bio          text,
  role         user_role not null default 'USER',
  is_suspended boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index profiles_role_idx on profiles(role);

-- Mirror new auth users into profiles.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

-- Generic updated_at trigger.
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ---------- authors (public bylines; may or may not map to a login) ----------
create table authors (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid unique references profiles(id) on delete set null,
  name         text not null,
  slug         text not null unique,
  role_title   text,
  bio          text,
  avatar_url   text,
  social_links jsonb not null default '{}'::jsonb,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger authors_touch before update on authors for each row execute function touch_updated_at();

-- ---------- taxonomy ----------
create table categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  description text,
  sort_order  int not null default 0
);

create table tags (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

-- ---------- articles ----------
create table articles (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text not null unique,
  subtitle        text,
  excerpt         text,
  content         text not null default '',      -- sanitized HTML
  featured_image  text,
  image_alt       text,
  author_id       uuid references authors(id) on delete set null,
  category_id     uuid references categories(id) on delete set null,
  status          article_status not null default 'draft',
  is_opinion      boolean not null default false, -- rendered with a visible "Opinion" label
  featured        boolean not null default false,
  reading_time    int not null default 1,
  view_count      int not null default 0,
  sources         jsonb not null default '[]'::jsonb, -- [{label, url}]
  seo_title       text,
  seo_description text,
  published_at    timestamptz,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint published_needs_date check (status <> 'published' or published_at is not null)
);
create index articles_status_published_idx on articles(status, published_at desc);
create index articles_category_idx on articles(category_id);
create index articles_author_idx on articles(author_id);
create index articles_search_idx on articles using gin (
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(subtitle,'') || ' ' || coalesce(excerpt,''))
);
create trigger articles_touch before update on articles for each row execute function touch_updated_at();

create table article_tags (
  article_id uuid references articles(id) on delete cascade,
  tag_id     uuid references tags(id) on delete cascade,
  primary key (article_id, tag_id)
);
create index article_tags_tag_idx on article_tags(tag_id);

-- ---------- districts (statistics only; boundaries live in GeoJSON) ----------
create table districts (
  district_code       text primary key,          -- 'IL-05', 'AK-AL'
  state_code          char(2) not null,
  state_name          text not null,
  district_number     text not null,             -- '05' or 'AL' for at-large
  population          int,
  voting_age_population int,
  median_household_income int,
  urban_rural         text,                      -- 'urban' | 'suburban' | 'rural' | 'mixed'
  house_member        text,                      -- null when the seat is vacant
  house_member_party  text,
  house_member_url    text,                      -- official .house.gov site
  house_member_phone  text,                      -- Washington office
  house_member_office text,                      -- e.g. '1523 Longworth House Office Building'
  recent_turnout_pct  numeric(5,2),
  notes               text,
  data_sources        jsonb not null default '[]'::jsonb, -- [{label, url}]
  last_updated        date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index districts_state_idx on districts(state_code);
create trigger districts_touch before update on districts for each row execute function touch_updated_at();

-- ZIP -> district crosswalk. A ZIP may span several districts, so this is
-- deliberately many-to-many rather than a single lookup column.
create table zip_districts (
  zip           char(5) not null,
  district_code text not null references districts(district_code) on delete cascade,
  primary key (zip, district_code)
);
create index zip_districts_zip_idx on zip_districts(zip);

-- ---------- political figures ----------
create table political_figures (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null,
  state_code       char(2) not null,
  district_code    text references districts(district_code) on delete set null,
  party            text,
  affiliation_type affiliation_type not null default 'independent',
  office           text,
  candidate_status candidate_status not null default 'declared_candidate',
  bio              text,
  image_url        text,
  website_url      text,
  campaign_url     text,
  email            text,
  phone            text,
  mailing_address  text,
  social_links     jsonb not null default '{}'::jsonb,
  source_urls      jsonb not null default '[]'::jsonb,
  is_sample        boolean not null default false,  -- renders a SAMPLE DATA badge
  state            record_state not null default 'needs_verification',
  last_verified    date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (district_code, slug)
);
create index pf_district_idx on political_figures(district_code);
create index pf_state_idx on political_figures(state_code);
create index pf_verify_idx on political_figures(last_verified nulls first);
create index pf_name_trgm_idx on political_figures using gin (name gin_trgm_ops);
create trigger pf_touch before update on political_figures for each row execute function touch_updated_at();

-- ---------- resources ----------
create table resource_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  description text,
  sort_order  int not null default 0
);

create table resources (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text not null,
  url         text not null,
  logo_url    text,
  category_id uuid references resource_categories(id) on delete set null,
  tags        text[] not null default '{}',
  featured    boolean not null default false,
  sort_order  int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index resources_category_idx on resources(category_id);
create trigger resources_touch before update on resources for each row execute function touch_updated_at();

-- ---------- team (About Us carousel) ----------
create table team_members (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  role_title    text not null,
  bio           text not null,
  photo_url     text,
  email         text,
  website_url   text,
  linkedin_url  text,
  social_links  jsonb not null default '{}'::jsonb,
  display_order int not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger team_touch before update on team_members for each row execute function touch_updated_at();

-- ---------- member features ----------
create table bookmarks (
  user_id     uuid not null references profiles(id) on delete cascade,
  target_type text not null check (target_type in ('article', 'resource')),
  target_id   uuid not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

create table saved_districts (
  user_id       uuid not null references profiles(id) on delete cascade,
  district_code text not null references districts(district_code) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, district_code)
);

create table newsletter_subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  first_name      text,
  confirmed       boolean not null default false,
  unsubscribe_token uuid not null default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  unsubscribed_at timestamptz
);

-- ---------- inbound submissions ----------
create table correction_reports (
  id                 uuid primary key default gen_random_uuid(),
  submitter_name     text,
  submitter_email    text,
  page_url           text not null,
  issue              text not null,
  suggested_correction text,
  source_url         text,
  status             submission_state not null default 'new',
  admin_notes        text,
  created_at         timestamptz not null default now()
);

create table contact_submissions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  category   text not null,
  subject    text,
  message    text not null,
  status     submission_state not null default 'new',
  created_at timestamptz not null default now()
);

-- ---------- audit + settings ----------
create table audit_logs (
  id          bigserial primary key,
  actor_id    uuid references profiles(id) on delete set null,
  actor_email text,
  action      text not null,          -- 'article.published', 'figure.verified', ...
  object_type text,
  object_id   text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_created_idx on audit_logs(created_at desc);

create table site_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references profiles(id) on delete set null
);

-- Aggregate-only analytics. Deliberately stores no user identifier, so no
-- reading history can be tied back to a person.
create table page_events (
  id          bigserial primary key,
  event_type  text not null,          -- 'article_view' | 'district_select' | 'search' | 'resource_click'
  object_key  text,
  day         date not null default current_date,
  count       int not null default 1,
  unique (event_type, object_key, day)
);

create or replace function record_event(p_type text, p_key text)
returns void language sql security definer set search_path = public as $$
  insert into page_events (event_type, object_key, day, count)
  values (p_type, p_key, current_date, 1)
  on conflict (event_type, object_key, day) do update set count = page_events.count + 1;
$$;
