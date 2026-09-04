'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function CorrectionForm() {
  const params = useSearchParams();
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('sending');
    const f = new FormData(e.currentTarget);
    const res = await fetch('/api/corrections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(f)),
    });
    const json = await res.json();
    setState(res.ok ? 'done' : 'error');
    setMessage(res.ok ? json.message : json.error);
  }

  return (
    <div className="shell max-w-2xl py-14">
      <h1 className="text-title">Corrections</h1>
      <p className="mt-4 leading-relaxed text-slate">
        Political information goes out of date quickly, and we get things wrong like anyone else. If
        you find an error — in an article, a district record, or a listing — tell us. Every report is
        reviewed by an editor, and substantive corrections are noted on the page they affect.
      </p>
      <p className="mt-4 text-sm text-slate">Name and email are optional. We only use them to follow up.</p>

      {state === 'done' ? (
        <div className="card mt-8 p-6" role="status">
          <p className="font-display text-lg text-ink">Report received</p>
          <p className="mt-2 text-sm text-slate">{message}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="card mt-8 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="submitter_name">Name (optional)</label>
              <input id="submitter_name" name="submitter_name" className="field" />
            </div>
            <div>
              <label className="label" htmlFor="submitter_email">Email (optional)</label>
              <input id="submitter_email" name="submitter_email" type="email" className="field" />
            </div>
          </div>

          <label className="label mt-4" htmlFor="page_url">Page or article URL</label>
          <input id="page_url" name="page_url" required className="field"
                 defaultValue={params.get('url') ?? ''} placeholder="https://…" />

          <label className="label mt-4" htmlFor="issue">What is wrong?</label>
          <textarea id="issue" name="issue" required rows={4} minLength={10} className="field" />

          <label className="label mt-4" htmlFor="suggested_correction">Suggested correction</label>
          <textarea id="suggested_correction" name="suggested_correction" rows={3} className="field" />

          <label className="label mt-4" htmlFor="source_url">Source supporting the correction</label>
          <input id="source_url" name="source_url" className="field" placeholder="https://…" />

          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

          {state === 'error' && <p className="mt-4 text-sm text-burgundy" role="alert">{message}</p>}

          <button className="btn-primary mt-6" disabled={state === 'sending'}>
            {state === 'sending' ? 'Sending…' : 'Submit correction'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function CorrectionsPage() {
  return <Suspense fallback={null}><CorrectionForm /></Suspense>;
}
