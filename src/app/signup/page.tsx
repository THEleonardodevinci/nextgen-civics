'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(''); setBusy(true);
    const form = new FormData(e.currentTarget);

    const { error } = await createClient().auth.signUp({
      email: String(form.get('email')),
      password: String(form.get('password')),
      options: {
        data: { display_name: String(form.get('display_name') || '') },
        emailRedirectTo: `${window.location.origin}/account`,
      },
    });

    setBusy(false);
    if (error) { setError(error.message); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="shell max-w-md py-20">
        <h1 className="text-title">Check your email</h1>
        <p className="mt-4 leading-relaxed text-slate">
          We sent a verification link. Open it to finish creating your account.
        </p>
        <Link href="/" className="btn-secondary mt-6">Back to the homepage</Link>
      </div>
    );
  }

  return (
    <div className="shell max-w-md py-20">
      <h1 className="text-title">Create an account</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate">
        We ask for an email and a password, and nothing else. We never ask for or infer political
        affiliation.
      </p>

      <form onSubmit={submit} className="card mt-8 p-6">
        <label className="label" htmlFor="display_name">Name (optional)</label>
        <input id="display_name" name="display_name" className="field" autoComplete="name" />

        <label className="label mt-4" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="field" />

        <label className="label mt-4" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required minLength={8}
               autoComplete="new-password" className="field" />
        <p className="mt-1.5 text-xs text-slate-light">At least 8 characters.</p>

        {error && <p className="mt-4 text-sm text-burgundy" role="alert">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary mt-6 w-full">
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate">
        Already have an account? <Link href="/login" className="link-underline">Sign in</Link>.
      </p>
    </div>
  );
}
