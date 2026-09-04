import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/guards';
import ArticleEditor from './ArticleEditor';
import type { Author, Category, Tag, Article } from '@/types/db';

export default async function EditArticlePage({ searchParams }: { searchParams: { id?: string } }) {
  const profile = await requireRole('WRITER');
  const supabase = createClient();

  const [{ data: authors }, { data: categories }, { data: tags }] = await Promise.all([
    supabase.from('authors').select('*').order('name'),
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('tags').select('*').order('name'),
  ]);

  let article: (Article & { tagIds: string[] }) | null = null;
  if (searchParams.id) {
    const { data } = await supabase
      .from('articles').select('*, article_tags(tag_id)').eq('id', searchParams.id).maybeSingle();
    if (data) {
      const row = data as unknown as Article & { article_tags: { tag_id: string }[] };
      article = { ...row, tagIds: (row.article_tags ?? []).map((t) => t.tag_id) };
    }
  }

  return (
    <ArticleEditor
      role={profile.role}
      article={article}
      authors={(authors as Author[]) ?? []}
      categories={(categories as Category[]) ?? []}
      tags={(tags as Tag[]) ?? []}
    />
  );
}
