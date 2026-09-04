'use client';

import { useMemo, useState } from 'react';
import type { Resource, ResourceCategory } from '@/types/db';
import { EmptyState, ExternalMark } from '@/components/ui/primitives';

export default function ResourceBrowser({
  categories, resources,
}: { categories: ResourceCategory[]; resources: Resource[] }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return resources.filter((r) => {
      if (cat && r.category_id !== cat) return false;
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        r.description.toLowerCase().includes(needle) ||
        r.tags.some((t) => t.toLowerCase().includes(needle))
      );
    });
  }, [resources, q, cat]);

  const grouped = categories
    .map((c) => ({ category: c, items: filtered.filter((r) => r.category_id === c.id) }))
    .filter((g) => g.items.length > 0);

  const uncategorized = filtered.filter((r) => !r.category_id);

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-3">
        <div className="min-w-[220px] flex-1 sm:max-w-sm">
          <label className="label" htmlFor="res-q">Search resources</label>
          <input id="res-q" value={q} onChange={(e) => setQ(e.target.value)}
                 placeholder="Bias charts, turnout data, dialogue…" className="field" />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        <button onClick={() => setCat(null)}
                className={`badge ${!cat ? 'border-ink bg-ink text-parchment' : 'border-parchment-edge text-slate hover:border-ink hover:text-ink'}`}>
          All categories
        </button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)}
                  className={`badge ${cat === c.id ? 'border-ink bg-ink text-parchment' : 'border-parchment-edge text-slate hover:border-ink hover:text-ink'}`}>
            {c.name}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="No resources match" body="Try a broader search term or a different category." />
        </div>
      ) : (
        <div className="mt-12 space-y-14">
          {grouped.map(({ category, items }) => (
            <section key={category.id}>
              <h2 className="text-[1.3rem]">{category.name}</h2>
              {category.description && (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate">{category.description}</p>
              )}
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((r) => <Card key={r.id} r={r} />)}
              </div>
            </section>
          ))}
          {uncategorized.length > 0 && (
            <section>
              <h2 className="text-[1.3rem]">Other</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {uncategorized.map((r) => <Card key={r.id} r={r} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}

function Card({ r }: { r: Resource }) {
  const host = (() => { try { return new URL(r.url).hostname.replace(/^www\./, ''); } catch { return r.url; } })();

  return (
    <article className="card-interactive flex flex-col p-5">
      <div className="flex items-center gap-3">
        {r.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.logo_url} alt="" className="h-9 w-9 rounded object-contain" loading="lazy" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded bg-parchment-deep
                          font-display text-sm text-slate" aria-hidden>
            {r.name.charAt(0)}
          </div>
        )}
        <h3 className="text-[1.05rem] leading-tight">{r.name}</h3>
      </div>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-slate">{r.description}</p>

      {r.tags.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {r.tags.map((t) => (
            <li key={t} className="badge border-parchment-edge text-slate-light">{t}</li>
          ))}
        </ul>
      )}

      <a href={r.url} target="_blank" rel="noopener noreferrer"
         className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-civic-deep hover:underline">
        Visit resource<ExternalMark />
        <span className="sr-only">({host}, opens in a new tab)</span>
      </a>
    </article>
  );
}
