import { ExternalMark } from '@/components/ui/primitives';

export interface Stat {
  value: string; title: string; description: string;
  source: string; sourceUrl: string; year: string;
}

/**
 * Statistic cards. Values come from site_settings.statistics (Admin → Settings)
 * so nothing here is hardcoded. Every card renders its source; an entry
 * without one is visibly marked rather than presented as established fact.
 */
export default function Statistics({ stats }: { stats: Stat[] }) {
  if (!stats.length) return null;
  return (
    <section className="shell py-20">
      <p className="eyebrow">Key data</p>
      <h2 className="mt-3 text-title">The numbers people cite</h2>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s, i) => {
          const cited = Boolean(s.sourceUrl);
          return (
            <article key={i} className="card flex flex-col p-6">
              <p className="font-display text-[2.6rem] leading-none text-ink">{s.value}</p>
              <h3 className="mt-3 text-[1rem]">{s.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate">{s.description}</p>
              <p className="mt-5 border-t border-parchment-edge pt-3 font-mono text-[0.65rem] uppercase tracking-wider">
                {cited ? (
                  <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer"
                     className="text-civic-deep hover:underline">
                    Source: {s.source}, {s.year}<ExternalMark />
                  </a>
                ) : (
                  <span className="text-[#7A5A16]">Placeholder — add a source before publishing</span>
                )}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
