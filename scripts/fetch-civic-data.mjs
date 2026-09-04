#!/usr/bin/env node
/**
 * Fetches real civic data from authoritative public sources and writes
 * supabase/seed_districts.sql.
 *
 *   node scripts/fetch-civic-data.mjs            # members only, no key needed
 *   node scripts/fetch-civic-data.mjs --acs      # adds Census demographics
 *   node scripts/fetch-civic-data.mjs --acs --zip
 *
 * Sources
 * -------
 * Members of the House
 *   @unitedstates/congress-legislators — public domain (CC0), compiled from
 *   official House, Senate, GPO, and Bioguide sources. No key required.
 *
 * District demographics
 *   Census American Community Survey 5-Year Estimates, via api.census.gov.
 *   A free key is required for sustained use: https://api.census.gov/data/key_signup.html
 *   Set CENSUS_API_KEY in .env.local.
 *
 * ZIP to district crosswalk
 *   HUD USPS ZIP Crosswalk. Free token: https://www.huduser.gov/portal/dataset/uspszip-api.html
 *   Set HUD_API_TOKEN in .env.local.
 *
 * Nothing in the generated file is estimated, inferred, or recalled. Any field
 * a source does not supply is written as NULL. Re-run after any special
 * election, and after each decennial reapportionment.
 */

import './load-env.mjs';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TODAY = new Date().toISOString().slice(0, 10);

const args = new Set(process.argv.slice(2));
const WITH_ACS = args.has('--acs');
const WITH_ZIP = args.has('--zip');
const DEBUG_ZIP = args.has('--debug-zip');

const STATES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

// FIPS codes, needed because the Census API keys districts by numeric state.
const FIPS = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09', DE: '10',
  FL: '12', GA: '13', HI: '15', ID: '16', IL: '17', IN: '18', IA: '19', KS: '20',
  KY: '21', LA: '22', ME: '23', MD: '24', MA: '25', MI: '26', MN: '27', MS: '28',
  MO: '29', MT: '30', NE: '31', NV: '32', NH: '33', NJ: '34', NM: '35', NY: '36',
  NC: '37', ND: '38', OH: '39', OK: '40', OR: '41', PA: '42', RI: '44', SC: '45',
  SD: '46', TN: '47', TX: '48', UT: '49', VT: '50', VA: '51', WA: '53', WV: '54',
  WI: '55', WY: '56',
};
const FIPS_TO_ST = Object.fromEntries(Object.entries(FIPS).map(([k, v]) => [v, k]));

const LEGISLATORS_URL =
  'https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.yaml';

const log = (...m) => console.log('  ', ...m);

async function getText(url, label) {
  log(`fetching ${label}…`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${label} failed: HTTP ${res.status} ${url}`);
  return res.text();
}

/* ------------------------------------------------------------------ *
 * Members of the House
 * ------------------------------------------------------------------ */
async function fetchMembers() {
  const people = parseYaml(await getText(LEGISLATORS_URL, 'current legislators'));

  const seated = [];
  const seen = new Map(); // state -> Set(district numbers)

  for (const p of people) {
    const terms = p.terms || [];
    const t = terms[terms.length - 1];
    if (!t || t.type !== 'rep') continue;
    const st = t.state;
    if (!STATES[st]) continue; // DC and the territories send non-voting delegates

    const num = Number(t.district);
    if (!seen.has(st)) seen.set(st, new Set());
    seen.get(st).add(num);

    const name =
      p.name?.official_full || [p.name?.first, p.name?.last].filter(Boolean).join(' ');

    seated.push({
      code: num === 0 ? `${st}-AL` : `${st}-${String(num).padStart(2, '0')}`,
      state_code: st,
      state_name: STATES[st],
      district_number: num === 0 ? 'AL' : String(num).padStart(2, '0'),
      house_member: name,
      house_member_party: t.party ?? null,
      house_member_url: t.url ?? null,
      house_member_phone: t.phone ?? null,
      house_member_office: t.office ?? null,
      notes: null,
    });
  }

  // A vacant seat has no legislator record, so it would otherwise be missing
  // entirely. Fill interior gaps in each state's numbering.
  const vacancies = [];
  for (const [st, nums] of seen) {
    if (nums.has(0)) continue; // at-large
    const max = Math.max(...nums);
    for (let n = 1; n <= max; n++) {
      if (nums.has(n)) continue;
      const code = `${st}-${String(n).padStart(2, '0')}`;
      vacancies.push(code);
      seated.push({
        code,
        state_code: st,
        state_name: STATES[st],
        district_number: String(n).padStart(2, '0'),
        house_member: null,
        house_member_party: null,
        house_member_url: null,
        house_member_phone: null,
        house_member_office: null,
        notes: `Seat vacant as of ${TODAY}. Awaiting special election.`,
      });
    }
  }

  seated.sort((a, b) => a.code.localeCompare(b.code));

  // A vacancy in a state's highest-numbered district cannot be detected by gap
  // analysis. Reconcile against the boundary file, which lists every district.
  if (seated.length !== 435) {
    console.warn(
      `\n  WARNING: built ${seated.length} districts, expected 435.\n` +
      `  A vacancy in a state's last district is invisible to gap detection.\n` +
      `  Cross-check against public/data/districts.geojson (npm run map:fetch).\n`
    );
  }

  log(`${seated.length} districts, ${vacancies.length} vacant${vacancies.length ? `: ${vacancies.join(', ')}` : ''}`);
  return { districts: seated, vacancies };
}

/* ------------------------------------------------------------------ *
 * Census ACS demographics
 * ------------------------------------------------------------------ */
const ACS_YEAR = 2023;
const ACS_VARS = {
  B01003_001E: 'population',
  B05003_001E: 'voting_age_population', // see note below
  B19013_001E: 'median_household_income',
};

async function fetchAcs(districts) {
  const key = process.env.CENSUS_API_KEY;
  const base = `https://api.census.gov/data/${ACS_YEAR}/acs/acs5`;
  const vars = Object.keys(ACS_VARS).join(',');
  const url =
    `${base}?get=NAME,${vars}&for=congressional%20district:*&in=state:*` +
    (key ? `&key=${key}` : '');

  if (!key) {
    log('CENSUS_API_KEY not found in .env.local — trying unauthenticated (low rate limit)');
  }

  const rows = JSON.parse(await getText(url, `ACS ${ACS_YEAR} 5-year estimates`));
  const [header, ...data] = rows;
  const idx = Object.fromEntries(header.map((h, n) => [h, n]));

  const byCode = new Map();
  for (const r of data) {
    const st = FIPS_TO_ST[r[idx.state]];
    if (!st) continue;
    const cd = r[idx['congressional district']];
    const code = cd === '00' || cd === '98' ? `${st}-AL` : `${st}-${cd}`;
    const num = (v) => {
      const n = Number(v);
      // The Census uses large negative sentinels for suppressed values.
      return Number.isFinite(n) && n > -1e6 ? n : null;
    };
    byCode.set(code, {
      population: num(r[idx.B01003_001E]),
      median_household_income: num(r[idx.B19013_001E]),
    });
  }

  let hits = 0;
  for (const d of districts) {
    const m = byCode.get(d.code);
    if (!m) continue;
    Object.assign(d, m);
    hits++;
  }
  log(`matched ACS data for ${hits}/${districts.length} districts`);

  if (hits < districts.length) {
    console.warn(
      `\n  NOTE: ${districts.length - hits} districts had no ACS match. This is normal when the\n` +
      `  ACS vintage predates the current district lines. Those rows keep NULL\n` +
      `  demographics rather than borrowing figures from old boundaries.\n`
    );
  }
}

/* ------------------------------------------------------------------ *
 * ZIP to district crosswalk (HUD)
 * ------------------------------------------------------------------ */
async function fetchZips(validCodes) {
  const token = process.env.HUD_API_TOKEN;
  if (!token) {
    console.warn(
      '\n  HUD_API_TOKEN not found — skipping ZIP crosswalk.\n' +
      '\n  Checked .env.local and .env in the project root.\n' +
      '  The file must be named exactly ".env.local" (dot first), and the line\n' +
      '  must have no spaces around the "=" and no quotes:\n' +
      '      HUD_API_TOKEN=eyJ0eXAi...\n' +
      '\n  Get a token: https://www.huduser.gov/portal/dataset/uspszip-api.html\n'
    );
    return null;
  }

  // HUD crosswalk type 5 is zip-cd (ZIP -> congressional district).
  // Do not change this to 8; that is cbsa-zip and returns unrelated geography.
  // The full list: 1 zip-tract, 2 zip-county, 3 zip-cbsa, 4 zip-cbsadiv,
  // 5 zip-cd, 6 tract-zip, 7 county-zip, 8 cbsa-zip, 9 cbsadiv-zip,
  // 10 cd-zip, 11 zip-countysub, 12 countysub-zip.
  const TYPE = 5;

  // Query state by state rather than query=All. The nationwide call is large
  // enough to time out, and a per-state loop lets one failure be reported
  // without losing the rest.
  const states = [...new Set([...validCodes].map((c) => c.slice(0, 2)))].sort();
  const pairs = new Set();
  const failures = [];

  log(`fetching HUD ZIP -> district crosswalk for ${states.length} states…`);

  for (const [i, st] of states.entries()) {
    process.stdout.write(`\r   ${i + 1}/${states.length}  ${st}   `);
    const url = `https://www.huduser.gov/hudapi/public/usps?type=${TYPE}&query=${st}`;

    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        failures.push(`${st}: HTTP ${res.status}`);
        continue;
      }
      const json = await res.json();
      const results = json?.data?.results ?? [];

      for (const r of results) {
        // Field names vary between crosswalk types and query shapes, so accept
        // the documented variants rather than assuming one.
        const zipRaw = r.zip ?? r.input ?? r.zip_code;
        const geoid = String(r.geoid ?? r.cd ?? '');
        if (!zipRaw || !geoid) continue;

        const zip = String(zipRaw).padStart(5, '0');
        // geoid is state FIPS (2) + district (2).
        const stCode = FIPS_TO_ST[geoid.slice(0, 2)];
        if (!stCode) continue;
        const cd = geoid.slice(2).padStart(2, '0');
        const code = cd === '00' || cd === '98' ? `${stCode}-AL` : `${stCode}-${cd}`;

        if (validCodes.has(code)) pairs.add(`${zip}|${code}`);
      }
    } catch (e) {
      failures.push(`${st}: ${e.message}`);
    }

    await new Promise((r) => setTimeout(r, 150));
  }

  process.stdout.write('\r' + ' '.repeat(40) + '\r');

  if (failures.length) {
    console.warn(`\n  ${failures.length} state(s) failed:\n    ${failures.slice(0, 8).join('\n    ')}\n`);
  }

  if (!pairs.size) {
    console.warn(
      '\n  No ZIP pairs matched. Either the token is wrong, or the API response\n' +
      '  shape has changed. Run with --debug-zip to print one raw response.\n'
    );
    return null;
  }

  const zips = [...pairs].map((p) => p.split('|'));
  const multi = new Map();
  for (const [z] of zips) multi.set(z, (multi.get(z) ?? 0) + 1);
  const split = [...multi.values()].filter((n) => n > 1).length;

  log(`${zips.length} pairs across ${multi.size} ZIPs (${split} span more than one district)`);
  return zips;
}

/** Print one raw HUD response so a shape change can be diagnosed quickly. */
async function debugZip() {
  const token = process.env.HUD_API_TOKEN;
  const res = await fetch('https://www.huduser.gov/hudapi/public/usps?type=5&query=RI', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`HTTP ${res.status}`);
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2).slice(0, 2000));
}

/* ------------------------------------------------------------------ *
 * SQL emission
 * ------------------------------------------------------------------ */
const q = (v) =>
  v === null || v === undefined || v === ''
    ? 'null'
    : `'${String(v).replace(/'/g, "''")}'`;
const n = (v) => (v === null || v === undefined ? 'null' : String(v));

function toSql({ districts, vacancies }, zips) {
  const sources = [
    { label: '@unitedstates/congress-legislators (public domain)', url: 'https://github.com/unitedstates/congress-legislators' },
  ];
  if (WITH_ACS) {
    sources.push({ label: `U.S. Census Bureau, ACS ${ACS_YEAR} 5-Year Estimates`, url: 'https://data.census.gov' });
  }
  const src = JSON.stringify(sources).replace(/'/g, "''");

  const head = `-- ============================================================
-- REAL DATA — U.S. congressional districts and sitting House members.
--
-- GENERATED FILE. Do not edit by hand; re-run npm run data:fetch.
-- Generated ${TODAY}.
--
-- Sources
--   Members: @unitedstates/congress-legislators (public domain), compiled
--            from official House, Senate, GPO, and Bioguide records.
${WITH_ACS ? `--   Demographics: Census ACS ${ACS_YEAR} 5-Year Estimates via api.census.gov.\n` : '--   Demographics: NOT FETCHED. Re-run with --acs to populate.\n'}--
-- ${districts.length} districts. ${vacancies.length} vacant at generation time${vacancies.length ? `: ${vacancies.join(', ')}` : ''}.
--
-- Every value below came from one of the sources above. Nothing is
-- estimated, inferred, or filled in from memory. Fields a source did not
-- supply are NULL, which is why some columns are sparse.
--
-- Membership changes between elections. Re-run after any special election,
-- and after each decennial reapportionment.
-- ============================================================

insert into districts
  (district_code, state_code, state_name, district_number,
   house_member, house_member_party, house_member_url, house_member_phone,
   house_member_office, population, median_household_income,
   notes, data_sources, last_updated)
values`;

  const rows = districts.map(
    (d) =>
      `  (${q(d.code)}, ${q(d.state_code)}, ${q(d.state_name)}, ${q(d.district_number)}, ` +
      `${q(d.house_member)}, ${q(d.house_member_party)}, ${q(d.house_member_url)}, ` +
      `${q(d.house_member_phone)}, ${q(d.house_member_office)}, ` +
      `${n(d.population)}, ${n(d.median_household_income)}, ` +
      `${q(d.notes)}, '${src}'::jsonb, '${TODAY}')`
  );

  const tail = `on conflict (district_code) do update set
  house_member            = excluded.house_member,
  house_member_party      = excluded.house_member_party,
  house_member_url        = excluded.house_member_url,
  house_member_phone      = excluded.house_member_phone,
  house_member_office     = excluded.house_member_office,
  population              = coalesce(excluded.population, districts.population),
  median_household_income = coalesce(excluded.median_household_income, districts.median_household_income),
  notes                   = excluded.notes,
  data_sources            = excluded.data_sources,
  last_updated            = excluded.last_updated;
`;

  let sql = `${head}\n${rows.join(',\n')}\n${tail}`;

  if (zips?.length) {
    sql +=
      `\n-- ZIP to district crosswalk, from the HUD USPS crosswalk.\n` +
      `-- A ZIP may span several districts; every pair is stored, and the UI\n` +
      `-- shows all matches rather than picking one.\n` +
      `insert into zip_districts (zip, district_code) values\n` +
      zips.map(([z, c]) => `  ('${z}', '${c}')`).join(',\n') +
      `\non conflict do nothing;\n`;
  } else {
    sql +=
      `\n-- No ZIP crosswalk in this file. Set HUD_API_TOKEN and re-run with --zip.\n` +
      `-- Free token: https://www.huduser.gov/portal/dataset/uspszip-api.html\n` +
      `-- Until then, ZIP search returns no results; state and district search work.\n`;
  }

  return sql;
}

/* ------------------------------------------------------------------ */
async function main() {
  console.log('\nFetching civic data from authoritative sources\n');

  if (DEBUG_ZIP) { await debugZip(); return; }

  const result = await fetchMembers();
  if (WITH_ACS) await fetchAcs(result.districts);
  const zips = WITH_ZIP ? await fetchZips(new Set(result.districts.map((d) => d.code))) : null;

  const out = resolve(ROOT, 'supabase/seed_districts.sql');
  writeFileSync(out, toSql(result, zips));

  console.log(`\nWrote ${out}`);
  console.log('Load it in the Supabase SQL editor, before supabase/seed.sql.\n');

  if (!WITH_ACS) console.log('Tip: re-run with --acs for demographics, --zip for ZIP search.\n');
}

main().catch((err) => {
  console.error('\nFailed:', err.message, '\n');
  process.exit(1);
});
