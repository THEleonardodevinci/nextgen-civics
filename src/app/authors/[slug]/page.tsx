import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPublishedArticles } from '@/lib/queries';
import ArticleCard from '@/components/articles/ArticleCard';
import { EmptyState } from '@/components/ui/primitives';
import type { Author } from '@/types/db';

export const revalidate = 600;

type Props = { params: { slug: string } };

async function getAuthor(slug: string) {
  const { data } = await createClient().from('authors').select('*').eq('slug', slug).maybeSingle();
  return (data as Author) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await getAuthor(params.slug);
  return a ? { title: a.name, description: a.bio ?? undefined } : { title: 'Author not found' };
}

export default async function AuthorPage({ params }: Props) {
  const author = await getAuthor(params.slug);
  if (!author) notFound();

  const { articles } = await getPublishedArticles({ limit: 60 });
  const theirs = articles.filter((a) => a.author_id === author.id);

  return (
    <div className="shell py-14">
      <header className="flex flex-wrap items-center gap-6">
        {author.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={author.avatar_url} alt={`Photograph of ${author.name}`} className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="h-20 w-20 rounded-full bg-parchment-deep" aria-hidden />
        )}
        <div>
          <h1 className="text-title">{author.name}</h1>
          {author.role_title && <p className="mt-1 eyebrow">{author.role_title}</p>}
        </div>
      </header>

      {author.bio && <p className="mt-6 max-w-prose leading-relaxed text-slate">{author.bio}</p>}

      {Object.keys(author.social_links ?? {}).length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-3 text-sm">
          {Object.entries(author.social_links).map(([k, v]) => (
            <li key={k}><a href={v} target="_blank" rel="noopener noreferrer" className="link-underline">{k}</a></li>
          ))}
        </ul>
      )}

      <h2 className="mt-14 text-[1.3rem]">Published articles</h2>
      {theirs.length ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {theirs.map((a) => <ArticleCard key={a.id} article={a} />)}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState title="Nothing published yet" body="This author does not have any published articles at the moment." />
        </div>
      )}
    </div>
  );
}
