'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/** Reached from the emailed reset link; Supabase has already set a session. */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError('');
    const form = new FormData(e.currentTarget);
    const { error } = await createClient().auth.updateUser({ password: String(form.get('password')) });
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.push('/account');
  }

  return (
    <div className="shell max-w-md py-20">
      <h1 className="text-title">Choose a new password</h1>
      <form onSubmit={submit} className="card mt-8 p-6">
        <label className="label" htmlFor="password">New password</label>
        <input id="password" name="password" type="password" required minLength={8}
               autoComplete="new-password" className="field" />
        {error && <p className="mt-4 text-sm text-burgundy" role="alert">{error}</p>}
        <button className="btn-primary mt-6 w-full" disabled={busy}>
          {busy ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </div>
  );
}
