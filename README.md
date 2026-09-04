# Common Ground

A nonpartisan civic education website: explanatory articles about political polarization, an
interactive U.S. congressional district map, directories of districts and political figures, a
vetted resource library, reader accounts with bookmarks, and a role-based admin dashboard.

Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (Postgres, Auth, Storage),
and MapLibre GL JS. No paid APIs. Deployable to Vercel's free tier.

---

## 1. First-run setup

Ten steps. Expect about twenty-five minutes, most of it waiting on Supabase.

### Step 1 — Install

```bash
npm install
```

Requires Node 18.17 or newer.

### Step 2 — Create a Supabase project

Sign up at [supabase.com](https://supabase.com) and create a project. The free tier is sufficient.
Note the database password you set — you will not be shown it again.

### Step 3 — Environment variables

```bash
cp .env.example .env.local
```

Fill in the values from **Project Settings → API** in the Supabase dashboard:

| Variable | Where to find it | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key | No — protected by RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key | **Yes.** Bypasses all security |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` for now | No |
| `RATE_LIMIT_SALT` | Any random string | Yes |

The service role key must never be prefixed with `NEXT_PUBLIC_` and must never be imported from a
Client Component. It is read only inside `src/app/api/**`.

### Step 4 — Run the migrations

In the Supabase dashboard, open **SQL Editor** and run these three files in order:

1. `supabase/migrations/20260101000000_core_schema.sql` — tables, enums, indexes, triggers
2. `supabase/migrations/20260101000100_rls.sql` — Row Level Security policies and role functions
3. `supabase/migrations/20260101000200_admin_and_search.sql` — search, admin enrollment, verification

Do not skip the second file. Without it every table is readable by anyone.

If you prefer the CLI: `npx supabase link --project-ref <ref>` then `npm run db:push`.

### Step 5 — Fetch real district data

```bash
npm run data:fetch
```

This regenerates `supabase/seed_districts.sql` with **all 435 voting congressional districts and
their sitting House members**, pulled live from
[@unitedstates/congress-legislators](https://github.com/unitedstates/congress-legislators) — a
public-domain dataset compiled from official House, Senate, GPO, and Bioguide records. Names,
parties, official `.house.gov` URLs, Washington office phone numbers, and room numbers are all real.
Vacant seats are seeded with a null member and a note rather than being omitted.

A checked-in copy is already present, generated 2026-08-14, so you can skip this and re-run it later.
**Re-run it after any special election.**

Two optional flags need free API keys:

```bash
CENSUS_API_KEY=...  npm run data:fetch -- --acs   # population, median income
HUD_API_TOKEN=...   npm run data:fetch -- --zip   # ZIP -> district crosswalk
```

- Census key: <https://api.census.gov/data/key_signup.html>
- HUD token: <https://www.huduser.gov/portal/dataset/uspszip-api.html>

Without `--acs`, demographic columns stay NULL and the district pages show only what is sourced.
Without `--zip`, ZIP search returns nothing while state and district search work normally. **The ZIP
crosswalk ships empty on purpose** — one ZIP often spans several districts, and a hand-typed guess
sends people to the wrong representative.

### Step 6 — Seed the rest

Run `supabase/seed_districts.sql` first, then `supabase/seed.sql`, then
`supabase/seed_articles.sql`.

The order matters: the ZIP crosswalk has a foreign key onto districts.

This loads five categories, ten tags, twenty real resources, and six full-length articles. It also loads placeholder team members and three sample political figures.
**Sample figures are flagged `is_sample = true` and display a visible SAMPLE DATA badge on the public
site.** Delete them before launch:

```sql
delete from political_figures where is_sample = true;
```

### Step 7 — Create the first administrator

Sign up through the site at `/signup` first, then promote that account:

```bash
node scripts/promote-super-admin.mjs you@example.com
```

There is no default admin account and no hardcoded password anywhere in this codebase. The first
`SUPER_ADMIN` can only be created by someone with the service role key — that is, someone with
database access.

Optional: to let colleagues self-enroll at `/admin/enroll`, generate a code hash and add it to
`.env.local`:

```bash
node scripts/hash-admin-code.mjs "some long random phrase"
```

Only the scrypt hash is stored. The comparison happens server-side using `timingSafeEqual`, attempts
are rate limited to five per fifteen minutes per account, every attempt is written to the audit log,
and the route cannot grant `SUPER_ADMIN` under any circumstances. Leaving `ADMIN_ACCESS_CODE_HASH`
unset disables the route entirely.

### Step 8 — Fetch district boundaries

```bash
npm run map:fetch
```

Downloads congressional district and state boundaries from the U.S. Census cartographic boundary
files, simplifies them with mapshaper to roughly 6% of original vertex count, annotates each feature
with its district code, and writes `public/data/districts.geojson` and `public/data/states.geojson`.

This takes a few minutes and needs about 300 MB of temporary disk. Until you run it, the map shows an
explanatory message rather than breaking.

### Step 9 — Run it

```bash
npm run dev
```

Open `http://localhost:3000`.

### Step 10 — Deploy

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full GitHub and Vercel walkthrough**,
including the auth redirect configuration and a post-deploy verification checklist.
The short version:

Push to GitHub, import the repository at [vercel.com](https://vercel.com), and add the same
environment variables in **Project Settings → Environment Variables**. Set `NEXT_PUBLIC_SITE_URL` to
your real domain. In Supabase, add that domain under **Authentication → URL Configuration → Redirect
URLs**, or password resets will fail.

---

## 2. Commands

| Command | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest suite |
| `npm run map:fetch` | Download and simplify Census boundaries |
| `npm run data:fetch` | Regenerate districts and House members from public records |
| `npm run figures:fetch` | Fetch non-major-party House candidates from the FEC (needs free key) |
| `npm run db:push` | Apply migrations via Supabase CLI |

---

## 3. How authorization works

Five roles, ascending: `USER` → `WRITER` → `EDITOR` → `ADMIN` → `SUPER_ADMIN`.

Permissions are enforced in three independent layers, and the important one is the last:

1. **Middleware** redirects unauthenticated visitors away from `/admin` and `/account`.
2. **Server components and route handlers** call `requireRole()` / `requireRoleApi()` before doing
   anything.
3. **Row Level Security** enforces the same rules inside Postgres.

Layers 1 and 2 are convenience. Layer 3 is the security boundary. A user who forges a session, calls
the REST API directly, or skips the UI entirely still cannot read or write anything their role does
not permit, because the policy is evaluated by the database.

Role changes go through the `set_user_role()` function, which only a `SUPER_ADMIN` can execute, which
refuses self-modification, and which writes to the audit log. A separate trigger blocks any direct
`UPDATE` to `profiles.role`, so privilege escalation is not possible even with a valid session.

**Nothing in the browser bundle decides permissions.** Hiding a button is presentation; the server
decides.

---

## 4. Design decisions worth knowing

**Geography is separate from political data.** District boundaries live in a GeoJSON file keyed by
district code. Officeholders, candidates, and statistics live in Postgres, also keyed by district
code. When districts are redrawn you re-run `npm run map:fetch` and the directory keeps working —
the two are joined at read time, never merged. At-large districts use the `AL` suffix (`AK-AL`).

**ZIP codes map to districts many-to-many.** A single ZIP frequently spans two or three districts.
The `zip_districts` table models this honestly and the search UI shows all matches rather than
picking one and being quietly wrong.

**The map uses no tile provider.** MapLibre renders a flat background plus your own GeoJSON. There is
no API key, no usage quota, and no third party learning which districts your readers look at.

**Everything on the map is reachable without the map.** Each district has its own crawlable page, and
a full searchable district list sits directly beneath the map, so the interface works with a keyboard,
a screen reader, or JavaScript disabled.

**Analytics store no user identifier.** `page_events` records a path and a date. Administrators can
see that an article is popular; they cannot see who read it. There is no field anywhere in the schema
for a user's political affiliation, and reading history is never used to infer one.

**Sample data is labeled, not hidden.** Any political figure with `is_sample = true` renders a SAMPLE
DATA badge publicly. This exists so a half-configured site cannot be mistaken for a real directory.

**Records expire.** Political figures carry `last_verified` and a `state` of active, inactive, or
needs verification. Anything past the verification window (default 180 days, configurable in Settings)
surfaces on the admin dashboard. Outdated records are deactivated rather than deleted, so the history
survives.

---

## 5. Project layout

```
src/
  app/
    (public pages)          home, articles, districts, resources, contact, corrections, …
    admin/                  dashboard — server-gated at layout, page, and database level
    api/                    route handlers; the only place the service role key is read
  components/
    home/ articles/ map/    feature components
    admin/                  shared admin table, editor, confirm dialog, toast
    ui/primitives.tsx       badges, empty states, skeletons, citations
  lib/
    supabase/               browser, server, and middleware clients
    auth/guards.ts          requireRole, requireRoleApi, atLeast
    validation/schemas.ts   zod schemas — every write is validated server-side
    sanitize.ts             DOMPurify allowlist for editor HTML
    queries.ts              shared read queries
  data/site-content.ts      all site copy in one file
supabase/
  migrations/               schema, RLS, admin functions
  seed.sql, seed_articles.sql
scripts/                    boundary fetch, admin code hashing, first admin promotion
tests/                      vitest
```

Site copy lives in `src/data/site-content.ts` rather than scattered through components, so wording can
be revised without touching JSX.

---

## 6. What is real, and what is not

Worth being precise about, since the whole project rests on it.

**Real, fetched from authoritative sources:**

- All 435 congressional districts, their state names, and district numbers
- Every sitting House member: name, party, official website, Washington phone, office room
- The four seats vacant as of generation, marked as such rather than silently dropped
- The twenty resources in the library — real organizations, real URLs
- District boundary geometry, from Census cartographic boundary files

**Real prose, but verify before publishing:** the six seeded articles. They attribute claims to
published research (Tajfel and Turner, Iyengar and Westwood, Ahler and Sood, More in Common) and
describe findings in general terms. No statistic in them was invented. Check each attribution
against the original paper before putting your name on it.

**Deliberately empty rather than guessed:**

- District demographics — needs a Census key
- ZIP crosswalk — needs a HUD token
- Turnout and urban/rural classification — no free bulk source; enter by hand with a citation

**Directory inclusion policy.** Who appears in the political figure directory is decided by
structural facts — filed with the FEC, qualified for the ballot, holds the office, is a recognized
party contact — and never by ideology. Nobody is listed for being moderate and nobody is excluded
for being far from the center. This is enforced in the schema: `inclusion_basis` only accepts
checkable values, and there is no field anywhere for rating, scoring, or characterizing a
candidate's views. Where a reader wants to know where someone stands, `stated_positions` holds the
candidate's own words with a source link. Run `npm run figures:fetch` (free FEC key) to populate
real non-major-party House candidates; every row arrives unverified and requires a human to confirm
ballot access before publishing.

**Placeholder, and clearly labeled as such:**

- Three political figures, named `[SAMPLE] Example Candidate A/B`, flagged `is_sample`, rendering a
  visible SAMPLE DATA badge on the public site
- Team members, authors, organization name, contact details
- Homepage statistics, stored as `[--]` in Settings

Nothing in this codebase is a plausible-looking number that came from nowhere. Where a value was not
available from a source, the field is NULL and the interface says so.

---

## 7. Content that needs your input

Search the codebase for `[` to find every placeholder. The main ones:

- `src/data/site-content.ts` — `[ORGANIZATION NAME]`, contact email, mailing address, social links,
  founding story, mission statement
- `/privacy` and `/terms` — plain-language placeholders that **must** be reviewed by counsel
- Team members — five `[TEAM MEMBER]` rows in `seed.sql`
- Authors — two `[AUTHOR NAME]` rows in `seed.sql`
- Homepage statistics — stored under the `statistics` key in **Admin → Settings**, currently
  placeholders. Every figure needs a real source and year before publishing.

The six seeded articles are real, written prose. Claims in them are attributed to published research
(Tajfel and Turner, Iyengar and Westwood, Ahler and Sood, More in Common) and describe findings in
general terms. **No statistic in this codebase was invented.** Verify each attribution against the
original paper before publishing under your own name.

---

## 8. Verified

- `npm run typecheck` — clean
- `npm run build` — succeeds, 40 routes
- `npm test` — 29 tests passing (sanitization, URL scheme rejection, slug generation, article and
  figure validation, role hierarchy, CSV parsing and round-tripping)

Note: `npm run build` fetches Newsreader, Public Sans, and IBM Plex Mono from Google Fonts at build
time. It therefore requires network access. Vercel has it. A fully offline build machine does not, and
would need those swapped for `next/font/local`.

---

## 9. What this does not include

Stated plainly so nothing here is a surprise later.

- **No email is actually sent.** Newsletter signups, contact messages, and correction reports are
  written to Postgres and appear in the admin dashboard. Nothing reaches an inbox. Wiring this up
  means adding a provider (Resend, Postmark, SendGrid) to the three route handlers in
  `src/app/api/`. Supabase Auth does send its own password-reset and confirmation emails.
- **Scheduled publishing is stored, not automated.** An article set to `scheduled` will not flip to
  `published` on its own. That needs a cron job — a Vercel Cron route or a Supabase scheduled
  function — running a query that promotes scheduled articles whose time has passed.
- **Image uploads use URLs, not a file picker.** The Supabase Storage bucket is configured but the
  editor and figure forms take image URLs rather than uploading files.
- **Rate limiting is per-instance and in-memory.** Adequate for a single Vercel deployment; a
  multi-region setup needs Redis or a database-backed counter. The admin enrollment lockout is
  already database-backed and does not have this limitation.
- **Full-text search is `ILIKE`-based**, not Postgres `tsvector`. Fine at current scale, worth
  upgrading past a few thousand articles.
- **District demographics are empty until you supply a Census key.** All 435 districts and their
  House members are real and populated. Population, median income, voting-age population, turnout,
  and urban/rural classification are NULL until you run `npm run data:fetch -- --acs`. Turnout and
  urban/rural have no automated source at all and must be entered by hand with a citation.
- **ZIP search returns nothing until you supply a HUD token.** See Step 5.
- **No test coverage of React components.** The suite covers validation, sanitization, authorization
  logic, and parsing — the parts where a bug is a security problem. Component and end-to-end tests
  would need Testing Library and Playwright.
- **Accessibility is built to WCAG 2.1 AA but has not been audited** by a screen reader user. Treat
  the `/accessibility` page as a statement of intent backed by implementation, not a certification.

---

## 10. Before you launch

- [ ] Delete sample political figures (`delete from political_figures where is_sample = true`)
- [ ] Replace every `[BRACKET]` placeholder
- [ ] Have privacy policy and terms reviewed by a lawyer
- [ ] Replace placeholder statistics with sourced figures, or remove the section
- [ ] Verify each research attribution in the seeded articles against the original paper
- [ ] Run `npm run map:fetch` on the deployment
- [ ] Re-run `npm run data:fetch` so member data is current as of launch day
- [ ] Decide whether to supply a Census key and HUD token, or remove the empty stat sections
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel and absent from any client bundle
- [ ] Add the production domain to Supabase redirect URLs
- [ ] Connect an email provider, or remove the forms that imply someone will reply
- [ ] Test signup, login, password reset, bookmarking, and admin publishing on the live domain
- [ ] Confirm a signed-out visitor gets redirected away from `/admin`

---

## 11. License and neutrality

Listing a resource, district, or political figure on this site is not an endorsement. The editorial
rules the project holds itself to are published at `/editorial-standards`, and the corrections form at
`/corrections` accepts reports anonymously.
