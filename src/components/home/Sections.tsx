'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  actions, consequences, missionIntro, perspectiveTopics,
  pillars, polarizationConcepts, quickLinks,
} from '@/data/site-content';
import { SectionHeader, ExternalMark } from '@/components/ui/primitives';

/** Reusable disclosure. Keyboard operable, announces state. */
function Expandable({
  summary, children, meta,
}: { summary: string; children: React.ReactNode; meta?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <span>
          <span className="block font-display text-[1.05rem] text-ink">{summary}</span>
          {meta && <span className="mt-1 block text-sm leading-relaxed text-slate">{meta}</span>}
        </span>
        <span
          aria-hidden
          className="mt-1 shrink-0 font-mono text-[0.7rem] text-civic transition"
          style={{ transform: open ? 'rotate(45deg)' : 'none' }}
        >
          +
        </span>
      </button>
      {open && <div className="mt-4 border-t border-parchment-edge pt-4 text-sm leading-relaxed text-slate">{children}</div>}
    </div>
  );
}

export function MissionIntro() {
  return (
    <section className="shell py-20">
      <div className="grid gap-10 md:grid-cols-[minmax(0,22rem)_1fr]">
        <div>
          <p className="eyebrow">{missionIntro.eyebrow}</p>
          <h2 className="mt-3 text-title">{missionIntro.heading}</h2>
        </div>
        <div className="max-w-prose space-y-5 text-[1.05rem] leading-relaxed text-slate">
          {missionIntro.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </div>
    </section>
  );
}

export function PolarizationSection() {
  return (
    <section className="border-y border-parchment-edge bg-white/60">
      <div className="shell py-20">
        <SectionHeader
          id="polarization"
          eyebrow="The vocabulary"
          title="What is political polarization?"
          lede="The word covers several different things, and they do not move together. Separating them makes the problem smaller and more tractable than the single word suggests."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {polarizationConcepts.map((c) => (
            <Expandable key={c.id} summary={c.term} meta={c.short}>{c.detail}</Expandable>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ConsequencesSection() {
  return (
    <section className="shell py-20">
      <SectionHeader
        eyebrow="Why it matters"
        title="What extreme polarization costs"
        lede="These are the effects researchers most consistently associate with high partisan animosity. They compound, which is the part that makes them hard to reverse."
      />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {consequences.map((c) => (
          <article key={c.title} className="card p-6">
            <h3 className="text-[1.05rem]">{c.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate">{c.body}</p>
          </article>
        ))}
      </div>
      <p className="mt-10 max-w-prose text-[1.05rem] leading-relaxed text-slate">
        None of this is inevitable. The interventions with the best evidence behind them are unglamorous
        and individual: how you read, who you talk to, and what you do when a conversation gets hard.
      </p>
    </section>
  );
}

export function ActionsSection() {
  return (
    <section className="border-y border-parchment-edge bg-white/60">
      <div className="shell py-20">
        <SectionHeader
          eyebrow="In practice"
          title="What individuals can actually do"
          lede="Eight habits, in rough order of how much difference they make relative to effort."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {actions.map((a) => (
            <Expandable key={a.title} summary={a.title}>{a.body}</Expandable>
          ))}
        </div>
        <Link href="/conversation-guide" className="btn-secondary mt-8">
          Open the conversation guide
        </Link>
      </div>
    </section>
  );
}

export function PillarsSection() {
  return (
    <section className="shell py-20">
      <SectionHeader eyebrow="Our approach" title="Four things we work on" />
      <div className="mt-10 grid gap-px overflow-hidden rounded-md border border-parchment-edge bg-parchment-edge sm:grid-cols-2 lg:grid-cols-4">
        {pillars.map((p) => (
          <article key={p.key} className="bg-white p-7">
            <h3 className="font-mono text-eyebrow uppercase text-civic-deep">{p.title}</h3>
            <p className="mt-4 text-sm leading-relaxed text-slate">{p.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function QuickLinksSection() {
  return (
    <section className="bg-ink">
      <div className="shell py-20">
        <p className="eyebrow text-parchment/50">Start here</p>
        <h2 className="mt-3 text-title text-parchment">Where to go next</h2>
        <ul className="mt-10 divide-y divide-parchment/15 border-y border-parchment/15">
          {quickLinks.map((l) => (
            <li key={l.title}>
              <Link href={l.href} className="group flex items-center gap-6 py-5 transition hover:bg-white/5">
                <span className="flex-1">
                  <span className="block font-display text-[1.15rem] text-parchment">{l.title}</span>
                  <span className="mt-1 block text-sm text-parchment/60">{l.body}</span>
                </span>
                <span aria-hidden className="text-parchment/40 transition group-hover:translate-x-1 group-hover:text-gold">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function PerspectivesSection() {
  const [topicId, setTopicId] = useState(perspectiveTopics[0].id);
  const topic = perspectiveTopics.find((t) => t.id === topicId) ?? perspectiveTopics[0];

  return (
    <section className="shell py-20">
      <SectionHeader
        eyebrow="Explore perspectives"
        title="The same question, argued three ways"
        lede="Short summaries of how people who disagree actually reason, written so that each side would recognize its own position. These are summaries of arguments, not positions this organization holds."
      />

      {perspectiveTopics.length > 1 && (
        <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Policy topics">
          {perspectiveTopics.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={t.id === topicId}
              onClick={() => setTopicId(t.id)}
              className={`badge ${t.id === topicId ? 'border-ink bg-ink text-parchment' : 'border-parchment-edge text-slate'}`}
            >
              {t.topic}
            </button>
          ))}
        </div>
      )}

      <p className="mt-8 font-display text-[1.3rem] text-ink">{topic.question}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {topic.perspectives.map((p) => (
          <article key={p.label} className="card border-l-2 border-l-civic p-6">
            <h3 className="text-[1.05rem]">{p.label}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate">{p.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function DistrictCta() {
  return (
    <section className="border-y border-parchment-edge bg-civic-wash">
      <div className="shell grid items-center gap-8 py-16 md:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="eyebrow text-civic-deep">Third-party voters</p>
          <h2 className="mt-3 text-title">Find your congressional district</h2>
          <p className="mt-4 max-w-xl leading-relaxed text-slate">
            Look up your district by ZIP code, see who currently represents it, and browse neutral
            listings of independent and third-party figures on the ballot near you.
          </p>
        </div>
        <div className="flex gap-3 md:justify-end">
          <Link href="/districts" className="btn-primary">Open the map</Link>
        </div>
      </div>
    </section>
  );
}

export function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="link-underline">
      {children}<ExternalMark />
    </a>
  );
}
