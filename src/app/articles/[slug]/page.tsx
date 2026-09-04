import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getArticleBySlug, getRelatedArticles } from '@/lib/queries';
import { sanitizeHtml } from '@/lib/sanitize';
import { fmtDate } from '@/lib/format';
import { org } from '@/data/site-content';
import { OpinionBadge, SourceCitation } from '@/components/ui/primitives';
import ArticleCard from '@/components/articles/ArticleCard';
import ReadingProgress from '@/components/articles/ReadingProgress';
import BookmarkButton from '@/components/articles/BookmarkButton';
import ViewCounter from '@/components/articles/ViewCounter';

export const revalidate = 300;

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await getArticleBySlug(params.slug);
  if (!a) return { title: 'Article not found' };
  return {
    title: a.seo_title ?? a.title,
    description: a.seo_description ?? a.excerpt ?? undefined,
    alternates: { canonical: `${org.url}/articles/${a.slug}` },
    openGraph: {
      type: 'article',
      title: a.title,
      description: a.excerpt ?? undefined,
      publishedTime: a.published_at ?? undefined,
      modifiedTime: a.updated_at,
      authors: a.author?.name ? [a.author.name] : undefined,
      images: a.featured_image ? [a.featured_image] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const article = await getArticleBySlug(params.slug);
  if (!article || article.status !== 'published') notFound();

  const related = await getRelatedArticles(article, 4);
  const html = sanitizeHtml(article.content);

  const schema = {
    '@context': 'https://schema.org',
    '@type': article.is_opinion ? 'OpinionNewsArticle' : 'Article',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: article.author ? { '@type': 'Person', name: article.author.name } : undefined,
    publisher: { '@type': 'Organization', name: org.name },
  };

  return (
    <>
      <ReadingProgress />
      <ViewCounter slug={article.slug} />

      <article className="shell py-12">
        <nav aria-label="Breadcrumb" className="font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">
          <Link href="/articles" className="hover:text-ink">Articles</Link>
          <span aria-hidden> / </span>
          <span className="text-ink">{article.category?.name ?? 'Article'}</span>
        </nav>

        <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">
            <header className="max-w-prose">
              <div className="flex flex-wrap items-center gap-2">
                <p className="eyebrow">{article.category?.name ?? 'Article'}</p>
                {article.is_opinion && <OpinionBadge />}
              </div>
              <h1 className="mt-4 text-title">{article.title}</h1>
              {article.subtitle && (
                <p className="mt-4 font-display text-[1.25rem] leading-snug text-slate">{article.subtitle}</p>
              )}

              <div className="mt-7 flex flex-wrap items-center gap-4 border-y border-parchment-edge py-4">
                {article.author && (
                  <div className="flex items-center gap-3">
                    {article.author.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={article.author.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-parchment-deep" aria-hidden />
                    )}
                    <Link href={`/authors/${article.author.slug}`} className="text-sm text-ink hover:underline">
                      {article.author.name}
                    </Link>
                  </div>
                )}
                <p className="font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">
                  {fmtDate(article.published_at)} · {article.reading_time} min read
                </p>
                <div className="ml-auto flex gap-2">
                  <BookmarkButton targetType="article" targetId={article.id} />
                </div>
              </div>

              {article.is_opinion && (
                <p className="mt-6 rounded-md border border-burgundy/25 bg-burgundy-wash px-4 py-3 text-sm leading-relaxed text-ink">
                  <strong>Opinion.</strong> This piece argues a position and reflects its author, not the
                  organization. Factual reporting and analysis are labeled separately.
                </p>
              )}
            </header>

            {article.featured_image && (
              <figure className="mt-9">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={article.featured_image} alt={article.image_alt ?? ''}
                     className="w-full rounded-md border border-parchment-edge object-cover" />
              </figure>
            )}

            {/* Sanitized on write in the API route and again here on render. */}
            <div className="prose-article mt-10 max-w-prose" dangerouslySetInnerHTML={{ __html: html }} />

            {article.tags.length > 0 && (
              <div className="mt-12 flex flex-wrap gap-1.5">
                {article.tags.map((t) => (
                  <Link key={t.id} href={`/articles?tag=${t.slug}`}
                        className="badge border-parchment-edge text-slate hover:border-ink hover:text-ink">
                    {t.name}
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-10 max-w-prose">
              <SourceCitation sources={article.sources ?? []} label="Sources & references" />
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-parchment-edge pt-6">
              <a
                className="link-underline text-sm"
                href={`mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(`${org.url}/articles/${article.slug}`)}`}
              >
                Share by email
              </a>
              <Link href="/corrections" className="link-underline text-sm">Report an error</Link>
            </div>
          </div>

          {related.length > 0 && (
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <h2 className="eyebrow">Keep reading</h2>
              <div className="mt-3">
                {related.slice(0, 3).map((a) => (
                  <ArticleCard key={a.id} article={a} variant="compact" />
                ))}
              </div>
            </aside>
          )}
        </div>
      </article>

      {related.length > 0 && (
        <section className="border-t border-parchment-edge bg-white/60">
          <div className="shell py-16">
            <h2 className="text-[1.3rem]">Related articles</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((a) => <ArticleCard key={a.id} article={a} />)}
            </div>
          </div>
        </section>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </>
  );
}
