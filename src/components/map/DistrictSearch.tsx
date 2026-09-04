'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface DistrictMatch {
  district_code: string;
  state_name: string;
  district_number: string;
  note?: string;
}

/**
 * Accepts a ZIP code, "Illinois 5", "IL-05", or a state name.
 * A ZIP that spans several districts returns all of them rather than
 * pretending the mapping is one-to-one.
 */
export default function DistrictSearch({ onPick }: { onPick: (code: string) => void }) {
  const [q, setQ] = useState('');
  const [matches, setMatches] = useState<DistrictMatch[] | null>(null);
  const [state, setState] = useState<'idle' | 'searching' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;

    setState('searching');
    setMatches(null);
    const supabase = createClient();

    try {
      // ---- ZIP code ----
      if (/^\d{5}$/.test(query)) {
        const { data } = await supabase
          .from('zip_districts')
          .select('district_code, districts(state_name, district_number)')
          .eq('zip', query);

        const rows = (data ?? []) as unknown as {
          district_code: string;
          districts: { state_name: string; district_number: string } | null;
        }[];

        if (!rows.length) {
          setState('done');
          setMatches([]);
          setMessage(
            `No district is recorded for ZIP ${query}. The ZIP-to-district crosswalk is populated by an administrator; try searching by state and district number instead.`
          );
          return;
        }

        setMatches(
          rows.map((r) => ({
            district_code: r.district_code,
            state_name: r.districts?.state_name ?? r.district_code.slice(0, 2),
            district_number: r.districts?.district_number ?? '',
            note: rows.length > 1 ? 'This ZIP code spans more than one district' : undefined,
          }))
        );
        setState('done');
        return;
      }

      // ---- "IL-05" / "IL 5" / "Illinois 5" / state name ----
      const codeMatch = query.toUpperCase().match(/^([A-Z]{2})[-\s]?(\d{1,2}|AL)$/);
      let dbQuery = supabase.from('districts').select('district_code, state_name, district_number');

      if (codeMatch) {
        const [, st, num] = codeMatch;
        const padded = num === 'AL' ? 'AL' : num.padStart(2, '0');
        dbQuery = dbQuery.eq('district_code', `${st}-${padded}`);
      } else {
        const named = query.match(/^(.*?)\s*(\d{1,2}|at[-\s]?large)?$/i);
        const statePart = (named?.[1] ?? query).trim();
        const numPart = named?.[2];
        dbQuery = dbQuery.ilike('state_name', `${statePart}%`);
        if (numPart) {
          const padded = /at/i.test(numPart) ? 'AL' : numPart.padStart(2, '0');
          dbQuery = dbQuery.eq('district_number', padded);
        }
      }

      const { data, error } = await dbQuery.order('district_code').limit(20);
      if (error) throw error;

      setMatches((data as DistrictMatch[]) ?? []);
      setMessage(
        (data ?? []).length
          ? ''
          : `Nothing matched "${query}". Try a five-digit ZIP code, a state name, or a code like IL-05.`
      );
      setState('done');
    } catch {
      setState('error');
      setMessage('District search is unavailable right now.');
    }
  }

  return (
    <div>
      <form onSubmit={search} className="flex flex-wrap gap-2">
        <div className="min-w-[200px] flex-1">
          <label className="label" htmlFor="district-q">Enter ZIP code or district</label>
          <input
            id="district-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="60521, Illinois 5, or IL-05"
            className="field"
            inputMode="search"
            autoComplete="postal-code"
          />
        </div>
        <button type="submit" className="btn-primary self-end" disabled={state === 'searching'}>
          {state === 'searching' ? 'Searching…' : 'Search'}
        </button>
      </form>

      {state === 'error' && <p className="mt-3 text-sm text-burgundy" role="alert">{message}</p>}

      {matches && matches.length > 0 && (
        <div className="mt-4">
          {matches[0].note && (
            <p className="mb-2 rounded-[3px] border border-gold/40 bg-gold-wash px-3 py-2 text-sm text-ink">
              {matches[0].note}. Select the one that covers your address.
            </p>
          )}
          <ul className="divide-y divide-parchment-edge overflow-hidden rounded-md border border-parchment-edge bg-white">
            {matches.map((m) => (
              <li key={m.district_code}>
                <button
                  onClick={() => onPick(m.district_code)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-parchment-deep"
                >
                  <span className="text-[0.95rem] text-ink">
                    {m.state_name}
                    {m.district_number === 'AL' ? ' — At-large' : ` — District ${Number(m.district_number)}`}
                  </span>
                  <span className="font-mono text-[0.7rem] text-slate-light">{m.district_code}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {matches && matches.length === 0 && message && (
        <p className="mt-3 text-sm text-slate">{message}</p>
      )}
    </div>
  );
}
