'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Article, Author, Category, Tag, UserRole, Source } from '@/types/db';
import { ROLE_RANK } from '@/types/db';
import { slugify } from '@/lib/sanitize';
import { Toast, ConfirmDialog, type ToastState } from '@/components/admin/Toast';

const RichTextEditor = dynamic(() => import('@/components/admin/RichTextEditor'), {
  ssr: false,
  loading: () => <div className="skeleton h-[460px]" />,
});

type Draft = {
  id?: string;
  title: string; slug: string; subtitle: string; excerpt: string; content: string;
  featured_image: string; image_alt: string;
  author_id: string; category_id: string;
  is_opinion: boolean; featured: boolean;
  seo_title: string; seo_description: string;
  published_at: string;
  sources: Source[];
  tagIds: string[];
};

const blank: Draft = {
  title: '', slug: '', subtitle: '', excerpt: '', content: '',
  featured_image: '', image_alt: '', author_id: '', category_id: '',
  is_opinion: false, featured: false, seo_title: '', seo_description: '',
  published_at: '', sources: [], tagIds: [],
};

export default function ArticleEditor({
  role, article, authors, categories, tags,
}: {
  role: UserRole;
  article: (Article & { tagIds: string[] }) | null;
  authors: Author[]; categories: Category[]; tags: Tag[];
}) {
  const router = useRouter();
  const canPublish = ROLE_RANK[role] >= ROLE_RANK.EDITOR;

  const [draft, setDraft] = useState<Draft>(() =>
    article
      ? {
          id: article.id,
          title: article.title, slug: article.slug,
          subtitle: article.subtitle ?? '', excerpt: article.excerpt ?? '',
          content: article.content, featured_image: article.featured_image ?? '',
          image_alt: article.image_alt ?? '',
          author_id: article.author_id ?? '', category_id: article.category_id ?? '',
          is_opinion: article.is_opinion, featured: article.featured,
          seo_title: article.seo_title ?? '', seo_description: article.seo_description ?? '',
          published_at: article.published_at ?? '',
          sources: article.sources ?? [], tagIds: article.tagIds,
        }
      : blank
  );

  const [status, setStatus] = useState(article?.status ?? 'draft');
  const [toast, setToast] = useState<ToastState>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const dirty = useRef(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    dirty.current = true;
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const save = useCallback(
    async (nextStatus: 'draft' | 'scheduled' | 'published' | 'archived', quiet = false) => {
      if (!draft.title.trim()) {
        setToast({ message: 'Give the article a title before saving.', tone: 'bad' });
        return;
      }
      setSaving(true);

      const payload = {
        ...draft,
        slug: draft.slug || slugify(draft.title),
        status: nextStatus,
        subtitle: draft.subtitle || null,
        excerpt: draft.excerpt || null,
        featured_image: draft.featured_image || null,
        image_alt: draft.image_alt || null,
        author_id: draft.author_id || null,
        category_id: draft.category_id || null,
        seo_title: draft.seo_title || null,
        seo_description: draft.seo_description || null,
        published_at:
          nextStatus === 'published' ? (draft.published_at || new Date().toISOString())
          : nextStatus === 'scheduled' ? (draft.published_at || null)
          : null,
      };

      const res = await fetch('/api/admin/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      setSaving(false);

      if (!res.ok) { setToast({ message: json.error ?? 'Could not save.', tone: 'bad' }); return; }

      dirty.current = false;
      setStatus(nextStatus);
      setLastSaved(new Date().toLocaleTimeString());
      if (!draft.id) {
        setDraft((d) => ({ ...d, id: json.article.id }));
        router.replace(`/admin/articles/edit?id=${json.article.id}`);
      }
      if (!quiet) {
        setToast({
          message:
            nextStatus === 'published' ? 'Published.'
            : nextStatus === 'scheduled' ? 'Scheduled.'
            : 'Draft saved.',
          tone: 'good',
        });
      }
    },
    [draft, router]
  );

  // Autosave drafts every 45 seconds when there are unsaved changes.
  useEffect(() => {
    const t = setInterval(() => {
      if (dirty.current && draft.title.trim() && status !== 'published') void save('draft', true);
    }, 45_000);
    return () => clearInterval(t);
  }, [save, draft.title, status]);

  // Warn before losing unsaved work.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (dirty.current) e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  async function remove() {
    if (!draft.id) return;
    const res = await fetch(`/api/admin/articles?id=${draft.id}&hard=true`, { method: 'DELETE' });
    const json = await res.json();
    if (res.ok) { router.push('/admin/articles'); router.refresh(); }
    else setToast({ message: json.error, tone: 'bad' });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-title">{draft.id ? 'Edit article' : 'New article'}</h1>
          <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">
            Status: {status}{lastSaved ? ` · saved ${lastSaved}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => save('draft')} disabled={saving} className="btn-secondary">
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          {draft.id && status === 'published' && (
            <a href={`/articles/${draft.slug}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              Preview
            </a>
          )}
          {canPublish && status !== 'published' && (
            <button onClick={() => save('published')} disabled={saving} className="btn-primary">Publish</button>
          )}
          {canPublish && status === 'published' && (
            <button onClick={() => save('draft')} disabled={saving} className="btn-secondary">Unpublish</button>
          )}
          {draft.id && ROLE_RANK[role] >= ROLE_RANK.ADMIN && (
            <button onClick={() => setConfirmDelete(true)} className="btn-danger">Delete</button>
          )}
        </div>
      </div>

      {!canPublish && (
        <p className="mt-5 rounded-md border border-gold/40 bg-gold-wash px-4 py-3 text-sm text-ink">
          Writers can save and edit drafts. An editor publishes them.
        </p>
      )}

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <label className="label" htmlFor="title">Title</label>
          <input id="title" value={draft.title}
                 onChange={(e) => {
                   set('title', e.target.value);
                   if (!draft.id && !draft.slug) set('slug', slugify(e.target.value));
                 }}
                 className="field font-display text-lg" />

          <label className="label mt-4" htmlFor="subtitle">Subtitle</label>
          <input id="subtitle" value={draft.subtitle} onChange={(e) => set('subtitle', e.target.value)} className="field" />

          <label className="label mt-4" htmlFor="excerpt">Excerpt</label>
          <textarea id="excerpt" value={draft.excerpt} onChange={(e) => set('excerpt', e.target.value)}
                    rows={3} className="field" />
          <p className="mt-1 text-xs text-slate-light">Shown on cards and in search results.</p>

          <p className="label mt-6">Body</p>
          <RichTextEditor value={draft.content} onChange={(html) => set('content', html)} />

          <div className="mt-8">
            <p className="label">Sources &amp; references</p>
            {draft.sources.map((s, i) => (
              <div key={i} className="mt-2 flex flex-wrap gap-2">
                <input
                  value={s.label} placeholder="Label" className="field flex-1"
                  onChange={(e) => {
                    const next = [...draft.sources];
                    next[i] = { ...next[i], label: e.target.value };
                    set('sources', next);
                  }}
                />
                <input
                  value={s.url} placeholder="https://…" className="field flex-1"
                  onChange={(e) => {
                    const next = [...draft.sources];
                    next[i] = { ...next[i], url: e.target.value };
                    set('sources', next);
                  }}
                />
                <button onClick={() => set('sources', draft.sources.filter((_, j) => j !== i))}
                        className="btn-quiet" aria-label={`Remove source ${i + 1}`}>✕</button>
              </div>
            ))}
            <button onClick={() => set('sources', [...draft.sources, { label: '', url: '' }])}
                    className="btn-secondary mt-3">
              Add source
            </button>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="card p-5">
            <label className="label" htmlFor="slug">Slug</label>
            <input id="slug" value={draft.slug} onChange={(e) => set('slug', slugify(e.target.value))} className="field" />
            <p className="mt-1 break-all text-xs text-slate-light">/articles/{draft.slug || 'your-slug'}</p>

            <label className="label mt-4" htmlFor="author">Author</label>
            <select id="author" value={draft.author_id} onChange={(e) => set('author_id', e.target.value)} className="field">
              <option value="">No byline</option>
              {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>

            <label className="label mt-4" htmlFor="category">Category</label>
            <select id="category" value={draft.category_id} onChange={(e) => set('category_id', e.target.value)} className="field">
              <option value="">Uncategorized</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <label className="mt-4 flex items-center gap-2 text-sm text-slate">
              <input type="checkbox" checked={draft.featured} onChange={(e) => set('featured', e.target.checked)} />
              Feature on the articles page
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm text-slate">
              <input type="checkbox" checked={draft.is_opinion} onChange={(e) => set('is_opinion', e.target.checked)} />
              Label as Opinion
            </label>

            <label className="label mt-4" htmlFor="publish-at">Publish date</label>
            <input
              id="publish-at" type="datetime-local"
              value={draft.published_at ? draft.published_at.slice(0, 16) : ''}
              onChange={(e) => set('published_at', e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="field"
            />
            {canPublish && (
              <button onClick={() => save('scheduled')} disabled={saving || !draft.published_at}
                      className="btn-secondary mt-3 w-full">
                Schedule
              </button>
            )}
          </div>

          <div className="card p-5">
            <p className="label">Tags</p>
            <ul className="flex flex-wrap gap-1.5">
              {tags.map((t) => {
                const on = draft.tagIds.includes(t.id);
                return (
                  <li key={t.id}>
                    <button
                      onClick={() =>
                        set('tagIds', on ? draft.tagIds.filter((x) => x !== t.id) : [...draft.tagIds, t.id])
                      }
                      aria-pressed={on}
                      className={`badge ${on ? 'border-ink bg-ink text-parchment' : 'border-parchment-edge text-slate'}`}
                    >
                      {t.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="card p-5">
            <label className="label" htmlFor="hero">Featured image URL</label>
            <input id="hero" value={draft.featured_image} onChange={(e) => set('featured_image', e.target.value)}
                   className="field" placeholder="https://…" />
            {draft.featured_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.featured_image} alt="" className="mt-3 w-full rounded border border-parchment-edge" />
            )}
            <label className="label mt-4" htmlFor="alt">Alt text</label>
            <input id="alt" value={draft.image_alt} onChange={(e) => set('image_alt', e.target.value)} className="field" />
          </div>

          <div className="card p-5">
            <label className="label" htmlFor="seo-title">SEO title</label>
            <input id="seo-title" value={draft.seo_title} onChange={(e) => set('seo_title', e.target.value)}
                   maxLength={70} className="field" />
            <label className="label mt-4" htmlFor="seo-desc">SEO description</label>
            <textarea id="seo-desc" value={draft.seo_description} onChange={(e) => set('seo_description', e.target.value)}
                      maxLength={200} rows={3} className="field" />
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this article?"
        body="It will be removed from the database permanently. Archiving is usually the better choice."
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
      <Toast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}
