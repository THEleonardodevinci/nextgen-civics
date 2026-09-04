'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TeamMember } from '@/types/db';
import { EmptyState } from '@/components/ui/primitives';

/**
 * About Us carousel. Data comes from the team_members table (Admin → Team),
 * so adding a person never requires touching this file.
 * Scroll-snap carriage: native touch/swipe and keyboard scrolling for free.
 */
export default function TeamCarousel({ members }: { members: TeamMember[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const total = Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth));
    setPages(total);
    setPage(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, members.length]);

  const scrollBy = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
  };

  if (!members.length) {
    return (
      <section id="about" className="shell py-20">
        <p className="eyebrow">About us</p>
        <h2 className="mt-3 text-title">The people behind this</h2>
        <div className="mt-8">
          <EmptyState
            title="No team members yet"
            body="Add people in Admin → Team. Each entry needs a name, role, and a short biography."
          />
        </div>
      </section>
    );
  }

  return (
    <section id="about" className="shell scroll-mt-24 py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">About us</p>
          <h2 className="mt-3 text-title">The people behind this</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => scrollBy(-1)} className="btn-secondary px-3 py-2" aria-label="Previous team members">←</button>
          <button onClick={() => scrollBy(1)} className="btn-secondary px-3 py-2" aria-label="Next team members">→</button>
        </div>
      </div>

      <ul
        ref={trackRef}
        onScroll={measure}
        className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3
                   [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Team members"
      >
        {members.map((m) => (
          <li
            key={m.id}
            className="w-[85%] shrink-0 snap-start sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.7rem)]"
          >
            <article className="card h-full p-6">
              <div className="flex items-center gap-4">
                {m.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photo_url} alt={`Photograph of ${m.name}`}
                       className="h-14 w-14 rounded-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-parchment-deep
                                  font-display text-lg text-slate" aria-hidden>
                    {m.name.replace(/\[|\]/g, '').trim().charAt(0) || '?'}
                  </div>
                )}
                <div>
                  <h3 className="text-[1.05rem] leading-tight">{m.name}</h3>
                  <p className="mt-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">
                    {m.role_title}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate">{m.bio}</p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm">
                {m.email && <a className="link-underline" href={`mailto:${m.email}`}>Email</a>}
                {m.website_url && (
                  <a className="link-underline" href={m.website_url} target="_blank" rel="noopener noreferrer">Website</a>
                )}
                {m.linkedin_url && (
                  <a className="link-underline" href={m.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn</a>
                )}
                {Object.entries(m.social_links ?? {}).map(([k, v]) => (
                  <a key={k} className="link-underline" href={v} target="_blank" rel="noopener noreferrer">{k}</a>
                ))}
              </div>
            </article>
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <div className="mt-4 flex gap-1.5" role="tablist" aria-label="Carousel pages">
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === page}
              aria-label={`Go to page ${i + 1}`}
              onClick={() => trackRef.current?.scrollTo({ left: i * trackRef.current.clientWidth, behavior: 'smooth' })}
              className={`h-1.5 rounded-full transition-all ${i === page ? 'w-7 bg-ink' : 'w-1.5 bg-parchment-edge'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
