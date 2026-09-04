import Link from 'next/link';
import type { Source } from '@/types/db';
import { daysSince, fmtDateShort } from '@/lib/format';

export function SectionHeader({
  eyebrow, title, lede, id,
}: { eyebrow?: string; title: string; lede?: string; id?: string }) {
  return (
    <header id={id} className="max-w-2xl scroll-mt-24">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="mt-3 text-title">{title}</h2>
      {lede && <p className="mt-4 text-[1.05rem] leading-relaxed text-slate">{lede}</p>}
    </header>
  );
}

export function EmptyState({
  title, body, action,
}: { title: string; body: string; action?: { label: string; href: string } }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden className="text-parchment-edge">
        <circle cx="17" cy="17" r="16" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 20c2-3 4-4 6-4s4 1 6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <p className="mt-4 font-display text-lg text-ink">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate">{body}</p>
      {action && <Link href={action.href} className="btn-secondary mt-5">{action.label}</Link>}
    </div>
  );
}

export function LoadingSkeleton({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="skeleton h-20" />)}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card border-burgundy/30 bg-burgundy-wash p-6" role="alert">
      <p className="font-display text-ink">Something went wrong</p>
      <p className="mt-1 text-sm text-slate">{message}</p>
      {onRetry && <button onClick={onRetry} className="btn-secondary mt-4">Try again</button>}
    </div>
  );
}

/** Status badges pair color with a text label, never color alone. */
const BADGE_TONE: Record<string, string> = {
  neutral: 'border-parchment-edge bg-parchment-deep text-slate',
  info: 'border-civic/30 bg-civic-wash text-civic-deep',
  warn: 'border-gold/40 bg-gold-wash text-[#7A5A16]',
  alert: 'border-burgundy/30 bg-burgundy-wash text-burgundy',
  good: 'border-[#2F6B4F]/25 bg-[#E8F1EC] text-[#2F6B4F]',
};

export function Badge({
  children, tone = 'neutral',
}: { children: React.ReactNode; tone?: keyof typeof BADGE_TONE }) {
  return <span className={`badge ${BADGE_TONE[tone]}`}>{children}</span>;
}

export function SampleDataBadge() {
  return <Badge tone="warn">Sample data</Badge>;
}

export function OpinionBadge() {
  return <Badge tone="alert">Opinion</Badge>;
}

/**
 * Shows how stale a political record is. Anything past `windowDays` is
 * flagged, because outdated political information is worse than none.
 */
export function LastVerifiedBadge({
  date, windowDays = 180,
}: { date: string | null; windowDays?: number }) {
  const age = daysSince(date);
  if (age === null) return <Badge tone="warn">Not yet verified</Badge>;
  const stale = age > windowDays;
  return (
    <Badge tone={stale ? 'warn' : 'good'}>
      {stale ? 'Verification due · ' : 'Verified '}{fmtDateShort(date)}
    </Badge>
  );
}

export function SourceCitation({ sources, label = 'Sources' }: { sources: Source[]; label?: string }) {
  if (!sources?.length) return null;
  return (
    <div className="rule pt-4">
      <p className="eyebrow">{label}</p>
      <ul className="mt-2 space-y-1.5">
        {sources.map((s, i) => (
          <li key={`${s.url}-${i}`} className="text-sm">
            <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="link-underline">
              {s.label}
            </a>
            <ExternalMark />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ExternalMark() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-label="opens in a new tab"
         role="img" className="ml-1 inline-block align-baseline text-slate-faint">
      <path d="M4.5 2h5.5v5.5M10 2 4 8M8 10H2V4" stroke="currentColor" strokeWidth="1.3"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Disclaimer({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-gold/35 bg-gold-wash px-4 py-3 text-sm leading-relaxed text-ink">
      {children}
    </p>
  );
}
