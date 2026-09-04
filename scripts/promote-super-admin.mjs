#!/usr/bin/env node
/**
 * Grants SUPER_ADMIN to an existing account.
 *
 *   node scripts/promote-super-admin.mjs you@example.com
 *
 * Sign up on the site first — this promotes an account, it cannot create one.
 *
 * This connects with the `pg` driver rather than @supabase/supabase-js. That
 * library instantiates a realtime client on construction, which requires a
 * native WebSocket and therefore Node 22+; on Node 20 it throws before any
 * query runs. A single UPDATE does not need any of that machinery.
 *
 * Uses DATABASE_URL — the same connection string as npm run db:setup.
 *
 * Role changes are blocked for normal clients by a database trigger, so that a
 * compromised session cannot escalate itself. Creating the first administrator
 * therefore requires database-level access, which is the point: there is no
 * default admin account anywhere in this project.
 */

import './load-env.mjs';

const email = (process.argv[2] || '').trim().toLowerCase();

if (!email) {
  console.error('\nUsage:  node scripts/promote-super-admin.mjs you@example.com\n');
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    '\nDATABASE_URL is not set.\n' +
    '\nChecked .env.local and .env in the project root. This is the same\n' +
    'connection string used by npm run db:setup:\n' +
    '    DATABASE_URL=postgresql://postgres:yourpassword@db.your-ref.supabase.co:5432/postgres\n' +
    '\nDashboard -> Connect, or Settings -> Database -> Connection string -> URI.\n'
  );
  process.exit(1);
}

let pg;
try {
  pg = (await import('pg')).default;
} catch {
  console.error('\nThe `pg` package is missing. Run:  npm install\n');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
} catch (e) {
  console.error(`\nCould not connect: ${e.message}\n`);
  if (/ENOTFOUND|ETIMEDOUT|ENETUNREACH/i.test(e.message)) {
    console.error('Try the "Session pooler" connection string — the direct host is IPv6-only.\n');
  }
  process.exit(1);
}

try {
  const found = await client.query(
    'select id, email, role from public.profiles where lower(email) = $1',
    [email]
  );

  if (found.rowCount === 0) {
    console.error(`\nNo account found for ${email}.`);
    console.error('\nSign up on the site first, at /signup, then run this again.');

    const all = await client.query('select email from public.profiles order by created_at limit 10');
    if (all.rowCount > 0) {
      console.error('\nAccounts that do exist:');
      for (const r of all.rows) console.error(`    ${r.email}`);
    } else {
      console.error('\nThere are no accounts in this database yet.');
    }
    console.error('');
    process.exit(1);
  }

  const current = found.rows[0];
  if (current.role === 'SUPER_ADMIN') {
    console.log(`\n${current.email} is already SUPER_ADMIN. Nothing to do.\n`);
    process.exit(0);
  }

  // guard_role_change() blocks role changes unless the caller already has
  // SUPER_ADMIN. Migration 20260101000500 exempts direct database connections,
  // but if that migration has not been applied yet, suppress triggers for this
  // one statement instead of failing. session_replication_role is scoped to the
  // transaction by `set local`, so it reverts on commit.
  await client.query('begin');
  await client.query("set local session_replication_role = replica");

  const updated = await client.query(
    `update public.profiles set role = 'SUPER_ADMIN'
      where lower(email) = $1
      returning id, email, role`,
    [email]
  );

  await client.query('commit');

  const row = updated.rows[0];
  console.log(`\n  ${row.email}`);
  console.log(`  ${current.role} -> ${row.role}\n`);
  console.log('Sign out and sign back in — your current session still caches the old');
  console.log('role, so /admin will keep rejecting you until you do.\n');
} catch (e) {
  try { await client.query('rollback'); } catch { /* no open transaction */ }
  console.error(`\nFailed: ${e.message}\n`);
  if (/SUPER_ADMIN/i.test(e.message)) {
    console.error(
      'The role guard rejected this. Apply the bootstrap migration and retry:\n' +
      '    node scripts/run-sql.mjs supabase/migrations/20260101000500_bootstrap_admin.sql\n'
    );
  }
  if (/permission denied|violates/i.test(e.message)) {
    console.error('The connection lacks permission to change roles. Confirm DATABASE_URL is the\npostgres superuser string from the dashboard, not a restricted role.\n');
  }
  process.exit(1);
} finally {
  await client.end();
}
