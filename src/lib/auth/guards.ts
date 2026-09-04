import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ROLE_RANK, type Profile, type UserRole } from '@/types/db';

/** Current profile, or null when signed out. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return (data as Profile) ?? null;
}

export function atLeast(role: UserRole | undefined, min: UserRole) {
  return !!role && ROLE_RANK[role] >= ROLE_RANK[min];
}

/**
 * Server-side gate for pages. This is a UX redirect; the real enforcement
 * is the RLS policy on each table, which applies even if this is bypassed.
 */
export async function requireRole(min: UserRole): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect('/login?next=/admin');
  if (!atLeast(profile.role, min)) redirect('/account?error=insufficient_role');
  return profile;
}

/** Gate for route handlers. Returns a profile or an error tuple. */
export async function requireRoleApi(min: UserRole) {
  const profile = await getProfile();
  if (!profile) return { profile: null, error: 'Not signed in.', status: 401 } as const;
  if (!atLeast(profile.role, min)) return { profile: null, error: 'Insufficient permissions.', status: 403 } as const;
  return { profile, error: null, status: 200 } as const;
}
