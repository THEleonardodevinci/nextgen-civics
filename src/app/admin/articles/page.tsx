import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/guards';
import ArticleAdminTable from './ArticleAdminTable';
import type { ArticleWithRelations } from '@/types/db';

export default async function AdminArticlesPage({
  searchParams,
}: { searchParams: { status?: string; q?: string } }) {
  const profile = await requireRole('WRITER');
  const supabase = createClient();

  let query = supabase
    .from('articles')
    .select('*, author:authors(*), category:categories(*), article_tags(tag:tags(*))')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (searchParams.status) query = query.eq('status', searchParams.status);
  if (searchParams.q) query = query.ilike('title', `%${searchParams.q}%`);

  const { data, error } = await query;
  const articles = ((data ?? []) as unknown as (ArticleWithRelations & { article_tags: unknown[] })[])
    .map((a) => ({ ...a, tags: [] }));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title">Articles</h1>
        <Link href="/admin/articles/edit" className="btn-primary">New article</Link>
      </div>

      {error && <p className="mt-6 text-sm text-burgundy">{error.message}</p>}

      <ArticleAdminTable articles={articles} role={profile.role} />
    </>
  );
}
