'use client';

import { useState } from 'react';

/** Explicit opt-in only. Creating an account never subscribes anyone. */
export default function Newsletter() {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState('sending');
    const res = await fetch('/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.get('email'),
        first_name: form.get('first_name') || null,
        consent: form.get('consent') === 'on',
        website: form.get('website') || '',
      }),
    });
    const json = await res.json();
    if (res.ok) { setState('done'); setMessage(json.message); }
    else { setState('error'); setMessage(json.error ?? 'Could not subscribe.'); }
  }

  return (
    <section className="border-t border-parchment-edge bg-parchment-deep">
      <div className="shell grid gap-8 py-16 md:grid-cols-[1fr_1fr]">
        <div>
          <p className="eyebrow">Stay informed</p>
          <h2 className="mt-3 text-title">An occasional email</h2>
          <p className="mt-4 max-w-md leading-relaxed text-slate">
            New articles and notable research, roughly monthly. No campaign messaging, no fundraising,
            and one-click unsubscribe in every message.
          </p>
        </div>

        {state === 'done' ? (
          <div className="card self-start p-6" role="status">
            <p className="font-display text-ink">Check your inbox</p>
            <p className="mt-2 text-sm text-slate">{message}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="card self-start p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="nl-first">First name (optional)</label>
                <input id="nl-first" name="first_name" className="field" autoComplete="given-name" />
              </div>
              <div>
                <label className="label" htmlFor="nl-email">Email</label>
                <input id="nl-email" name="email" type="email" required className="field" autoComplete="email" />
              </div>
            </div>

            {/* Honeypot: hidden from people, tempting to bots. */}
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

            <label className="mt-4 flex items-start gap-2.5 text-sm text-slate">
              <input type="checkbox" name="consent" required className="mt-0.5" />
              <span>Yes, send me the newsletter. I can unsubscribe at any time.</span>
            </label>

            {state === 'error' && <p className="mt-3 text-sm text-burgundy" role="alert">{message}</p>}

            <button type="submit" disabled={state === 'sending'} className="btn-primary mt-5 w-full">
              {state === 'sending' ? 'Subscribing…' : 'Subscribe'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
