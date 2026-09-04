'use client';

import { useState } from 'react';

/**
 * Admin enrollment. The code is posted to a server route that compares it
 * against a scrypt hash held in an environment variable. No code, hash, or
 * comparison logic exists in the browser bundle.
 */
export default function AdminEnrollPage() {
  const [code, setCode] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    const res = await fetch('/api/admin/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const json = await res.json();
    setState(res.ok ? 'done' : 'error');
    setMessage(res.ok ? json.message : json.error);
    setCode('');
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-title">Administrator enrollment</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate">
        If you have been given an access code, enter it here to add staff permissions to the account
        you are already signed in with. Attempts are rate limited and logged.
      </p>

      {state === 'done' ? (
        <div className="card mt-8 p-6" role="status">
          <p className="font-display text-lg text-ink">Enrolled</p>
          <p className="mt-2 text-sm text-slate">{message}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="card mt-8 p-6">
          <label className="label" htmlFor="code">Access code</label>
          <input id="code" type="password" value={code} onChange={(e) => setCode(e.target.value)}
                 required minLength={8} className="field" autoComplete="off" />
          {state === 'error' && <p className="mt-4 text-sm text-burgundy" role="alert">{message}</p>}
          <button className="btn-primary mt-6 w-full" disabled={state === 'sending'}>
            {state === 'sending' ? 'Checking…' : 'Submit code'}
          </button>
        </form>
      )}
    </div>
  );
}
