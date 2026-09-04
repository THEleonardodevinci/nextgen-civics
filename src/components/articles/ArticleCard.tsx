import Link from 'next/link';
import type { ArticleWithRelations } from '@/types/db';
import { fmtDateShort } from '@/lib/format';
import { OpinionBadge } from '@/components/ui/primitives';

export default function ArticleCard({
  article, variant = 'standard',
}: { article: ArticleWithRelations; variant?: 'standard' | 'featured' | 'compact' }) {
  const href = `/articles/${article.slug}`;

  if (variant === 'compact') {
    return (
      <Link href={href} className="group block border-b border-parchment-edge py-4 last:border-0">
        <p className="eyebrow">{article.category?.name ?? 'Article'}</p>
        <h3 className="mt-1.5 text-[1rem] leading-snug transition group-hover:text-civic-deep">{article.title}</h3>
        <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-wider text-slate-faint">
          {article.reading_time} min read
        </p>
      </Link>
    );
  }

  const featured = variant === 'featured';

  return (
    <article className={`card-interactive overflow-hidden ${featured ? 'md:grid md:grid-cols-2' : ''}`}>
      <Link href={href} className="block h-full">
        <div className={`bg-parchment-deep ${featured ? 'h-full min-h-[240px]' : 'aspect-[16/9]'}`}>
          {article.featured_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.featured_image}
              alt={article.image_alt ?? ''}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center" aria-hidden>
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none" className="text-parchment-edge">
                <circle cx="18" cy="30" r="9" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="34" cy="30" r="9" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
          )}
        </div>
      </Link>

      <div className={`p-6 ${featured ? 'flex flex-col justify-center md:p-9' : ''}`}>
        <div className="flex flex-wrap items-center gap-2">
          <p className="eyebrow">{article.category?.name ?? 'Article'}</p>
          {article.is_opinion && <OpinionBadge />}
        </div>
        <h3 className={`mt-3 leading-snug ${featured ? 'text-title' : 'text-[1.2rem]'}`}>
          <Link href={href} className="transition hover:text-civic-deep">{article.title}</Link>
        </h3>
        {article.excerpt && (
          <p className={`mt-3 leading-relaxed text-slate ${featured ? '' : 'line-clamp-3 text-sm'}`}>
            {article.excerpt}
          </p>
        )}
        <p className="mt-5 font-mono text-[0.65rem] uppercase tracking-wider text-slate-faint">
          {article.author?.name ?? 'Staff'} · {fmtDateShort(article.published_at)} · {article.reading_time} min
        </p>
      </div>
    </article>
  );
}
