'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { ArticleWithRelations, UserRole } from '@/types/db';
import { ROLE_RANK } from '@/types/db';
import { fmtDateShort } from '@/lib/format';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { ConfirmDialog, Toast, type ToastState } from '@/components/admin/Toast';

const STATUS_TONE = {
  published: 'good', draft: 'neutral', scheduled: 'info', archived: 'warn',
} as const;

export default function ArticleAdminTable({
  articles, role,
}: { articles: ArticleWithRelations[]; role: UserRole }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [toast, setToast] = useState<ToastState>(null);
  const [confirm, setConfirm] = useState<{ id: string; title: string; hard: boolean } | null>(null);

  const canPublish = ROLE_RANK[role] >= ROLE_RANK.EDITOR;

  const rows = useMemo(
    () => articles.filter((a) => {
      if (status !== 'all' && a.status !== status) return false;
      if (q && !a.title.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    }),
    [articles, q, status]
  );

  async function setStatusFor(a: ArticleWithRelations, next: 'published' | 'draft') {
    const res = await fetch('/api/admin/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: a.id,
        title: a.title, slug: a.slug, subtitle: a.subtitle, excerpt: a.excerpt,
        content: a.content, featured_image: a.featured_image, image_alt: a.image_alt,
        author_id: a.author_id, category_id: a.category_id,
        status: next, is_opinion: a.is_opinion, featured: a.featured,
        published_at: next === 'published' ? (a.published_at ?? new Date().toISOString()) : null,
        sources: a.sources ?? [], seo_title: a.seo_title, seo_description: a.seo_description,
        tagIds: (a.tags ?? []).map((t) => t.id),
      }),
    });
    const json = await res.json();
    setToast(res.ok
      ? { message: next === 'published' ? 'Published.' : 'Unpublished.', tone: 'good' }
      : { message: json.error ?? 'Could not update.', tone: 'bad' });
    if (res.ok) router.refresh();
  }

  async function remove() {
    if (!confirm) return;
    const res = await fetch(`/api/admin/articles?id=${confirm.id}&hard=${confirm.hard}`, { method: 'DELETE' });
    const json = await res.json();
    setToast(res.ok ? { message: json.message, tone: 'good' } : { message: json.error, tone: 'bad' });
    setConfirm(null);
    if (res.ok) router.refresh();
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles"
               aria-label="Search articles" className="field max-w-xs" />
        <select value={status} onChange={(e) => setStatus(e.target.value)}
                aria-label="Filter by status" className="field max-w-[180px]">
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No articles match" body="Adjust the search or status filter, or create a new article." />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-md border border-parchment-edge bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-parchment-edge">
                {['Title', 'Author', 'Status', 'Updated', 'Views', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-mono text-[0.65rem] uppercase tracking-wider text-slate">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-b border-parchment-edge last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/admin/articles/edit?id=${a.id}`} className="text-ink hover:text-civic-deep">
                      {a.title}
                    </Link>
                    {a.is_opinion && <span className="ml-2 text-[0.65rem] uppercase text-burgundy">Opinion</span>}
                  </td>
                  <td className="px-4 py-3 text-slate">{a.author?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate">{fmtDateShort(a.updated_at)}</td>
                  <td className="px-4 py-3 text-slate">{a.view_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/articles/edit?id=${a.id}`} className="link-underline">Edit</Link>
                      {a.status === 'published' && (
                        <Link href={`/articles/${a.slug}`} className="link-underline">View</Link>
                      )}
                      {canPublish && (
                        <button onClick={() => setStatusFor(a, a.status === 'published' ? 'draft' : 'published')}
                                className="link-underline">
                          {a.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>
                      )}
                      {canPublish && a.status !== 'archived' && (
                        <button onClick={() => setConfirm({ id: a.id, title: a.title, hard: false })}
                                className="link-underline">
                          Archive
                        </button>
                      )}
                      {ROLE_RANK[role] >= ROLE_RANK.ADMIN && (
                        <button onClick={() => setConfirm({ id: a.id, title: a.title, hard: true })}
                                className="text-burgundy underline underline-offset-[3px]">
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.hard ? 'Delete permanently?' : 'Archive this article?'}
        body={
          confirm?.hard
            ? `"${confirm.title}" will be removed from the database. This cannot be undone.`
            : `"${confirm?.title}" will be hidden from the public site. You can restore it later.`
        }
        confirmLabel={confirm?.hard ? 'Delete' : 'Archive'}
        onConfirm={remove}
        onCancel={() => setConfirm(null)}
      />
      <Toast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}
