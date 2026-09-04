import { requireRole } from '@/lib/auth/guards';
import AdminShell from '@/components/admin/AdminShell';

export const metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * Server-side gate for the whole /admin tree. Every page inside also runs
 * its own requireRole(), and every table is protected by RLS, so this is
 * the outermost of three independent checks.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole('WRITER');
  return <AdminShell role={profile.role}>{children}</AdminShell>;
}
