import Link from 'next/link';
import type { PoliticalFigure } from '@/types/db';
import { CANDIDATE_STATUS_LABEL } from '@/types/db';
import { Badge, LastVerifiedBadge, SampleDataBadge } from '@/components/ui/primitives';

/**
 * Every figure renders through this one template so that candidates are
 * presented comparably and no listing can be visually favored.
 */
export default function FigureCard({
  figure, districtCode,
}: { figure: PoliticalFigure; districtCode: string }) {
  return (
    <article className="card p-4">
      <div className="flex gap-4">
        {figure.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={figure.image_url} alt={`Photograph of ${figure.name}`}
               className="h-14 w-14 shrink-0 rounded-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full
                          bg-parchment-deep font-display text-slate" aria-hidden>
            {figure.name.replace(/\[[^\]]*\]/g, '').trim().charAt(0) || '?'}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="text-[1.05rem] leading-tight">{figure.name}</h3>
          <p className="mt-1 text-sm text-slate">
            {figure.party ?? 'Unaffiliated'}
            {figure.office ? ` · ${figure.office}` : ''}
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone="info">{CANDIDATE_STATUS_LABEL[figure.candidate_status]}</Badge>
            {figure.is_sample && <SampleDataBadge />}
            <LastVerifiedBadge date={figure.last_verified} />
          </div>

          {figure.bio && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate">{figure.bio}</p>}

          <Link
            href={`/districts/${districtCode.toLowerCase()}/${figure.slug}`}
            className="link-underline mt-3 inline-block text-sm"
          >
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}
