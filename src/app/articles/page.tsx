import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedArticles } from '@/lib/queries';
import { createClient } from '@/lib/supabase/server';
import ArticleCard from '@/components/articles/ArticleCard';
import { EmptyState } from '@/components/ui/primitives';
import type { Tag } from '@/types/db';

export const metadata: Metadata = {
  title: 'Articles & insights',
  description: 'Explainers, research summaries, and practical guides on polarization, elections, media literacy, and civic engagement.',
};

export const revalidate = 300;

const PER_PAGE = 9;

export default async function ArticlesPage({
  searchParams,
}: { searchParams: { tag?: string; q?: string; page?: string } }) {
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const supabase = createClient();

  const [{ articles, count }, { data: tagRows }] = await Promise.all([
    getPublishedArticles({ tag: searchParams.tag, q: searchParams.q, limit: 60 }),
    supabase.from('tags').select('*').order('name'),
  ]);

  const tags = (tagRows as Tag[]) ?? [];
  const featured = !searchParams.tag && !searchParams.q && page === 1
    ? articles.find((a) => a.featured) ?? null
    : null;

  const rest = articles.filter((a) => a.id !== featured?.id);
  const paged = rest.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(rest.length / PER_PAGE));

  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { tag: searchParams.tag, q: searchParams.q, ...over };
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v); });
    const s = p.toString();
    return s ? `/articles?${s}` : '/articles';
  };

  return (
    <div className="shell py-14">
      <p className="eyebrow">Reading</p>
      <h1 className="mt-3 text-title">Articles &amp; insights</h1>
      <p className="mt-4 max-w-2xl text-[1.05rem] leading-relaxed text-slate">
        Educational writing on why politics feels the way it does, what the research actually shows,
        and what to do about it in ordinary conversations.
      </p>

      {/* Search + tag filter. Both are plain links/forms so they work without JS. */}
      <form className="mt-8 flex max-w-md gap-2" action="/articles">
        {searchParams.tag && <input type="hidden" name="tag" value={searchParams.tag} />}
        <input
          name="q"
          defaultValue={searchParams.q ?? ''}
          placeholder="Search articles"
          aria-label="Search articles"
          className="field"
        />
        <button className="btn-secondary">Search</button>
      </form>

      <div className="mt-6 flex flex-wrap gap-1.5">
        <Link
          href={qs({ tag: undefined, page: undefined })}
          className={`badge ${!searchParams.tag ? 'border-ink bg-ink text-parchment' : 'border-parchment-edge text-slate hover:border-ink hover:text-ink'}`}
        >
          All
        </Link>
        {tags.map((t) => (
          <Link
            key={t.id}
            href={qs({ tag: t.slug, page: undefined })}
            className={`badge ${searchParams.tag === t.slug ? 'border-ink bg-ink text-parchment' : 'border-parchment-edge text-slate hover:border-ink hover:text-ink'}`}
          >
            {t.name}
          </Link>
        ))}
      </div>

      {featured && (
        <div className="mt-10">
          <p className="eyebrow mb-3">Featured</p>
          <ArticleCard article={featured} variant="featured" />
        </div>
      )}

      {paged.length ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {paged.map((a) => <ArticleCard key={a.id} article={a} />)}
        </div>
      ) : (
        <div className="mt-10">
          <EmptyState
            title="No articles match these filters"
            body="Try clearing the search box or choosing a different topic."
            action={{ label: 'Clear filters', href: '/articles' }}
          />
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Pagination">
          {page > 1 && <Link href={qs({ page: String(page - 1) })} className="btn-secondary px-4 py-2">Previous</Link>}
          <span className="font-mono text-[0.7rem] uppercase tracking-wider text-slate-light">
            Page {page} of {totalPages} · {count} articles
          </span>
          {page < totalPages && <Link href={qs({ page: String(page + 1) })} className="btn-secondary px-4 py-2">Next</Link>}
        </nav>
      )}
    </div>
  );
}
