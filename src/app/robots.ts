import type { MetadataRoute } from 'next';
import { org } from '@/data/site-content';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/account', '/api'] }],
    sitemap: `${org.url}/sitemap.xml`,
  };
}
