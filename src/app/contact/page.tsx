'use client';

import { useState } from 'react';

const CATEGORIES = [
  'General inquiry', 'Press', 'Partnership', 'Article question', 'Data correction', 'Technical problem',
];

export default function ContactPage() {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('sending');
    const f = new FormData(e.currentTarget);
    const res = await fetch('/api/contact', {
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
      <h1 className="text-title">Contact</h1>
      <p className="mt-4 leading-relaxed text-slate">
        Questions, press inquiries, and partnership proposals all land in the same inbox. Choosing a
        category helps route it faster.
      </p>

      {state === 'done' ? (
        <div className="card mt-8 p-6" role="status">
          <p className="font-display text-lg text-ink">Message sent</p>
          <p className="mt-2 text-sm text-slate">{message}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="card mt-8 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">Name</label>
              <input id="name" name="name" required className="field" autoComplete="name" />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required className="field" autoComplete="email" />
            </div>
          </div>

          <label className="label mt-4" htmlFor="category">Category</label>
          <select id="category" name="category" className="field" defaultValue="General inquiry">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>

          <label className="label mt-4" htmlFor="subject">Subject</label>
          <input id="subject" name="subject" className="field" />

          <label className="label mt-4" htmlFor="message">Message</label>
          <textarea id="message" name="message" required rows={6} minLength={20} className="field" />

          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

          {state === 'error' && <p className="mt-4 text-sm text-burgundy" role="alert">{message}</p>}

          <button className="btn-primary mt-6" disabled={state === 'sending'}>
            {state === 'sending' ? 'Sending…' : 'Send message'}
          </button>
        </form>
      )}
    </div>
  );
}
