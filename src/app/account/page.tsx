import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';
import { fmtDate } from '@/lib/format';
import { EmptyState, Badge } from '@/components/ui/primitives';
import AccountForm from './AccountForm';
import type { ArticleWithRelations, Resource } from '@/types/db';

export const metadata = { title: 'Your account' };
export const dynamic = 'force-dynamic';

export default async function AccountPage({ searchParams }: { searchParams: { error?: string } }) {
  const profile = await getProfile();
  if (!profile) redirect('/login?next=/account');

  const supabase = createClient();
  const { data: bookmarks } = await supabase
    .from('bookmarks').select('target_type, target_id').eq('user_id', profile.id);

  const articleIds = (bookmarks ?? []).filter((b) => b.target_type === 'article').map((b) => b.target_id);
  const resourceIds = (bookmarks ?? []).filter((b) => b.target_type === 'resource').map((b) => b.target_id);

  const [{ data: articles }, { data: resources }, { data: districts }] = await Promise.all([
    articleIds.length
      ? supabase.from('articles').select('*, category:categories(*), author:authors(*)').in('id', articleIds)
      : Promise.resolve({ data: [] as unknown[] }),
    resourceIds.length
      ? supabase.from('resources').select('*').in('id', resourceIds)
      : Promise.resolve({ data: [] as unknown[] }),
    supabase.from('saved_districts')
      .select('district_code, districts(state_name, district_number)').eq('user_id', profile.id),
  ]);

  const savedArticles = (articles ?? []) as unknown as ArticleWithRelations[];
  const savedResources = (resources ?? []) as unknown as Resource[];

  return (
    <div className="shell py-14">
      <h1 className="text-title">Your account</h1>

      {searchParams.error === 'insufficient_role' && (
        <p className="mt-4 max-w-2xl rounded-md border border-gold/40 bg-gold-wash px-4 py-3 text-sm text-ink" role="alert">
          That area requires staff permissions your account does not have.
        </p>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[340px_1fr]">
        <section>
          <h2 className="text-[1.2rem]">Profile</h2>
          <div className="card mt-4 p-6">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">Email</dt>
                <dd className="text-right text-ink">{profile.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">Member since</dt>
                <dd className="text-right text-ink">{fmtDate(profile.created_at)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">Role</dt>
                <dd><Badge tone="neutral">{profile.role.replace('_', ' ')}</Badge></dd>
              </div>
            </dl>
            <div className="mt-6 border-t border-parchment-edge pt-6">
              <AccountForm profile={profile} />
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-slate-light">
            We store your email, an optional name and photo, and the things you choose to save.
            We do not build a political profile of you or infer your views from what you read.
          </p>
        </section>

        <div className="space-y-12">
          <section>
            <h2 className="text-[1.2rem]">Saved articles</h2>
            {savedArticles.length ? (
              <ul className="mt-4 divide-y divide-parchment-edge border-y border-parchment-edge">
                {savedArticles.map((a) => (
                  <li key={a.id} className="py-3">
                    <Link href={`/articles/${a.slug}`} className="text-ink hover:text-civic-deep">{a.title}</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4">
                <EmptyState title="You haven't saved any articles yet"
                            body="Use the Save button on any article to keep it here."
                            action={{ label: 'Browse articles', href: '/articles' }} />
              </div>
            )}
          </section>

          <section>
            <h2 className="text-[1.2rem]">Saved resources</h2>
            {savedResources.length ? (
              <ul className="mt-4 divide-y divide-parchment-edge border-y border-parchment-edge">
                {savedResources.map((r) => (
                  <li key={r.id} className="py-3">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-ink hover:text-civic-deep">
                      {r.name}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4">
                <EmptyState title="No saved resources yet"
                            body="Resources you save will be listed here."
                            action={{ label: 'Explore resources', href: '/resources' }} />
              </div>
            )}
          </section>

          <section>
            <h2 className="text-[1.2rem]">Saved district</h2>
            {(districts ?? []).length ? (
              <ul className="mt-4 divide-y divide-parchment-edge border-y border-parchment-edge">
                {(districts as unknown as { district_code: string }[]).map((d) => (
                  <li key={d.district_code} className="py-3">
                    <Link href={`/districts/${d.district_code.toLowerCase()}`} className="text-ink hover:text-civic-deep">
                      {d.district_code}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4">
                <EmptyState title="No saved district"
                            body="Saving a district is a convenience so you can find it again. It is not used to infer anything about your politics."
                            action={{ label: 'Find your district', href: '/districts' }} />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
