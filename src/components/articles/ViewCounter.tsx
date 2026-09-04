'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Increments an aggregate counter. Deliberately records no user identifier,
 * so an administrator can see that an article is popular but never who read it.
 */
export default function ViewCounter({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `viewed:${slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    void createClient().rpc('increment_article_view', { p_slug: slug });
  }, [slug]);
  return null;
}
