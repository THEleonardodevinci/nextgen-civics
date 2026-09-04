'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { hero } from '@/data/site-content';

/**
 * Signature element: two distributions of opinion that begin far apart and
 * settle into overlap. It is the site's whole argument in one image —
 * disagreement remains (the peaks stay distinct) but the space between them
 * is populated. Explicitly labeled illustrative so nobody mistakes it for data.
 */
const W = 560;
const H = 240;
const PER_SIDE = 46;

function seeded(i: number) {
  const x = Math.sin(i * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

/** Box–Muller-ish sample from a seeded pair, clamped to the canvas. */
function bell(i: number, center: number, spread: number) {
  const u = Math.max(1e-6, seeded(i));
  const v = seeded(i + 999);
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return center + z * spread;
}

export default function Hero() {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setSettled(true); return; }
    const t = setTimeout(() => setSettled(true), 180);
    return () => clearTimeout(t);
  }, []);

  const dots = useMemo(() => {
    const out: { x0: number; x1: number; y: number; r: number; side: 0 | 1; delay: number }[] = [];
    for (let s = 0; s < 2; s++) {
      for (let i = 0; i < PER_SIDE; i++) {
        const id = s * 500 + i;
        // Start: tight clusters pinned to the edges. End: wider, overlapping.
        const startCenter = s === 0 ? W * 0.16 : W * 0.84;
        const endCenter = s === 0 ? W * 0.36 : W * 0.64;
        out.push({
          x0: bell(id, startCenter, W * 0.045),
          x1: bell(id, endCenter, W * 0.13),
          y: H * 0.22 + seeded(id + 77) * H * 0.6,
          r: 2 + seeded(id + 31) * 2.2,
          side: s as 0 | 1,
          delay: seeded(id + 13) * 500,
        });
      }
    }
    return out;
  }, []);

  return (
    <section className="relative overflow-hidden border-b border-parchment-edge">
      <div className="shell grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
        <div>
          <p className="eyebrow">{hero.eyebrow}</p>
          <h1 className="mt-5 text-display">{hero.headline}</h1>
          <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-slate">{hero.body}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href={hero.primaryCta.href} className="btn-primary">{hero.primaryCta.label}</Link>
            <Link href={hero.secondaryCta.href} className="btn-secondary">{hero.secondaryCta.label}</Link>
          </div>
        </div>

        <figure className="lg:justify-self-end">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full max-w-[560px]"
            role="img"
            aria-label="An abstract illustration: two groups of dots that begin clustered at opposite edges and then spread until they overlap in the middle, with distinct peaks remaining."
          >
            <defs>
              <linearGradient id="fade" x1="0" x2="1">
                <stop offset="0" stopColor="#DCD8CF" stopOpacity="0" />
                <stop offset=".5" stopColor="#DCD8CF" stopOpacity="1" />
                <stop offset="1" stopColor="#DCD8CF" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1="0" y1={H - 18} x2={W} y2={H - 18} stroke="url(#fade)" strokeWidth="1" />
            {dots.map((d, i) => (
              <circle
                key={i}
                cx={settled ? d.x1 : d.x0}
                cy={d.y}
                r={d.r}
                fill={d.side === 0 ? '#3E6FA3' : '#8C3A46'}
                opacity={settled ? 0.62 : 0.9}
                style={{
                  transition: `cx 1400ms cubic-bezier(.22,.61,.36,1) ${d.delay}ms, opacity 900ms ease ${d.delay}ms`,
                }}
              />
            ))}
          </svg>
          <figcaption className="mt-3 font-mono text-[0.65rem] uppercase tracking-wider text-slate-faint">
            Illustrative, not data
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
