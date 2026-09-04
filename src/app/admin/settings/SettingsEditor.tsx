'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Toast, type ToastState } from '@/components/admin/Toast';

type Setting = { key: string; value: unknown; description: string | null };

export default function SettingsEditor({ settings }: { settings: Setting[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, JSON.stringify(s.value, null, 2)]))
  );
  const [toast, setToast] = useState<ToastState>(null);

  async function save(key: string) {
    let parsed: unknown;
    try { parsed = JSON.parse(drafts[key]); }
    catch { setToast({ message: 'That is not valid JSON. Check for a trailing comma.', tone: 'bad' }); return; }

    const { error } = await createClient().from('site_settings').update({ value: parsed }).eq('key', key);
    setToast(error ? { message: error.message, tone: 'bad' } : { message: `${key} saved.`, tone: 'good' });
    if (!error) router.refresh();
  }

  return (
    <>
      <div className="mt-8 space-y-6">
        {settings.map((s) => (
          <div key={s.key} className="card p-5">
            <h2 className="font-mono text-sm text-ink">{s.key}</h2>
            {s.description && <p className="mt-1 text-sm text-slate">{s.description}</p>}
            <textarea
              className="field mt-3 font-mono text-xs"
              rows={Math.min(18, drafts[s.key].split('\n').length + 1)}
              value={drafts[s.key]}
              aria-label={`Value for ${s.key}`}
              onChange={(e) => setDrafts({ ...drafts, [s.key]: e.target.value })}
            />
            <button onClick={() => save(s.key)} className="btn-secondary mt-3">Save {s.key}</button>
          </div>
        ))}
      </div>
      <Toast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}
