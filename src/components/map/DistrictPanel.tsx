'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { District, PoliticalFigure } from '@/types/db';
import { fmtDate, fmtMoney, fmtNumber } from '@/lib/format';
import { listingDisclaimer } from '@/data/site-content';
import { EmptyState, LoadingSkeleton, SourceCitation } from '@/components/ui/primitives';
import FigureCard from '@/components/map/FigureCard';

/**
 * Desktop: a side panel. Mobile: a bottom sheet. Same component, so the two
 * layouts can never drift apart.
 */
export default function DistrictPanel({
  code, onClose, variant,
}: { code: string | null; onClose: () => void; variant: 'panel' | 'sheet' }) {
  const [district, setDistrict] = useState<District | null>(null);
  const [figures, setFigures] = useState<PoliticalFigure[] | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [showFigures, setShowFigures] = useState(false);

  useEffect(() => {
    if (!code) { setState('idle'); return; }
    let cancelled = false;
    setState('loading');
    setShowFigures(false);

    (async () => {
      const supabase = createClient();
      const [{ data: d, error: de }, { data: f }] = await Promise.all([
        supabase.from('districts').select('*').eq('district_code', code).maybeSingle(),
        supabase.from('political_figures').select('*')
          .eq('district_code', code).neq('state', 'inactive').order('name'),
      ]);
      if (cancelled) return;
      if (de) { setState('error'); return; }
      setDistrict(d as District | null);
      setFigures((f as PoliticalFigure[]) ?? []);
      setState('ready');
      void supabase.rpc('record_event', { p_type: 'district_select', p_key: code });
    })();

    return () => { cancelled = true; };
  }, [code]);

  if (!code) {
    return variant === 'panel' ? (
      <aside className="card flex h-full items-center justify-center p-8 text-center">
        <div>
          <p className="font-display text-lg text-ink">Select a district</p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate">
            Click any district on the map, or search by ZIP code above, to see its statistics and
            listed independent and third-party figures.
          </p>
        </div>
      </aside>
    ) : null;
  }

  const rows: [string, string | null][] = district
    ? [
        ['State', district.state_name],
        ['District', district.district_number === 'AL' ? 'At-large' : `District ${Number(district.district_number)}`],
        ['Population', fmtNumber(district.population)],
        ['Voting age population', fmtNumber(district.voting_age_population)],
        ['Median household income', fmtMoney(district.median_household_income)],
        ['Classification', district.urban_rural],
        ['Current U.S. House member', district.house_member],
        ['Party', district.house_member_party],
        ['Recent turnout', district.recent_turnout_pct ? `${district.recent_turnout_pct}%` : null],
      ]
    : [];

  const present = rows.filter(([, v]) => v !== null && v !== undefined && v !== '');

  const body = (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-4 border-b border-parchment-edge p-5">
        <div>
          <p className="eyebrow">{code}</p>
          <h2 className="mt-1.5 font-display text-xl text-ink">
            {district ? `${district.state_name} — ${district.district_number === 'AL' ? 'At-large' : `District ${Number(district.district_number)}`}` : code}
          </h2>
        </div>
        <button onClick={onClose} className="btn-quiet" aria-label="Close district panel">✕</button>
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        {state === 'loading' && <LoadingSkeleton rows={4} />}

        {state === 'error' && (
          <p className="text-sm text-burgundy" role="alert">
            District information could not be loaded.
          </p>
        )}

        {state === 'ready' && !district && (
          <EmptyState
            title="No record for this district yet"
            body="This district exists on the map but has no statistics entered. An administrator can add them under Admin → Districts."
          />
        )}

        {state === 'ready' && district && (
          <>
            <dl className="divide-y divide-parchment-edge">
              {present.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">{k}</dt>
                  <dd className="text-right text-[0.95rem] text-ink">{v}</dd>
                </div>
              ))}
            </dl>

            {present.length <= 2 && (
              <p className="mt-4 rounded-[3px] border border-parchment-edge bg-parchment-deep px-3 py-2 text-sm text-slate">
                Statistics for this district have not been entered yet. Only verified figures are shown.
              </p>
            )}

            {district.notes && <p className="mt-4 text-sm leading-relaxed text-slate">{district.notes}</p>}

            <p className="mt-4 font-mono text-[0.65rem] uppercase tracking-wider text-slate-faint">
              Last updated {fmtDate(district.last_updated)}
            </p>

            <div className="mt-5">
              <SourceCitation sources={district.data_sources ?? []} label="Data sources" />
            </div>

            <button onClick={() => setShowFigures((v) => !v)} className="btn-primary mt-6 w-full">
              {showFigures ? 'Hide' : 'View'} third-party &amp; independent options
            </button>

            {showFigures && (
              <div className="mt-5">
                <p className="rounded-[3px] border border-gold/35 bg-gold-wash px-3 py-2 text-sm leading-relaxed text-ink">
                  {listingDisclaimer}
                </p>

                {figures && figures.length > 0 ? (
                  <ul className="mt-4 space-y-3">
                    {figures.map((f) => (
                      <li key={f.id}><FigureCard figure={f} districtCode={code} /></li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-4">
                    <EmptyState
                      title="No verified listing yet"
                      body="We don't currently have a verified listing for this district. We would rather show nothing than show something unverified."
                      action={{ label: 'Report a missing listing', href: '/corrections' }}
                    />
                  </div>
                )}
              </div>
            )}

            <Link href={`/districts/${code.toLowerCase()}`} className="btn-secondary mt-5 w-full">
              Open the full district page
            </Link>
          </>
        )}
      </div>
    </div>
  );

  if (variant === 'sheet') {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        <div className="max-h-[75vh] overflow-hidden rounded-t-xl border-t border-parchment-edge bg-white shadow-lift">
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-parchment-edge" aria-hidden />
          <div className="max-h-[72vh] overflow-y-auto">{body}</div>
        </div>
      </div>
    );
  }

  return <aside className="card h-full overflow-hidden">{body}</aside>;
}
