import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRoleApi } from '@/lib/auth/guards';

const input = z.object({
  userId: z.string().uuid(),
  role: z.enum(['USER', 'WRITER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN']),
});

/**
 * Role changes go through the set_user_role() function, which re-checks
 * SUPER_ADMIN inside the database and writes an audit entry. Even if this
 * route were bypassed, Postgres would still refuse the change.
 */
export async function POST(req: Request) {
  const auth = await requireRoleApi('SUPER_ADMIN');
  if (!auth.profile) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = input.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  if (parsed.data.userId === auth.profile.id) {
    return NextResponse.json(
      { error: 'You cannot change your own role. Ask another super admin.' },
      { status: 400 }
    );
  }

  const { error } = await createClient().rpc('set_user_role', {
    target_user: parsed.data.userId,
    new_role: parsed.data.role,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ message: 'Role updated.' });
}
