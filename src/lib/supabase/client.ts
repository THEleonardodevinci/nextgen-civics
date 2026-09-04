'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser client. Uses the anon key only, which is safe to ship because
 * every table is protected by Row Level Security. The service-role key
 * must never appear in any file that reaches the browser.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
