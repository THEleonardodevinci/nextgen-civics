import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDistrict, getFiguresForDistrict } from '@/lib/queries';
import { fmtDate, fmtMoney, fmtNumber } from '@/lib/format';
import { listingDisclaimer, org } from '@/data/site-content';
import { Disclaimer, EmptyState, SourceCitation } from '@/components/ui/primitives';
import FigureCard from '@/components/map/FigureCard';

export const revalidate = 600;

type Props = { params: { code: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await getDistrict(params.code);
  if (!d) return { title: 'District not found' };
  const label = d.district_number === 'AL' ? 'At-large' : `District ${Number(d.district_number)}`;
  return {
    title: `${d.state_name} ${label}`,
    description: `Congressional district information for ${d.state_name} ${label}, including current representation and listed independent and third-party political figures.`,
    alternates: { canonical: `${org.url}/districts/${d.district_code.toLowerCase()}` },
  };
}

export default async function DistrictPage({ params }: Props) {
  const district = await getDistrict(params.code);
  if (!district) notFound();

  const figures = await getFiguresForDistrict(district.district_code);
  const label = district.district_number === 'AL' ? 'At-large' : `District ${Number(district.district_number)}`;

  const stats: [string, string | null][] = [
    ['Population', fmtNumber(district.population)],
    ['Voting age population', fmtNumber(district.voting_age_population)],
    ['Median household income', fmtMoney(district.median_household_income)],
    ['Classification', district.urban_rural],
    ['Recent turnout', district.recent_turnout_pct ? `${district.recent_turnout_pct}%` : null],
  ];
  const present = stats.filter(([, v]) => v);

  return (
    <div className="shell py-14">
      <nav aria-label="Breadcrumb" className="font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">
        <Link href="/districts" className="hover:text-ink">Districts</Link>
        <span aria-hidden> / </span>
        <span className="text-ink">{district.district_code}</span>
      </nav>

      <h1 className="mt-4 text-title">{district.state_name} — {label}</h1>
      <p className="mt-2 font-mono text-sm text-slate-light">{district.district_code}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          <section className="mb-12">
            <h2 className="text-[1.3rem]">Current U.S. House member</h2>
            {district.house_member ? (
              <div className="card mt-4 p-5">
                <p className="font-display text-[1.25rem] text-ink">{district.house_member}</p>
                {district.house_member_party && (
                  <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">
                    {district.house_member_party}
                  </p>
                )}
                <dl className="mt-4 space-y-2 text-sm">
                  {district.house_member_office && (
                    <div className="flex gap-3">
                      <dt className="w-24 shrink-0 font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">Office</dt>
                      <dd className="text-slate">{district.house_member_office}</dd>
                    </div>
                  )}
                  {district.house_member_phone && (
                    <div className="flex gap-3">
                      <dt className="w-24 shrink-0 font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">Phone</dt>
                      <dd><a href={`tel:${district.house_member_phone}`} className="link-underline">{district.house_member_phone}</a></dd>
                    </div>
                  )}
                  {district.house_member_url && (
                    <div className="flex gap-3">
                      <dt className="w-24 shrink-0 font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">Official site</dt>
                      <dd>
                        <a href={district.house_member_url} target="_blank" rel="noopener noreferrer" className="link-underline">
                          {district.house_member_url.replace(/^https?:\/\//, '')}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
                <p className="mt-4 text-xs leading-relaxed text-slate-light">
                  Listing an officeholder is not an endorsement. Contact details are the
                  Washington office as published by the House.
                </p>
              </div>
            ) : (
              <p className="card mt-4 p-5 text-sm leading-relaxed text-slate">
                This seat is currently vacant. {district.notes ?? ''}
              </p>
            )}
          </section>

          <section>
            <h2 className="text-[1.3rem]">District statistics</h2>
            {present.length ? (
              <dl className="mt-4 divide-y divide-parchment-edge border-y border-parchment-edge">
                {present.map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-4 py-3">
                    <dt className="font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">{k}</dt>
                    <dd className="text-right text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-slate">
                No verified statistics have been entered for this district yet. We show only figures we
                can source, so this section stays empty until then.
              </p>
            )}
            {district.notes && <p className="mt-5 leading-relaxed text-slate">{district.notes}</p>}
            <p className="mt-5 font-mono text-[0.65rem] uppercase tracking-wider text-slate-faint">
              Last updated {fmtDate(district.last_updated)}
            </p>
            <div className="mt-5"><SourceCitation sources={district.data_sources ?? []} label="Data sources" /></div>
          </section>

          <section className="mt-14">
            <h2 className="text-[1.3rem]">Independent &amp; third-party figures</h2>
            <div className="mt-4"><Disclaimer>{listingDisclaimer}</Disclaimer></div>

            {figures.length ? (
              <ul className="mt-5 space-y-3">
                {figures.map((f) => (
                  <li key={f.id}><FigureCard figure={f} districtCode={district.district_code} /></li>
                ))}
              </ul>
            ) : (
              <div className="mt-5">
                <EmptyState
                  title="No verified listing yet"
                  body="We don't currently have a verified listing for this district. If you know of one, tell us and we will source it."
                  action={{ label: 'Suggest a listing', href: '/corrections' }}
                />
              </div>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <h2 className="text-[1.05rem]">See it on the map</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate">
              Open the interactive explorer to compare this district with the ones around it.
            </p>
            <Link href="/districts" className="btn-secondary mt-4 w-full">Open the map</Link>
          </div>
          <div className="card mt-4 p-6">
            <h2 className="text-[1.05rem]">Something out of date?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate">
              Districts, officeholders, and contact details change often. Corrections are reviewed by an editor.
            </p>
            <Link href="/corrections" className="link-underline mt-3 inline-block text-sm">Report an error</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
