'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/** Saves an article or resource to the signed-in user's account. */
export default function BookmarkButton({
  targetType, targetId, label = 'Save',
}: { targetType: 'article' | 'resource'; targetId: string; label?: string }) {
  const [saved, setSaved] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setSignedIn(!!user);
      if (!user) return;
      const { data } = await supabase
        .from('bookmarks')
        .select('target_id')
        .eq('user_id', user.id)
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .maybeSingle();
      setSaved(!!data);
    })();
  }, [targetId, targetType]);

  if (signedIn === false) {
    return <a href="/login" className="btn-secondary px-4 py-2 text-sm">Sign in to save</a>;
  }

  async function toggle() {
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }
    if (saved) {
      await supabase.from('bookmarks').delete()
        .eq('user_id', user.id).eq('target_type', targetType).eq('target_id', targetId);
      setSaved(false);
    } else {
      await supabase.from('bookmarks')
        .insert({ user_id: user.id, target_type: targetType, target_id: targetId });
      setSaved(true);
    }
    setBusy(false);
  }

  return (
    <button onClick={toggle} disabled={busy} aria-pressed={saved}
            className="btn-secondary px-4 py-2 text-sm">
      {saved ? 'Saved' : label}
    </button>
  );
}
