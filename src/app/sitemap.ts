import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { org } from '@/data/site-content';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();

  const [{ data: articles }, { data: districts }, { data: authors }, { data: figures }] = await Promise.all([
    supabase.from('articles').select('slug, updated_at').eq('status', 'published'),
    supabase.from('districts').select('district_code, updated_at'),
    supabase.from('authors').select('slug').eq('active', true),
    supabase.from('political_figures').select('slug, district_code, updated_at').neq('state', 'inactive'),
  ]);

  const staticRoutes = [
    '', '/districts', '/articles', '/resources', '/contact',
    '/editorial-standards', '/corrections', '/privacy', '/terms',
    '/accessibility', '/conversation-guide',
  ].map((path) => ({
    url: `${org.url}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.7,
  }));

  return [
    ...staticRoutes,
    ...((articles ?? []) as { slug: string; updated_at: string }[]).map((a) => ({
      url: `${org.url}/articles/${a.slug}`,
      lastModified: new Date(a.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...((districts ?? []) as { district_code: string; updated_at: string }[]).map((d) => ({
      url: `${org.url}/districts/${d.district_code.toLowerCase()}`,
      lastModified: new Date(d.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...((figures ?? []) as { slug: string; district_code: string | null; updated_at: string }[])
      .filter((f) => f.district_code)
      .map((f) => ({
        url: `${org.url}/districts/${f.district_code!.toLowerCase()}/${f.slug}`,
        lastModified: new Date(f.updated_at),
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      })),
    ...((authors ?? []) as { slug: string }[]).map((a) => ({
      url: `${org.url}/authors/${a.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    })),
  ];
}
