'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/db';

export default function AccountForm({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.display_name ?? '');
  const [avatar, setAvatar] = useState(profile.avatar_url ?? '');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState('saving');
    const { error } = await createClient()
      .from('profiles')
      .update({ display_name: name || null, avatar_url: avatar || null })
      .eq('id', profile.id);

    if (error) { setState('error'); setMessage(error.message); return; }
    setState('saved');
    setMessage('Profile updated.');
  }

  return (
    <form onSubmit={save}>
      <label className="label" htmlFor="display_name">Display name</label>
      <input id="display_name" value={name} onChange={(e) => setName(e.target.value)} className="field" />

      <label className="label mt-4" htmlFor="avatar_url">Profile picture URL</label>
      <input id="avatar_url" value={avatar} onChange={(e) => setAvatar(e.target.value)}
             className="field" placeholder="https://…" inputMode="url" />

      {message && (
        <p className={`mt-3 text-sm ${state === 'error' ? 'text-burgundy' : 'text-ink'}`} role="status">
          {message}
        </p>
      )}

      <button className="btn-secondary mt-5 w-full" disabled={state === 'saving'}>
        {state === 'saving' ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}
