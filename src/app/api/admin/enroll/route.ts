import { NextResponse } from 'next/server';
import { scrypt, timingSafeEqual, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import { adminEnrollInput } from '@/lib/validation/schemas';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { clientKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const scryptAsync = promisify(scrypt) as (
  password: string, salt: Buffer, keylen: number
) => Promise<Buffer>;

/**
 * ADMIN ENROLLMENT
 * ----------------
 * The access code is never stored, never shipped to the browser, and never
 * compared in client code. ADMIN_ACCESS_CODE_HASH holds a scrypt digest in
 * the form `scrypt$<saltHex>$<keyHex>`; generate one with:
 *
 *   node scripts/hash-admin-code.mjs "your-code"
 *
 * A caller must already be signed in — enrollment upgrades an existing
 * account rather than creating a privileged one, so a leaked code alone
 * grants nothing. Attempts are recorded in admin_code_attempts and locked
 * out after five failures in fifteen minutes.
 *
 * SUPER_ADMIN is deliberately NOT grantable this way; see README.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in before entering an access code.' }, { status: 401 });
  }

  const configured = process.env.ADMIN_ACCESS_CODE_HASH;
  if (!configured) {
    return NextResponse.json(
      { error: 'Admin enrollment is not configured on this deployment.' },
      { status: 503 }
    );
  }

  const service = createServiceClient();

  // Server-side lockout, stored in Postgres so it survives restarts.
  const { data: recentFailures } = await service.rpc('recent_admin_attempts', {
    p_user: user.id, p_minutes: 15,
  });
  if ((recentFailures ?? 0) >= 5) {
    return NextResponse.json(
      { error: 'Too many failed attempts. Try again in fifteen minutes.' },
      { status: 429 }
    );
  }

  const parsed = adminEnrollInput.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter the access code.' }, { status: 400 });
  }

  const ok = await verify(parsed.data.code, configured);
  const ipHash = await clientKey(req);

  await service.from('admin_code_attempts').insert({
    user_id: user.id, ip_hash: ipHash, successful: ok,
  });

  if (!ok) {
    // Deliberately vague, and the same shape as a success, to avoid leaking
    // whether enrollment is even enabled.
    return NextResponse.json({ error: 'That code was not accepted.' }, { status: 403 });
  }

  const role = (process.env.ADMIN_ENROLL_ROLE ?? 'ADMIN') as 'WRITER' | 'EDITOR' | 'ADMIN';
  const { error } = await service.rpc('grant_role_via_access_code', {
    target_user: user.id, new_role: role,
  });
  if (error) {
    return NextResponse.json({ error: 'Enrollment failed. Contact a site administrator.' }, { status: 500 });
  }

  return NextResponse.json({ message: `Your account now has the ${role} role. Sign out and back in to refresh it.` });
}

/** Constant-time comparison against `scrypt$salt$key`. */
async function verify(candidate: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !keyHex) return false;

  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await scryptAsync(candidate, salt, expected.length);

  // Equal-length buffers are required by timingSafeEqual; pad defensively.
  if (actual.length !== expected.length) {
    timingSafeEqual(randomBytes(32), randomBytes(32));
    return false;
  }
  return timingSafeEqual(actual, expected);
}
