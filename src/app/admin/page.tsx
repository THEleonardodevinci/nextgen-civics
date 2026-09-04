import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireRole, atLeast } from '@/lib/auth/guards';
import { getVerificationWindow } from '@/lib/queries';
import { fmtDateShort } from '@/lib/format';
import { Badge } from '@/components/ui/primitives';
import type { PoliticalFigure } from '@/types/db';

export default async function AdminOverview() {
  const profile = await requireRole('WRITER');
  const supabase = createClient();
  const windowDays = await getVerificationWindow();

  const count = async (table: string, filter?: (q: never) => never) => {
    let q = supabase.from(table).select('*', { count: 'exact', head: true });
    if (filter) q = filter(q as never);
    const { count } = await q;
    return count ?? 0;
  };

  const [published, drafts, users, figures, resources] = await Promise.all([
    supabase.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    atLeast(profile.role, 'ADMIN')
      ? supabase.from('profiles').select('*', { count: 'exact', head: true })
      : Promise.resolve({ count: null }),
    supabase.from('political_figures').select('*', { count: 'exact', head: true }),
    supabase.from('resources').select('*', { count: 'exact', head: true }),
  ]);

  const { data: stale } = await supabase.rpc('figures_needing_verification', { p_days: windowDays });
  const needsVerification = (stale ?? []) as PoliticalFigure[];

  const cards = [
    { label: 'Published articles', value: published.count ?? 0, href: '/admin/articles?status=published' },
    { label: 'Draft articles', value: drafts.count ?? 0, href: '/admin/articles?status=draft' },
    { label: 'Registered users', value: users.count, href: '/admin/users' },
    { label: 'Political figures', value: figures.count ?? 0, href: '/admin/political-figures' },
    { label: 'Resources', value: resources.count ?? 0, href: '/admin/resources' },
    { label: 'Records needing verification', value: needsVerification.length, href: '/admin/political-figures?filter=needs_verification' },
  ].filter((c) => c.value !== null);

  return (
    <>
      <h1 className="text-title">Overview</h1>
      <p className="mt-2 text-sm text-slate">
        Signed in as {profile.email} · {profile.role.replace('_', ' ')}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card-interactive p-5">
            <p className="font-display text-[2.2rem] leading-none text-ink">{c.value}</p>
            <p className="mt-2 font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">{c.label}</p>
          </Link>
        ))}
      </div>

      {atLeast(profile.role, 'ADMIN') && (
        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[1.2rem]">Entries needing verification</h2>
              <p className="mt-1 text-sm text-slate">
                Records with no verification date, or last verified more than {windowDays} days ago.
              </p>
            </div>
            <Link href="/admin/political-figures" className="btn-secondary">Manage figures</Link>
          </div>

          {needsVerification.length === 0 ? (
            <p className="card mt-4 p-6 text-sm text-slate">Everything is within the verification window.</p>
          ) : (
            <ul className="mt-4 divide-y divide-parchment-edge overflow-hidden rounded-md border border-parchment-edge bg-white">
              {needsVerification.slice(0, 12).map((f) => (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-[0.95rem] text-ink">{f.name}</p>
                    <p className="font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">
                      {f.district_code ?? f.state_code} · last verified {fmtDateShort(f.last_verified)}
                    </p>
                  </div>
                  <Badge tone="warn">Needs verification</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
