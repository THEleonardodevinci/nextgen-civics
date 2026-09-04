import Link from 'next/link';
import { getPublicFigures, getFigureCounts, getSetting } from '@/lib/queries';
import { CANDIDATE_STATUS_LABEL, INCLUSION_BASIS_LABEL } from '@/types/db';
import { Badge, SampleDataBadge, LastVerifiedBadge } from '@/components/ui/primitives';
import { listingDisclaimer } from '@/data/site-content';

export const metadata = {
  title: 'Candidate directory',
  description:
    'Independent and third-party candidates and officeholders, listed by objective criteria. Inclusion is not an endorsement.',
};

export const dynamic = 'force-dynamic';

type Policy = {
  heading: string;
  criteria: string[];
  exclusions: string[];
  note?: string;
};

const AFFILIATIONS = [
  { value: '', label: 'All' },
  { value: 'independent', label: 'Independent' },
  { value: 'third_party', label: 'Third party' },
  { value: 'other', label: 'Other' },
];

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: { state?: string; affiliation?: string; q?: string };
}) {
  const [figures, counts, policy] = await Promise.all([
    getPublicFigures(searchParams),
    getFigureCounts(),
    getSetting<Policy | null>('directory_policy', null),
  ]);

  // Group by state so the page reads as a directory rather than a ranked list.
  const byState = new Map<string, typeof figures>();
  for (const f of figures) {
    if (!byState.has(f.state_code)) byState.set(f.state_code, []);
    byState.get(f.state_code)!.push(f);
  }

  return (
    <div className="shell py-14">
      <p className="eyebrow">Directory</p>
      <h1 className="mt-3 text-title">Independent &amp; third-party candidates</h1>
      <p className="mt-4 max-w-prose text-[1.05rem] leading-relaxed text-slate">
        Most coverage treats the two major parties as the whole field. This directory lists the rest —
        people running for, or holding, federal office outside them.
      </p>

      {policy && (
        <details className="card mt-8 max-w-prose p-5">
          <summary className="cursor-pointer font-display text-[1.05rem] text-ink">
            {policy.heading}
          </summary>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate">
            {policy.criteria.map((c) => (
              <li key={c} className="flex gap-2">
                <span aria-hidden className="text-civic">·</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
          <ul className="mt-4 space-y-2 border-t border-parchment-edge pt-4 text-sm leading-relaxed text-slate">
            {policy.exclusions.map((c) => (
              <li key={c} className="flex gap-2">
                <span aria-hidden className="text-burgundy">·</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
          {policy.note && <p className="mt-4 text-sm leading-relaxed text-slate-light">{policy.note}</p>}
        </details>
      )}

      {/* A plain GET form: filtering works with JavaScript disabled. */}
      <form className="mt-8 flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="q">Name</label>
          <input id="q" name="q" defaultValue={searchParams.q ?? ''} className="field w-48" />
        </div>
        <div>
          <label className="label" htmlFor="state">State</label>
          <input id="state" name="state" maxLength={2} placeholder="IL"
                 defaultValue={searchParams.state ?? ''} className="field w-24 uppercase" />
        </div>
        <div>
          <label className="label" htmlFor="affiliation">Affiliation</label>
          <select id="affiliation" name="affiliation" defaultValue={searchParams.affiliation ?? ''}
                  className="field w-44">
            {AFFILIATIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        <button className="btn-secondary">Filter</button>
        {(searchParams.q || searchParams.state || searchParams.affiliation) && (
          <Link href="/candidates" className="link-underline text-sm">Clear</Link>
        )}
      </form>

      {figures.length === 0 ? (
        <div className="card mt-10 max-w-prose p-6">
          <p className="font-display text-lg text-ink">No listings yet</p>
          {counts.pending > 0 ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-slate">
                {counts.pending} imported {counts.pending === 1 ? 'record is' : 'records are'} waiting
                on verification. Listings stay private until an editor confirms ballot access with the
                relevant state election authority, so nothing here is published on the strength of an
                FEC filing alone.
              </p>
              <p className="mt-3 text-sm text-slate">
                Editors: review them under{' '}
                <Link href="/admin/political-figures" className="link-underline">
                  Admin → Political figures
                </Link>.
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-slate">
              No records match. Try clearing the filters.
            </p>
          )}
        </div>
      ) : (
        <>
          <p className="mt-8 font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">
            {figures.length} {figures.length === 1 ? 'listing' : 'listings'} across {byState.size}{' '}
            {byState.size === 1 ? 'state' : 'states'} · listed alphabetically, order carries no meaning
          </p>

          <div className="mt-6 space-y-10">
            {[...byState.entries()].map(([state, list]) => (
              <section key={state}>
                <h2 className="border-b border-parchment-edge pb-2 font-mono text-[0.75rem] uppercase tracking-wider text-ink">
                  {state}
                </h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((f) => (
                    <li key={f.id}>
                      <Link
                        href={`/districts/${(f.district_code ?? '').toLowerCase()}/${f.slug}`}
                        className="card-interactive block h-full p-4"
                      >
                        <p className="font-display text-[1.05rem] text-ink">{f.name}</p>
                        <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">
                          {f.district_code ?? f.state_code}
                          {f.party ? ` · ${f.party}` : ''}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <Badge tone="neutral">{CANDIDATE_STATUS_LABEL[f.candidate_status]}</Badge>
                          <Badge tone="info">{INCLUSION_BASIS_LABEL[f.inclusion_basis]}</Badge>
                          {f.is_sample && <SampleDataBadge />}
                        </div>
                        {f.last_verified && (
                          <div className="mt-2">
                            <LastVerifiedBadge date={f.last_verified} />
                          </div>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      <p className="mt-12 max-w-prose border-t border-parchment-edge pt-6 text-sm leading-relaxed text-slate-light">
        {listingDisclaimer} This directory is not filtered by ideology, and listings are not ranked.{' '}
        <Link href="/editorial-standards" className="link-underline">Read the editorial standards</Link>.
      </p>
    </div>
  );
}
