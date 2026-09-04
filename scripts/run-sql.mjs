#!/usr/bin/env node
/**
 * Runs .sql files straight against your Supabase Postgres database.
 *
 * This exists because the two usual routes both have sharp edges:
 *   - Pasting large files into the browser SQL editor truncates silently, and
 *     a half-pasted file can produce baffling errors.
 *   - The Supabase CLI's npm wrapper crashes on some Windows setups.
 *
 * This uses the `pg` driver directly. No CLI, no clipboard, no Bun.
 *
 * Usage
 * -----
 *   npm run db:setup            # migrations, then seeds, in the correct order
 *   npm run db:setup -- --seeds # seeds only
 *   node scripts/run-sql.mjs path/to/file.sql [more.sql ...]
 *
 * Connection string
 * -----------------
 * Put it in .env.local as DATABASE_URL, or pass it as DATABASE_URL=... inline.
 *
 * Get it from the Supabase dashboard: Connect (top of the page), or
 * Project Settings -> Database -> Connection string -> URI.
 *
 * Replace [YOUR-PASSWORD] in that string with the database password you saved
 * when you created the project. If your password contains @ : / ? # or %, it
 * must be percent-encoded, or the URL will not parse.
 *
 * If the direct connection times out — common on networks without IPv6 — use
 * the "Session pooler" connection string from the same page instead. It is
 * IPv4 and works everywhere.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

import './load-env.mjs';

const MIGRATIONS = [
  'supabase/migrations/20260101000000_core_schema.sql',
  'supabase/migrations/20260101000100_rls.sql',
  'supabase/migrations/20260101000200_admin_and_search.sql',
  'supabase/migrations/20260101000300_directory_policy.sql',
  // Runs last: grants must cover every table created above.
  'supabase/migrations/20260101000400_grants.sql',
];

// Order matters: seed.sql and seed_articles.sql reference districts.
const SEEDS = [
  'supabase/seed_districts.sql',
  'supabase/seed.sql',
  'supabase/seed_articles.sql',
];

const argv = process.argv.slice(2);
const explicit = argv.filter((a) => !a.startsWith('--'));

let files;
if (explicit.length) files = explicit;
else if (argv.includes('--seeds')) files = SEEDS;
else if (argv.includes('--migrations')) files = MIGRATIONS;
else files = [...MIGRATIONS, ...SEEDS];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(`
DATABASE_URL is not set.

  1. In the Supabase dashboard, click Connect at the top of the page
     (or Project Settings -> Database -> Connection string -> URI).
  2. Copy the URI. It looks like:
       postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres
  3. Replace [YOUR-PASSWORD] with your database password.
  4. Add it to .env.local as a new line:
       DATABASE_URL=postgresql://postgres:yourpassword@db.xxxx.supabase.co:5432/postgres

If the connection times out, use the "Session pooler" string from the same
page instead — it works on networks without IPv6.
`);
  process.exit(1);
}

if (url.includes('[YOUR-PASSWORD]')) {
  console.error('\nDATABASE_URL still contains the literal [YOUR-PASSWORD] placeholder.\nReplace it with your actual database password.\n');
  process.exit(1);
}

let pg;
try {
  pg = (await import('pg')).default;
} catch {
  console.error('\nThe `pg` package is missing. Install it:\n  npm install pg\n');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  // Supabase terminates TLS at the pooler with a cert this driver does not
  // ship a root for. The connection is still encrypted.
  ssl: { rejectUnauthorized: false },
});

console.log('\nConnecting…');
try {
  await client.connect();
} catch (e) {
  console.error(`\nCould not connect: ${e.message}\n`);
  if (/password/i.test(e.message)) {
    console.error('Check the password in DATABASE_URL. Special characters must be percent-encoded:\n  @ -> %40   : -> %3A   / -> %2F   ? -> %3F   # -> %23   % -> %25\n');
  } else if (/ENOTFOUND|ETIMEDOUT|ENETUNREACH/i.test(e.message)) {
    console.error('Network issue. Try the "Session pooler" connection string instead of the direct one —\nthe direct host is IPv6-only on many networks.\n');
  }
  process.exit(1);
}
console.log('Connected.\n');

let failed = false;

for (const rel of files) {
  const path = resolve(ROOT, rel);
  if (!existsSync(path)) {
    console.error(`  MISSING  ${rel}`);
    failed = true;
    continue;
  }

  const sql = readFileSync(path, 'utf8');
  const kb = (Buffer.byteLength(sql) / 1024).toFixed(0);
  process.stdout.write(`  running  ${basename(rel)} (${kb} KB)… `);

  try {
    await client.query(sql);
    console.log('ok');
  } catch (e) {
    console.log('FAILED');
    console.error(`\n    ${e.message}`);
    if (e.hint) console.error(`    hint: ${e.hint}`);
    if (e.position) {
      // Show the offending line so the error is actionable.
      const upto = sql.slice(0, Number(e.position));
      const line = upto.split('\n').length;
      console.error(`    at line ${line}: ${sql.split('\n')[line - 1]?.trim().slice(0, 120)}`);
    }
    console.error('');
    failed = true;
    break; // later files depend on earlier ones
  }
}

await client.end();

if (failed) {
  console.error('Stopped on error. Nothing after the failing file was run.\n');
  process.exit(1);
}

console.log(`\nDone. ${files.length} file(s) applied.\n`);
