'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/account';

  const [mode, setMode] = useState<'signin' | 'reset'>('signin');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(''); setBusy(true);
    const form = new FormData(e.currentTarget);
    const { error } = await createClient().auth.signInWithPassword({
      email: String(form.get('email')),
      password: String(form.get('password')),
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.push(next);
    router.refresh();
  }

  async function sendReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(''); setBusy(true);
    const form = new FormData(e.currentTarget);
    const { error } = await createClient().auth.resetPasswordForEmail(String(form.get('email')), {
      redirectTo: `${window.location.origin}/account/reset-password`,
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setNotice('If that address has an account, a reset link is on its way.');
  }

  return (
    <div className="shell flex max-w-md flex-col py-20">
      <h1 className="text-title">{mode === 'signin' ? 'Sign in' : 'Reset your password'}</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate">
        You do not need an account to read anything on this site. Accounts exist so you can save
        articles, resources, and a district.
      </p>

      {mode === 'signin' ? (
        <form onSubmit={signIn} className="card mt-8 p-6">
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="field" />

          <label className="label mt-4" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="field" />

          {error && <p className="mt-4 text-sm text-burgundy" role="alert">{error}</p>}

          <button type="submit" disabled={busy} className="btn-primary mt-6 w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <button type="button" onClick={() => { setMode('reset'); setError(''); }}
                  className="link-underline mt-4 block text-sm">
            Forgot your password?
          </button>
        </form>
      ) : (
        <form onSubmit={sendReset} className="card mt-8 p-6">
          <label className="label" htmlFor="reset-email">Email</label>
          <input id="reset-email" name="email" type="email" required autoComplete="email" className="field" />
          {error && <p className="mt-4 text-sm text-burgundy" role="alert">{error}</p>}
          {notice && <p className="mt-4 text-sm text-ink" role="status">{notice}</p>}
          <button type="submit" disabled={busy} className="btn-primary mt-6 w-full">
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
          <button type="button" onClick={() => { setMode('signin'); setError(''); setNotice(''); }}
                  className="link-underline mt-4 block text-sm">
            Back to sign in
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-slate">
        No account yet? <Link href="/signup" className="link-underline">Create one</Link>.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginForm /></Suspense>;
}
