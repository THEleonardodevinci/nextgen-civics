#!/usr/bin/env node
/**
 * Fetches real, currently-filed U.S. House candidates who are NOT nominees of
 * the Democratic or Republican parties, from the Federal Election Commission's
 * open API, and writes supabase/seed_figures.sql.
 *
 *   FEC_API_KEY=... node scripts/fetch-fec-candidates.mjs
 *   FEC_API_KEY=... node scripts/fetch-fec-candidates.mjs --cycle 2026
 *
 * Free key, issued instantly: https://api.data.gov/signup/
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS DOES AND DOES NOT GIVE YOU
 *
 * The FEC is the only free, bulk, authoritative source for federal candidates.
 * It is a filing database, not a ballot. That distinction matters:
 *
 *   - Filing with the FEC is nearly free and requires no signatures. The file
 *     contains serious candidates alongside people who will never appear on a
 *     ballot, and a number of joke filings.
 *   - Ballot qualification is decided by each state, on its own timeline, and
 *     is NOT in this data.
 *
 * So every record this script emits lands in state = 'needs_verification'
 * with inclusion_basis = 'filed_candidacy'. A human must confirm ballot access
 * against the relevant Secretary of State before promoting a record to
 * 'ballot_qualified' and 'active'. The database enforces the source
 * requirement; it cannot enforce that you actually looked.
 *
 * ---------------------------------------------------------------------------
 * ON WHO GETS INCLUDED
 *
 * The filter here is structural, not ideological: party affiliation as
 * recorded by the FEC, plus office and cycle. It does not and should not
 * assess whether a candidate is moderate, centrist, or constructive.
 *
 * Those are contested judgments. "Moderate" is defined relative to a baseline
 * that different readers place in different spots, and a directory filtered
 * that way is a slate of approved candidates no matter what it is labeled.
 * That would contradict the no-endorsement commitment published at
 * /editorial-standards, and it is the fastest way for a depolarization project
 * to be read as a faction.
 *
 * If you want readers to know where a candidate stands, use the
 * stated_positions field: their own words, with a link to where they said it.
 * Let the reader judge.
 */

import './load-env.mjs';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TODAY = new Date().toISOString().slice(0, 10);

const API = 'https://api.open.fec.gov/v1';
const KEY = process.env.FEC_API_KEY;

const argv = process.argv.slice(2);
const cycleArg = argv.indexOf('--cycle');
const CYCLE = cycleArg > -1 ? Number(argv[cycleArg + 1]) : defaultCycle();

function defaultCycle() {
  // Federal election cycles are even-numbered years.
  const y = new Date().getFullYear();
  return y % 2 === 0 ? y : y + 1;
}

if (!KEY) {
  console.error(
    '\nFEC_API_KEY not found.\n' +
    '\nChecked .env.local and .env in the project root. The file must be named\n' +
    'exactly ".env.local" (dot first), with no spaces around "=" and no quotes:\n' +
    '    FEC_API_KEY=your-key-here\n' +
    '\nGet a free key instantly: https://api.data.gov/signup/\n' +
    '\nOr pass it inline:  FEC_API_KEY=your-key npm run figures:fetch\n'
  );
  process.exit(1);
}

// FEC party codes for the two major parties. Everything else is in scope.
const MAJOR = new Set(['DEM', 'REP']);

// Party codes that indicate no party affiliation rather than a third party.
const INDEPENDENT = new Set(['IND', 'NNE', 'NON', 'N', 'UNK', 'OTH']);

const STATES = new Set(
  ('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO ' +
   'MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY').split(' ')
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getPage(page) {
  const url =
    `${API}/candidates/?api_key=${KEY}` +
    `&election_year=${CYCLE}&office=H&candidate_status=C` +
    `&per_page=100&page=${page}&sort=name`;

  const res = await fetch(url);

  if (res.status === 429) {
    console.log('   rate limited, waiting 60s…');
    await sleep(60_000);
    return getPage(page);
  }
  if (!res.ok) throw new Error(`FEC API returned HTTP ${res.status}`);
  return res.json();
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

/** FEC stores names as "LAST, FIRST MIDDLE". Render them readably. */
function formatName(raw) {
  const n = String(raw || '').trim();
  if (!n.includes(',')) return titleCase(n);
  const [last, rest] = n.split(',', 2);
  return titleCase(`${rest.trim()} ${last.trim()}`);
}

function titleCase(s) {
  return s
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .replace(/\bMc([a-z])/g, (_, c) => `Mc${c.toUpperCase()}`)
    .replace(/\b(Ii|Iii|Iv)\b/g, (m) => m.toUpperCase());
}

async function fetchCandidates() {
  const out = [];
  const skipped = { noName: [], noDistrict: [], noId: [] };
  let page = 1;
  let pages = 1;

  do {
    process.stdout.write(`\r   page ${page}${pages > 1 ? ` of ${pages}` : ''}…   `);
    const json = await getPage(page);
    pages = json.pagination?.pages ?? 1;

    for (const c of json.results ?? []) {
      const party = (c.party || '').toUpperCase();
      if (MAJOR.has(party)) continue;

      const st = c.state;
      if (!STATES.has(st)) continue;

      // Guard the empty cases explicitly. Number(null) and Number('') both
      // return 0, which is a VALID district here — at-large — so a record with
      // no district would otherwise be silently filed as at-large.
      const rawDistrict = c.district;
      const hasDistrict =
        rawDistrict !== null && rawDistrict !== undefined && String(rawDistrict).trim() !== '';
      const num = hasDistrict ? Number(rawDistrict) : NaN;
      if (!Number.isFinite(num) || num < 0 || num > 60) {
        skipped.noDistrict.push(c.candidate_id ?? '?');
        continue;
      }

      // At-large is only legitimate in single-district states. Anywhere else a
      // 0 means missing data wearing a valid-looking value.
      const AT_LARGE = new Set(['AK', 'DE', 'ND', 'SD', 'VT', 'WY']);
      if (num === 0 && !AT_LARGE.has(st)) {
        skipped.noDistrict.push(c.candidate_id ?? '?');
        continue;
      }
      if (!c.candidate_id) { skipped.noId.push(c.name ?? '?'); continue; }

      // The FEC file is not uniformly populated: some rows carry no usable
      // name. Emitting those produced a NOT NULL violation on load, so they
      // are skipped and counted rather than written as nulls.
      const displayName = formatName(c.name ?? c.candidate_name ?? c.display_name);
      if (!displayName || displayName.length < 2) {
        skipped.noName.push(c.candidate_id ?? '(no id)');
        continue;
      }

      out.push({
        name: displayName,
        fec_id: c.candidate_id,
        state_code: st,
        district_code: num === 0 ? `${st}-AL` : `${st}-${String(num).padStart(2, '0')}`,
        party_code: party,
        party_full: c.party_full || party || null,
        affiliation_type: INDEPENDENT.has(party) ? 'independent' : 'third_party',
      });
    }

    page++;
    await sleep(250); // stay well under the rate limit
  } while (page <= pages);

  process.stdout.write('\r' + ' '.repeat(40) + '\r');

  const totalSkipped = skipped.noName.length + skipped.noDistrict.length + skipped.noId.length;
  if (totalSkipped) {
    console.warn(
      `\n  Skipped ${totalSkipped} incomplete record(s): ` +
      `${skipped.noName.length} with no name, ` +
      `${skipped.noDistrict.length} with no district, ` +
      `${skipped.noId.length} with no FEC id.\n` +
      `  The FEC file is not uniformly populated. These are left out rather than\n` +
      `  written with missing values.\n`
    );
  }

  // Deduplicate: a candidate can appear more than once across filings.
  const seen = new Set();
  const unique = out.filter((c) => !seen.has(c.fec_id) && seen.add(c.fec_id));

  // Slugs must be unique per district.
  const used = new Set();
  for (const c of unique) {
    let slug = slugify(c.name) || c.fec_id.toLowerCase();
    const key = () => `${c.district_code}|${slug}`;
    let i = 2;
    while (used.has(key())) slug = `${slugify(c.name)}-${i++}`;
    used.add(key());
    c.slug = slug;
  }

  return unique;
}

const q = (v) =>
  v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`;

function toSql(rows) {
  const byParty = rows.reduce((m, r) => ((m[r.party_full || '—'] = (m[r.party_full || '—'] || 0) + 1), m), {});
  const partyLines = Object.entries(byParty)
    .sort((a, b) => b[1] - a[1])
    .map(([p, n]) => `--   ${String(n).padStart(4)}  ${p}`)
    .join('\n');

  const head = `-- ============================================================
-- REAL DATA — U.S. House candidates for the ${CYCLE} cycle who are not
-- Democratic or Republican nominees.
--
-- GENERATED FILE. Do not edit by hand; re-run npm run figures:fetch.
-- Generated ${TODAY}.
--
-- Source: Federal Election Commission candidate filings, api.open.fec.gov.
-- Filter: office = House, cycle = ${CYCLE}, status = statutory candidate,
--         FEC party code not in (DEM, REP). Structural only — no ideological
--         screen of any kind was applied.
--
-- ${rows.length} candidates:
${partyLines}
--
-- IMPORTANT — READ BEFORE PUBLISHING
--
-- Every row lands in state = 'needs_verification' with
-- inclusion_basis = 'filed_candidacy'. FEC filing is NOT ballot access.
-- Filing is cheap and unscreened; this file will contain people who never
-- reach a ballot, and some who are not serious.
--
-- Before setting a record active, confirm ballot qualification with the
-- relevant Secretary of State, record how you confirmed it in
-- verification_note, and set inclusion_basis = 'ballot_qualified'.
-- The database will refuse to activate a record with no source URL.
--
-- Biographies and stated_positions are intentionally EMPTY. The FEC does not
-- publish either, and neither should be written from memory or inferred from
-- a party label. Fill stated_positions from each candidate's own published
-- material, with a link to where they said it.
-- ============================================================

insert into political_figures
  (name, slug, state_code, district_code, party, affiliation_type, office,
   candidate_status, inclusion_basis, state, source_urls)
values`;

  const vals = rows.map((r) => {
    const src = JSON.stringify([
      { label: `FEC candidate record ${r.fec_id}`, url: `https://www.fec.gov/data/candidate/${r.fec_id}/` },
    ]).replace(/'/g, "''");
    return (
      `  (${q(r.name)}, ${q(r.slug)}, ${q(r.state_code)}, ${q(r.district_code)}, ` +
      `${q(r.party_full)}, '${r.affiliation_type}', 'U.S. House', ` +
      `${r.affiliation_type === 'independent' ? "'independent_candidate'" : "'third_party_candidate'"}, ` +
      `'filed_candidacy', 'needs_verification', '${src}'::jsonb)`
    );
  });

  return `${head}\n${vals.join(',\n')}\non conflict (district_code, slug) do nothing;\n`;
}

async function main() {
  console.log(`\nFetching ${CYCLE} House candidates outside the two major parties\n`);

  const rows = await fetchCandidates();
  if (!rows.length) {
    console.error('No candidates returned. Check the cycle year and your API key.\n');
    process.exit(1);
  }

  // Nothing with a missing required field may be written. A NOT NULL
  // violation at load time is a much worse place to discover this.
  const REQUIRED = ['name', 'slug', 'state_code', 'district_code', 'affiliation_type'];
  const bad = rows.filter((r) => REQUIRED.some((k) => !r[k] || String(r[k]).trim() === ''));
  if (bad.length) {
    console.error(`\nRefusing to write: ${bad.length} row(s) are missing a required field.`);
    console.error(bad.slice(0, 5).map((r) => `  ${JSON.stringify(r)}`).join('\n'));
    process.exit(1);
  }

  const out = resolve(ROOT, 'supabase/seed_figures.sql');
  writeFileSync(out, toSql(rows));

  console.log(`   ${rows.length} candidates across ${new Set(rows.map((r) => r.district_code)).size} districts`);
  console.log(`\nWrote ${out}`);
  console.log('\nAll records are unverified. Confirm ballot access before publishing any of them.\n');
}

main().catch((err) => {
  console.error('\nFailed:', err.message, '\n');
  process.exit(1);
});
