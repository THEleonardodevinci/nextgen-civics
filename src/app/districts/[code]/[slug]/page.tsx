import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { PoliticalFigure } from '@/types/db';
import { CANDIDATE_STATUS_LABEL, INCLUSION_BASIS_LABEL } from '@/types/db';
import { fmtDate } from '@/lib/format';
import { listingDisclaimer, org } from '@/data/site-content';
import { Badge, Disclaimer, LastVerifiedBadge, SampleDataBadge, SourceCitation } from '@/components/ui/primitives';

export const revalidate = 600;

type Props = { params: { code: string; slug: string } };

async function getFigure(code: string, slug: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('political_figures').select('*')
    .eq('district_code', code.toUpperCase()).eq('slug', slug)
    .neq('state', 'inactive').maybeSingle();
  return (data as PoliticalFigure) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const f = await getFigure(params.code, params.slug);
  if (!f) return { title: 'Listing not found' };
  return {
    title: f.name,
    description: `Neutral informational listing for ${f.name}, ${f.party ?? 'unaffiliated'}, ${f.district_code}. Listing does not constitute an endorsement.`,
    alternates: { canonical: `${org.url}/districts/${params.code}/${params.slug}` },
  };
}

export default async function FigurePage({ params }: Props) {
  const figure = await getFigure(params.code, params.slug);
  if (!figure) notFound();

  const contact: [string, string | null, string | null][] = [
    ['Official website', figure.website_url, figure.website_url],
    ['Campaign website', figure.campaign_url, figure.campaign_url],
    ['Email', figure.email, figure.email ? `mailto:${figure.email}` : null],
    ['Phone', figure.phone, figure.phone ? `tel:${figure.phone.replace(/[^\d+]/g, '')}` : null],
    ['Mailing address', figure.mailing_address, null],
  ];
  const contactRows = contact.filter(([, v]) => v);

  return (
    <div className="shell max-w-4xl py-14">
      <nav aria-label="Breadcrumb" className="font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">
        <Link href="/districts" className="hover:text-ink">Districts</Link>
        <span aria-hidden> / </span>
        <Link href={`/districts/${params.code}`} className="hover:text-ink">{figure.district_code}</Link>
        <span aria-hidden> / </span>
        <span className="text-ink">{figure.name}</span>
      </nav>

      <header className="mt-6 flex flex-wrap items-start gap-6">
        {figure.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={figure.image_url} alt={`Photograph of ${figure.name}`}
               className="h-24 w-24 rounded-full object-cover" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-parchment-deep
                          font-display text-2xl text-slate" aria-hidden>
            {figure.name.replace(/\[[^\]]*\]/g, '').trim().charAt(0) || '?'}
          </div>
        )}
        <div className="min-w-[240px] flex-1">
          <h1 className="text-title">{figure.name}</h1>
          <p className="mt-2 text-[1.05rem] text-slate">
            {figure.party ?? 'Unaffiliated'}{figure.office ? ` · ${figure.office}` : ''}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone="info">{CANDIDATE_STATUS_LABEL[figure.candidate_status]}</Badge>
            <Badge tone="neutral">{figure.district_code}</Badge>
            {figure.is_sample && <SampleDataBadge />}
            <LastVerifiedBadge date={figure.last_verified} />
          </div>
        </div>
      </header>

      <div className="mt-8"><Disclaimer>{listingDisclaimer}</Disclaimer></div>

      {figure.bio && (
        <section className="mt-10">
          <h2 className="text-[1.3rem]">Biography</h2>
          <p className="mt-3 max-w-prose leading-relaxed text-slate">{figure.bio}</p>
        </section>
      )}

      {contactRows.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[1.3rem]">Public contact information</h2>
          <dl className="mt-4 divide-y divide-parchment-edge border-y border-parchment-edge">
            {contactRows.map(([k, v, href]) => (
              <div key={k} className="flex flex-wrap items-baseline justify-between gap-3 py-3">
                <dt className="font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">{k}</dt>
                <dd className="text-right text-ink">
                  {href ? (
                    <a href={href} target={href.startsWith('http') ? '_blank' : undefined}
                       rel="noopener noreferrer" className="link-underline break-all">{v}</a>
                  ) : v}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {Object.keys(figure.social_links ?? {}).length > 0 && (
        <section className="mt-10">
          <h2 className="text-[1.3rem]">Public accounts</h2>
          <ul className="mt-3 flex flex-wrap gap-3">
            {Object.entries(figure.social_links).map(([k, v]) => (
              <li key={k}>
                <a href={v} target="_blank" rel="noopener noreferrer" className="badge border-parchment-edge text-slate hover:border-ink hover:text-ink">
                  {k}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        {figure.stated_positions?.length > 0 && (
          <section className="mt-12">
            <h2 className="text-[1.3rem]">In their own words</h2>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate">
              Positions as this candidate has stated them, with a link to where they said it. We do
              not summarize, score, or characterize anyone&rsquo;s views.
            </p>
            <dl className="mt-5 space-y-5">
              {figure.stated_positions.map((pos, i) => (
                <div key={i} className="border-l-2 border-parchment-edge pl-4">
                  <dt className="font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">
                    {pos.topic}
                  </dt>
                  <dd className="mt-1.5 max-w-prose leading-relaxed text-slate">
                    {pos.statement}
                    {pos.sourceUrl && (
                      <>
                        {' '}
                        <a href={pos.sourceUrl} target="_blank" rel="noopener noreferrer nofollow"
                           className="link-underline whitespace-nowrap text-[0.85em]">
                          source{pos.retrieved ? ` (${pos.retrieved})` : ''}
                        </a>
                      </>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section className="mt-12 rounded-md border border-parchment-edge bg-white p-5">
          <h2 className="font-mono text-[0.65rem] uppercase tracking-wider text-slate">
            Why this listing appears
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate">
            {INCLUSION_BASIS_LABEL[figure.inclusion_basis]}.{' '}
            {figure.verification_note}
          </p>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate">
            This directory is not filtered by ideology. Nobody is listed for being moderate or
            excluded for being far from the center.{' '}
            <Link href="/editorial-standards" className="link-underline">Read the inclusion policy</Link>.
          </p>
        </section>

        <SourceCitation sources={figure.source_urls ?? []} />
        <p className="mt-4 font-mono text-[0.65rem] uppercase tracking-wider text-slate-faint">
          Last verified {fmtDate(figure.last_verified)} · Record updated {fmtDate(figure.updated_at)}
        </p>
        <Link href="/corrections" className="link-underline mt-4 inline-block text-sm">Report an error</Link>
      </section>
    </div>
  );
}
