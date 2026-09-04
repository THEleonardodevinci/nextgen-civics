import { createClient } from '@/lib/supabase/server';
import type {
  ArticleWithRelations, District, PoliticalFigure, Resource,
  ResourceCategory, TeamMember,
} from '@/types/db';
import type { Stat } from '@/components/home/Statistics';
import { fallbackStatistics } from '@/data/site-content';

const ARTICLE_SELECT = `
  *,
  author:authors(*),
  category:categories(*),
  article_tags(tag:tags(*))
`;

type RawArticle = Omit<ArticleWithRelations, 'tags'> & {
  article_tags: { tag: { id: string; name: string; slug: string } }[];
};

const shape = (row: RawArticle): ArticleWithRelations => ({
  ...row,
  tags: (row.article_tags ?? []).map((t) => t.tag).filter(Boolean),
});

export async function getPublishedArticles(opts: {
  limit?: number; offset?: number; tag?: string; category?: string; q?: string; featuredOnly?: boolean;
} = {}) {
  const supabase = createClient();
  let query = supabase
    .from('articles')
    .select(ARTICLE_SELECT, { count: 'exact' })
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false });

  if (opts.featuredOnly) query = query.eq('featured', true);
  if (opts.category) query = query.eq('categories.slug', opts.category);
  if (opts.q) query = query.or(`title.ilike.%${opts.q}%,excerpt.ilike.%${opts.q}%`);
  if (opts.limit) query = query.range(opts.offset ?? 0, (opts.offset ?? 0) + opts.limit - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  let articles = (data as unknown as RawArticle[]).map(shape);
  // Tag filtering happens here because PostgREST cannot filter on a
  // many-to-many relation without a view.
  if (opts.tag) articles = articles.filter((a) => a.tags.some((t) => t.slug === opts.tag));

  return { articles, count: count ?? articles.length };
}

export async function getArticleBySlug(slug: string): Promise<ArticleWithRelations | null> {
  const supabase = createClient();
  const { data } = await supabase.from('articles').select(ARTICLE_SELECT).eq('slug', slug).maybeSingle();
  return data ? shape(data as unknown as RawArticle) : null;
}

/**
 * Related articles, scored rather than random: shared tags weigh most,
 * then shared category, then recency as a tiebreaker.
 */
export async function getRelatedArticles(article: ArticleWithRelations, limit = 4) {
  const { articles } = await getPublishedArticles({ limit: 40 });
  const tagSlugs = new Set(article.tags.map((t) => t.slug));

  return articles
    .filter((a) => a.id !== article.id)
    .map((a) => {
      const sharedTags = a.tags.filter((t) => tagSlugs.has(t.slug)).length;
      const sameCategory = a.category_id && a.category_id === article.category_id ? 1 : 0;
      const ageDays = a.published_at
        ? (Date.now() - new Date(a.published_at).getTime()) / 86_400_000
        : 999;
      return { a, score: sharedTags * 10 + sameCategory * 4 + Math.max(0, 3 - ageDays / 120) };
    })
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((x) => x.a);
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('team_members').select('*').eq('active', true).order('display_order');
  return (data as TeamMember[]) ?? [];
}

export async function getResources() {
  const supabase = createClient();
  const [{ data: categories }, { data: resources }] = await Promise.all([
    supabase.from('resource_categories').select('*').order('sort_order'),
    supabase.from('resources').select('*').eq('active', true).order('sort_order'),
  ]);
  return {
    categories: (categories as ResourceCategory[]) ?? [],
    resources: (resources as Resource[]) ?? [],
  };
}

export async function getDistrict(code: string): Promise<District | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('districts').select('*').eq('district_code', code.toUpperCase()).maybeSingle();
  return (data as District) ?? null;
}

export async function getFiguresForDistrict(code: string): Promise<PoliticalFigure[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('political_figures')
    .select('*')
    .eq('district_code', code.toUpperCase())
    // Only verified listings are public. Records imported from the FEC arrive
    // as 'needs_verification' and stay invisible until an editor confirms
    // ballot access. Unverified records are visible in the admin dashboard.
    .eq('state', 'active')
    .order('name');
  return (data as PoliticalFigure[]) ?? [];
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const supabase = createClient();
  const { data } = await supabase.from('site_settings').select('value').eq('key', key).maybeSingle();
  return (data?.value as T) ?? fallback;
}

export async function getStatistics(): Promise<Stat[]> {
  return getSetting<Stat[]>('statistics', fallbackStatistics as unknown as Stat[]);
}

export async function getVerificationWindow(): Promise<number> {
  return getSetting<number>('verification_window_days', 180);
}


export type FigureFilter = {
  state?: string;
  affiliation?: string;
  q?: string;
};

/** Verified, publicly listed political figures across all districts. */
export async function getPublicFigures(filter: FigureFilter = {}) {
  const supabase = createClient();
  let query = supabase
    .from('political_figures')
    .select('*')
    .eq('state', 'active')
    .order('state_code')
    .order('name')
    .limit(1000);

  if (filter.state) query = query.eq('state_code', filter.state.toUpperCase());
  if (filter.affiliation) query = query.eq('affiliation_type', filter.affiliation);
  if (filter.q) query = query.ilike('name', `%${filter.q}%`);

  const { data } = await query;
  return (data as PoliticalFigure[]) ?? [];
}

/** How many verified listings exist, for the empty-state message. */
export async function getFigureCounts() {
  const supabase = createClient();
  const [active, pending] = await Promise.all([
    supabase.from('political_figures').select('*', { count: 'exact', head: true }).eq('state', 'active'),
    supabase.from('political_figures').select('*', { count: 'exact', head: true }).eq('state', 'needs_verification'),
  ]);
  return { active: active.count ?? 0, pending: pending.count ?? 0 };
}
