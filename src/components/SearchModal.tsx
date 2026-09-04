'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SearchHit } from '@/types/db';

const GROUPS: { kind: SearchHit['kind']; label: string }[] = [
  { kind: 'article', label: 'Articles' },
  { kind: 'figure', label: 'Political figures' },
  { kind: 'resource', label: 'Resources' },
];

export default function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'done'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || q.trim().length < 2) { setHits([]); setState('idle'); return; }
    let cancelled = false;
    setState('loading');
    const t = setTimeout(async () => {
      const { data, error } = await createClient().rpc('site_search', { q: q.trim(), per_group: 5 });
      if (cancelled) return;
      if (error) { setState('error'); return; }
      setHits((data ?? []) as SearchHit[]);
      setState('done');
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink-deep/40 p-4 pt-[10vh]">
      <button className="absolute inset-0 cursor-default" aria-label="Close search" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="relative w-full max-w-xl overflow-hidden rounded-md border border-parchment-edge bg-white shadow-lift"
      >
        <div className="flex items-center gap-3 border-b border-parchment-edge px-4">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden className="text-slate-light">
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
            <path d="m13.5 13.5 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search articles, figures, and resources"
            className="w-full bg-transparent py-4 text-[0.95rem] text-ink outline-none placeholder:text-slate-faint"
            aria-label="Search query"
          />
          <button onClick={onClose} className="font-mono text-[0.65rem] text-slate-light">ESC</button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2">
          {state === 'idle' && (
            <p className="p-6 text-center text-sm text-slate-light">Type at least two characters.</p>
          )}
          {state === 'loading' && (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((i) => <div key={i} className="skeleton h-11" />)}
            </div>
          )}
          {state === 'error' && (
            <div className="p-6 text-center text-sm">
              <p className="text-ink">Search is unavailable right now.</p>
              <button className="link-underline mt-2" onClick={() => setQ((v) => v + ' ')}>Try again</button>
            </div>
          )}
          {state === 'done' && hits.length === 0 && (
            <p className="p-6 text-center text-sm text-slate-light">
              No matches for &ldquo;{q}&rdquo;. Try a broader term.
            </p>
          )}
          {state === 'done' && GROUPS.map(({ kind, label }) => {
            const group = hits.filter((h) => h.kind === kind);
            if (!group.length) return null;
            return (
              <section key={kind} className="mb-2">
                <h2 className="eyebrow px-3 py-2">{label}</h2>
                <ul>
                  {group.map((h) => (
                    <li key={h.id}>
                      <Link
                        href={h.href}
                        onClick={onClose}
                        className="block rounded px-3 py-2 hover:bg-parchment-deep"
                      >
                        <span className="block text-[0.95rem] text-ink">{h.title}</span>
                        {h.subtitle && (
                          <span className="line-clamp-1 block text-sm text-slate-light">{h.subtitle}</span>
                        )}
                        {h.meta && <span className="font-mono text-[0.65rem] text-slate-faint">{h.meta}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
