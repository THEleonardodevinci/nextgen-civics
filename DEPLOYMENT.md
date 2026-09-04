# Deploying to GitHub and Vercel

Start to finish, from the unzipped folder to a live site. Budget about an hour the
first time; most of it is waiting.

You will need free accounts on [GitHub](https://github.com),
[Supabase](https://supabase.com), and [Vercel](https://vercel.com). Sign up for all
three before starting so you are not interrupted.

Order matters here. The database has to exist before Vercel can build against it.

---

## Part 1 — Get it running locally first

Do not skip this. Debugging a broken deploy is much harder than debugging a broken
laptop, and every problem you fix here is one you will not hit in production.

### 1.1 Install

```bash
cd common-ground
npm install
```

Needs Node 18.17 or newer. Check with `node --version`. If you are older than that,
install the current LTS from [nodejs.org](https://nodejs.org).

### 1.2 Create the Supabase project

In the Supabase dashboard, **New project**.

- **Name:** anything
- **Database password:** generate one and **save it in your password manager now**.
  You are not shown it again, and you need it in Part 3.
- **Region:** pick the one closest to your users. This is the single biggest factor
  in how fast the site feels, and changing it later means recreating the project.

Provisioning takes two or three minutes.

### 1.3 Environment variables

```bash
cp .env.example .env.local
```

In Supabase, go to **Project Settings → API Keys**.

Supabase issues two kinds of keys now. **Use the new ones.** The legacy `anon` and
`service_role` keys are deprecated and scheduled for removal at the end of 2026, so a
project built on them today starts out on borrowed time.

| `.env.local` key | New key (preferred) | Legacy equivalent |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL, under **Settings → API** | same |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key, `sb_publishable_…` | `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key, `sb_secret_…` | `service_role` |

The variable names keep their old spelling on purpose, so no code has to change. The
two key types are drop-in substitutes — paste whichever kind your project shows you.

If the **API Keys** page shows no publishable key yet, click **Create new API keys**.
Legacy keys, if you ever need them, are under the **Legacy API Keys** tab.

Also set:

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
RATE_LIMIT_SALT=any-long-random-string
```

> **The `service_role` key bypasses every security rule in the database.** It belongs
> in `.env.local` and in Vercel's environment settings, nowhere else. Never paste it
> into a component, never prefix it with `NEXT_PUBLIC_`, never commit it. `.env.local`
> is already in `.gitignore` — leave it there.

### 1.4 Load the database

You have two routes. **Use the command line one** — it is faster and avoids a
failure mode that has bitten people here.

#### Recommended: from the terminal

Add one more line to `.env.local`. In the Supabase dashboard click **Connect** at
the top (or **Settings → Database → Connection string → URI**) and copy the URI:

```
DATABASE_URL=postgresql://postgres:yourpassword@db.your-ref.supabase.co:5432/postgres
```

Replace `[YOUR-PASSWORD]` with the database password you saved in 1.2. If that
password contains `@ : / ? #` or `%`, percent-encode it (`@` → `%40`, and so on) or
the URL will not parse.

Then:

```bash
npm run db:setup
```

That applies all four migrations and all three seed files, in the correct order, and
stops at the first error with the offending line number.

If it times out with a network error, go back to the Supabase **Connect** dialog and
use the **Session pooler** string instead of the direct one. The direct host is
IPv6-only, which many home and office networks do not have.

> This uses the `pg` driver directly rather than the Supabase CLI, whose npm wrapper
> crashes on some Windows setups.

#### Fallback: the browser SQL editor

Workable, but **read this warning first.** Paste each file's *contents* — not its
path — into **SQL Editor → New query**, in this order:

1. `supabase/migrations/20260101000000_core_schema.sql`
2. `supabase/migrations/20260101000100_rls.sql`
3. `supabase/migrations/20260101000200_admin_and_search.sql`
4. `supabase/migrations/20260101000300_directory_policy.sql`
5. `supabase/migrations/20260101000400_grants.sql`
6. `supabase/seed_districts.sql`
7. `supabase/seed.sql`
8. `supabase/seed_articles.sql`

**The editor runs only the selected text if anything is selected.** A partial paste
or a stray selection runs a fragment starting mid-statement, which produces errors
that look like corruption but are not — for example
`relation "direct" does not exist`, or a warning that you are about to create a table
called `direct`. If you see either, you ran a fragment. Clear the editor with
Ctrl+A then Delete, paste again, click empty space to deselect, and run.

`seed_districts.sql` is 140 KB. Pasting it through a browser is unpleasant and prone
to exactly this problem, which is why the terminal route is recommended.

**File 5 matters if you ever reset the schema.** A `drop schema public cascade`
removes Supabase's default table grants, and without them every page returns
`42501 permission denied for table …` even though the tables exist and RLS is
correct.

**File 2 is not optional.** It installs Row Level Security. Without it every table is
readable and writable by anyone holding the publishable key, which ships in the
browser bundle by design.

### 1.5 Verify

**Table Editor** should show about 19 tables, each marked "RLS enabled", and
**districts** should have 435 rows.

### 1.6 Fetch the map boundaries

```bash
npm run map:fetch
```

Downloads Census boundary files, simplifies them, and writes
`public/data/districts.geojson` and `public/data/states.geojson`. Takes a few minutes
and needs roughly 300 MB of temporary disk.

**These two files must be committed to git.** Vercel does not run this script during
a build, so if they are missing the live map shows an error message instead of a map.
The `.gitignore` is already set up to include them; just do not add them back.

### 1.7 Run it

```bash
npm run dev
```

Open <http://localhost:3000> and click through:

- Homepage renders, statistics section shows `[--]` placeholders (expected)
- `/districts` shows a map with 435 shaded districts
- Click any district → its page shows the real House member with phone and office
- `/articles` lists six articles, each opens
- `/resources` lists twenty organizations

If the map is blank, step 1.6 did not finish. If pages error, `.env.local` is wrong.

### 1.8 Create your account and promote it

Go to `/signup` and register with your real email. Then:

```bash
node scripts/promote-super-admin.mjs you@example.com
```

Sign out, sign back in, and `/admin` should now load. There is no default admin
account anywhere in this codebase — this script and the service role key are the only
way to create the first one.

---

## Part 2 — Push to GitHub

### 2.1 Confirm no secrets are staged

Do this before the first commit, not after. Secrets in git history are painful to
remove.

```bash
git init
git add .
git status --short | grep -i env
```

**That grep must return nothing.** If `.env.local` appears, stop and fix `.gitignore`
before continuing.

Also confirm the map files *are* included:

```bash
git status --short | grep geojson
```

That one **should** show two files. If it shows nothing, `npm run map:fetch` did not
run.

### 2.2 Commit

```bash
git add .
git commit -m "Initial commit"
```

### 2.3 Create the repository

On GitHub, **New repository**. Give it a name, leave it **empty** — no README, no
`.gitignore`, no license, since you already have those and they will cause a conflict.

Public or private both work with Vercel's free tier.

### 2.4 Push

Copy the two commands GitHub shows you under "push an existing repository":

```bash
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git branch -M main
git push -u origin main
```

If it asks for a password, GitHub wants a
[personal access token](https://github.com/settings/tokens), not your account
password. Or install the [GitHub CLI](https://cli.github.com) and run `gh auth login`.

---

## Part 3 — Deploy to Vercel

### 3.1 Import

At [vercel.com/new](https://vercel.com/new), connect your GitHub account and import
the repository.

Vercel will detect Next.js and fill in the build settings correctly. **Do not change
them.** Leave build command, output directory, and install command on their defaults.

### 3.2 Add environment variables

Before clicking Deploy, expand **Environment Variables** and add all five. Copy them
from your `.env.local`:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | same as local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same as local |
| `SUPABASE_SERVICE_ROLE_KEY` | same as local |
| `NEXT_PUBLIC_SITE_URL` | `https://placeholder.vercel.app` for now |
| `RATE_LIMIT_SALT` | same as local |

`NEXT_PUBLIC_SITE_URL` is a chicken-and-egg problem — you do not know the URL until
the first deploy finishes. Put a placeholder now and fix it in 3.4.

Leave all five applied to Production, Preview, and Development.

### 3.3 Deploy

Click **Deploy**. First build takes two to four minutes.

If it fails, open the build log and read the first error, not the last. The two
common causes are a missing environment variable and a typo in a Supabase key.

### 3.4 Fix the site URL

Once deployed, Vercel shows your domain, something like
`your-repo-abc123.vercel.app`.

Go to **Settings → Environment Variables**, edit `NEXT_PUBLIC_SITE_URL` to that full
URL with `https://`, save, then **Deployments → ⋯ → Redeploy** on the latest one.

Skipping this leaves your sitemap, canonical tags, and social preview cards all
pointing at a nonexistent domain.

### 3.5 Tell Supabase about the domain

**This is the step people forget, and password reset silently breaks without it.**

In Supabase, **Authentication → URL Configuration**:

- **Site URL:** your Vercel URL
- **Redirect URLs:** add both:
  - `https://your-domain.vercel.app/**`
  - `http://localhost:3000/**`

The wildcards matter. Save.

---

## Part 4 — Verify the live site

Work through all of these on the real domain, not localhost.

- [ ] Homepage loads, fonts render correctly
- [ ] `/districts` map draws and is clickable
- [ ] A district page shows the real House member, phone, and office
- [ ] `/articles` and an individual article both load
- [ ] Sign up with a second, throwaway email
- [ ] Password reset — request it, and confirm the email link returns you to the
      **live domain**, not localhost. If it goes to localhost, redo 3.5.
- [ ] Bookmark an article, confirm it appears on `/account`
- [ ] Sign in with your admin account, `/admin` loads
- [ ] Create a draft article, publish it, confirm it appears publicly
- [ ] **Sign out entirely and visit `/admin`** — you must be redirected away
- [ ] Submit the contact form, confirm it appears in the admin dashboard

That last check matters more than it looks. If a signed-out visitor can reach
`/admin`, something is wrong with the middleware or the migrations and you should not
launch.

---

## Part 5 — Custom domain (optional)

Vercel **Settings → Domains → Add**. Vercel gives you either an A record or a CNAME
to add at your registrar. DNS propagation takes anywhere from minutes to a few hours.

Once it resolves, **redo steps 3.4 and 3.5 with the new domain.** Both the
`NEXT_PUBLIC_SITE_URL` variable and the Supabase redirect URLs need updating, or
auth will break on the custom domain even though it works on the `.vercel.app` one.

---

## Part 6 — Ongoing

**Deploying changes.** Every push to `main` deploys automatically. Pull requests get
their own preview URL.

```bash
git add .
git commit -m "Describe the change"
git push
```

**Keeping House member data current.** Membership changes with every special
election. Re-run and commit:

```bash
npm run data:fetch
# reload supabase/seed_districts.sql in the SQL editor
git add supabase/seed_districts.sql && git commit -m "Update House members" && git push
```

Worth doing quarterly, and definitely after November elections.

**After redistricting.** Re-run `npm run map:fetch`, commit the new GeoJSON, and
re-run `npm run data:fetch`. Geography and political data are stored separately
precisely so this does not break the site.

---

## Troubleshooting

**Build fails: "Module not found"** — you have an uncommitted file. `git status`, add
it, push.

**Build fails on fonts** — the build fetches Newsreader, Public Sans, and IBM Plex
Mono from Google Fonts. Vercel has network access so this normally works; a transient
failure just needs a redeploy.

**Every page errors in production but works locally** — an environment variable is
missing or misspelled in Vercel. Compare against `.env.local` character by character;
the anon and service keys look similar and are easy to swap.

**Map is blank in production, fine locally** — the GeoJSON was not committed. Check
`git ls-files public/data`. If empty, your `.gitignore` still excludes it.

**Password reset email links to localhost** — step 3.5, and check the Site URL field
specifically, not just Redirect URLs.

**`/admin` returns "not authorized" for your own account** — the promote script ran
against a different database, or you have not signed out and back in since. Sessions
cache the role.

**Everything works but nothing is in the database** — you ran migrations against one
Supabase project and pointed Vercel at another. Check the project ref in the URL.

**A form submits but no email arrives** — expected. No email provider is wired up.
Submissions land in the admin dashboard. See README section 9.


---

## Appendix — ZIP search and third-party candidates

Both are optional, both need a free API key, and both are separate from the core
setup. Do them once the site is running.

### A. ZIP code search

Without this, the district finder works by state and district number but ZIP lookup
returns nothing.

1. Get a token at <https://www.huduser.gov/portal/dataset/uspszip-api.html> —
   register, confirm the email, then **Create New Token**. Free, instant.
2. Add it to `.env.local`:
   ```
   HUD_API_TOKEN=your-token
   ```
3. Run:
   ```bash
   npm run data:fetch -- --zip
   ```
   It walks the 50 states one at a time and takes a couple of minutes. It reports
   how many ZIPs span more than one district — that number should be large, in the
   thousands. If it is zero, something is wrong.
4. Load the regenerated file:
   ```bash
   npm run db:seed
   ```

If it reports no pairs matched, the API response shape has changed. Run
`node scripts/fetch-civic-data.mjs --debug-zip` to print one raw response.

Note: HUD crosswalk **type 5** is ZIP-to-congressional-district. If you ever edit
that script, do not change it to 8 — that is a different geography entirely and will
silently produce wrong districts.

### B. Third-party and independent candidates

1. Get a key at <https://api.data.gov/signup/>. Free, instant, emailed immediately.
2. Add it to `.env.local`:
   ```
   FEC_API_KEY=your-key
   ```
3. Run:
   ```bash
   npm run figures:fetch
   ```
   This writes `supabase/seed_figures.sql` with every House candidate for the current
   cycle whose FEC party code is not DEM or REP. The filter is structural only.
4. Load it:
   ```bash
   node scripts/run-sql.mjs supabase/seed_figures.sql
   ```

**Then do the part the script cannot do.** Every record arrives as
`needs_verification` with `inclusion_basis = 'filed_candidacy'`, and none appear
publicly until a human promotes them. That is deliberate:

- **FEC filing is not ballot access.** Filing costs nothing and is unscreened. The
  file will contain people who never reach a ballot, and some who are not serious.
- Before publishing a listing, confirm ballot qualification with that state's
  election authority, write how you confirmed it into `verification_note`, set
  `inclusion_basis` to `ballot_qualified`, and set the record active. The database
  refuses to activate any record with no source URL.
- Biographies and stated positions arrive empty. The FEC publishes neither. Fill
  `stated_positions` from each candidate's own material with a link to where they
  said it — never from a party label or from memory.

Work through **Admin → Political figures**, filtered to "Needs verification".
Expect this to be real work; publishing an unverified candidate directory is worse
than publishing none.
