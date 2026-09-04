import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/guards';
import UserTable from './UserTable';
import type { Profile } from '@/types/db';

export default async function AdminUsersPage() {
  const me = await requireRole('SUPER_ADMIN');
  const { data } = await createClient()
    .from('profiles').select('*').order('created_at', { ascending: false }).limit(500);

  return (
    <>
      <h1 className="text-title">Users</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
        Passwords are managed by Supabase Auth and are never visible here or anywhere else in this
        application. Role changes are recorded in the audit log.
      </p>
      <UserTable users={(data as Profile[]) ?? []} currentUserId={me.id} />
    </>
  );
}
