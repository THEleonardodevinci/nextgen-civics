#!/usr/bin/env node
/**
 * Downloads U.S. congressional district and state boundaries from the Census
 * Bureau's cartographic boundary files, converts them to GeoJSON, simplifies
 * the geometry for web display, and writes:
 *
 *   public/data/districts.geojson
 *   public/data/states.geojson
 *
 * Each district feature gets a `district_code` property ("IL-05", "AK-AL")
 * that matches the `districts` table primary key. That code is the only
 * link between geography and political data, so a future redistricting
 * cycle means re-running this script and inserting new district rows —
 * the political_figures directory keeps working untouched.
 *
 * Usage:  node scripts/fetch-districts.mjs [--year 2023] [--congress 118]
 * Requires network access and npx (mapshaper is fetched on demand).
 */

import './load-env.mjs';
import { execSync } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);

const YEAR = args.year ?? '2023';
const CONGRESS = args.congress ?? '118';
const OUT = join(process.cwd(), 'public', 'data');
const TMP = join(process.cwd(), '.tmp-geo');

// Percentage of vertices retained. 6% keeps district shapes recognizable
// while cutting the nationwide file to a size mobile devices can render.
const SIMPLIFY = args.simplify ?? '6%';

const FIPS_TO_STATE = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT',
  '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL',
  '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD',
  '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE',
  '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD',
  '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV',
  '55': 'WI', '56': 'WY', '60': 'AS', '66': 'GU', '69': 'MP', '72': 'PR', '78': 'VI',
};

const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  AS: 'American Samoa', GU: 'Guam', MP: 'Northern Mariana Islands',
  PR: 'Puerto Rico', VI: 'U.S. Virgin Islands',
};

const sources = [
  {
    label: 'congressional districts',
    url: `https://www2.census.gov/geo/tiger/GENZ${YEAR}/shp/cb_${YEAR}_us_cd${CONGRESS}_500k.zip`,
    zip: 'cd.zip',
    out: 'districts.geojson',
    isDistrict: true,
  },
  {
    label: 'state boundaries',
    url: `https://www2.census.gov/geo/tiger/GENZ${YEAR}/shp/cb_${YEAR}_us_state_500k.zip`,
    zip: 'state.zip',
    out: 'states.geojson',
    isDistrict: false,
  },
];

async function download(url, dest) {
  process.stdout.write(`  fetching ${url}\n`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

/** Adds district_code / state metadata and drops unused Census columns. */
function annotate(path, isDistrict) {
  const gj = JSON.parse(readFileSync(path, 'utf8'));

  gj.features = gj.features
    .map((f) => {
      const p = f.properties ?? {};
      const stateCode = FIPS_TO_STATE[p.STATEFP];
      if (!stateCode) return null;

      if (!isDistrict) {
        f.properties = { state_code: stateCode, state_name: STATE_NAMES[stateCode] ?? p.NAME };
        return f;
      }

      const cd = p[`CD${CONGRESS}FP`] ?? p.CD119FP ?? p.CD118FP ?? p.CDFP;
      // '00' with a single district means at-large; 'ZZ' is unassigned water.
      if (cd === 'ZZ' || cd === undefined) return null;
      const atLarge = cd === '00' || cd === '98';
      const districtNumber = atLarge ? 'AL' : String(cd).padStart(2, '0');

      f.properties = {
        district_code: `${stateCode}-${districtNumber}`,
        state_code: stateCode,
        state_name: STATE_NAMES[stateCode] ?? stateCode,
        district_number: districtNumber,
        label: atLarge
          ? `${STATE_NAMES[stateCode]} — At-large`
          : `${STATE_NAMES[stateCode]} — District ${Number(districtNumber)}`,
      };
      return f;
    })
    .filter(Boolean);

  writeFileSync(path, JSON.stringify(gj));
  return gj.features.length;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(TMP, { recursive: true });

  for (const src of sources) {
    console.log(`\n▸ ${src.label}`);
    const zipPath = join(TMP, src.zip);
    const outPath = join(OUT, src.out);

    await download(src.url, zipPath);

    // mapshaper reads the zipped shapefile directly, simplifies, and writes GeoJSON.
    run(
      `npx -y mapshaper "${zipPath}" ` +
      `-simplify ${SIMPLIFY} keep-shapes ` +
      `-proj wgs84 ` +
      `-o format=geojson precision=0.0001 "${outPath}"`
    );

    const n = annotate(outPath, src.isDistrict);
    const kb = Math.round(readFileSync(outPath).length / 1024);
    console.log(`  wrote ${src.out} — ${n} features, ${kb} KB`);
  }

  rmSync(TMP, { recursive: true, force: true });
  console.log('\nDone. Restart the dev server to pick up the new boundaries.');
  console.log('Remember to insert matching rows into the `districts` table for any new codes.');
}

main().catch((err) => {
  console.error('\nFailed:', err.message);
  console.error(
    '\nIf the download failed, the Census may have moved the file. Browse\n' +
    'https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html\n' +
    'for the current cartographic boundary file and pass --year / --congress.'
  );
  process.exit(1);
});
