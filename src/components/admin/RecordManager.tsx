'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/ui/primitives';
import { ConfirmDialog, Toast, type ToastState } from '@/components/admin/Toast';

export type FieldDef = {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'checkbox' | 'select' | 'date';
  options?: { value: string; label: string }[];
  help?: string;
  required?: boolean;
};

type Row = Record<string, unknown>;

/**
 * Generic admin CRUD surface. Used for resources, team members, and district
 * statistics so those screens share one implementation and stay consistent.
 * Writes go through /api/admin/records, which validates with zod and is
 * additionally gated by RLS.
 */
export default function RecordManager({
  table, title, intro, rows, fields, columns, pk = 'id', empty,
}: {
  table: 'resources' | 'team_members' | 'districts';
  title: string;
  intro: string;
  rows: Row[];
  fields: FieldDef[];
  columns: { key: string; label: string }[];
  pk?: string;
  empty: { title: string; body: string };
}) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Row | null>(null);
  const [confirm, setConfirm] = useState<Row | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(needle));
  }, [rows, q]);

  const blank = () =>
    Object.fromEntries(
      fields.map((f) => [f.key, f.type === 'checkbox' ? false : f.type === 'number' ? null : ''])
    ) as Row;

  async function save() {
    if (!editing) return;
    setBusy(true);

    // Send only declared fields, coerced to the right primitive types.
    const record = Object.fromEntries(
      fields.map((f) => {
        const raw = editing[f.key];
        if (f.type === 'number') return [f.key, raw === '' || raw === null ? null : Number(raw)];
        if (f.type === 'checkbox') return [f.key, Boolean(raw)];
        return [f.key, raw === '' ? (f.required ? '' : null) : raw];
      })
    );

    const res = await fetch('/api/admin/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, id: editing[pk] ?? null, record }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) { setToast({ message: json.error ?? 'Could not save.', tone: 'bad' }); return; }
    setEditing(null);
    setToast({ message: 'Saved.', tone: 'good' });
    router.refresh();
  }

  async function remove() {
    if (!confirm) return;
    const res = await fetch(`/api/admin/records?table=${table}&id=${confirm[pk]}`, { method: 'DELETE' });
    const json = await res.json();
    setToast(res.ok ? { message: json.message, tone: 'good' } : { message: json.error, tone: 'bad' });
    setConfirm(null);
    if (res.ok) router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title">{title}</h1>
        <button onClick={() => setEditing(blank())} className="btn-primary">Add</button>
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">{intro}</p>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search"
             aria-label={`Search ${title}`} className="field mt-6 max-w-xs" />

      {filtered.length === 0 ? (
        <div className="mt-6"><EmptyState title={empty.title} body={empty.body} /></div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-md border border-parchment-edge bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-parchment-edge">
                {columns.map((c) => (
                  <th key={c.key} className="px-4 py-3 text-left font-mono text-[0.65rem] uppercase tracking-wider text-slate">
                    {c.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-mono text-[0.65rem] uppercase tracking-wider text-slate">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={String(r[pk])} className="border-b border-parchment-edge last:border-0">
                  {columns.map((c) => (
                    <td key={c.key} className="max-w-[280px] truncate px-4 py-3 text-slate">
                      {typeof r[c.key] === 'boolean' ? (r[c.key] ? 'Yes' : 'No') : String(r[c.key] ?? '—')}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => setEditing({ ...r })} className="link-underline">Edit</button>
                      <button onClick={() => setConfirm(r)} className="text-burgundy underline underline-offset-[3px]">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-ink-deep/40 p-4">
          <div className="mx-auto max-w-2xl rounded-md border border-parchment-edge bg-white p-6 shadow-lift">
            <h2 className="font-display text-xl text-ink">{editing[pk] ? 'Edit' : 'New'} entry</h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {fields.map((f) => {
                const id = `field-${f.key}`;
                const value = editing[f.key];
                const wide = f.type === 'textarea';
                return (
                  <div key={f.key} className={wide ? 'sm:col-span-2' : ''}>
                    <label className="label" htmlFor={id}>{f.label}</label>
                    {f.type === 'textarea' ? (
                      <textarea id={id} rows={4} className="field" value={String(value ?? '')}
                                onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} />
                    ) : f.type === 'checkbox' ? (
                      <input id={id} type="checkbox" checked={Boolean(value)}
                             onChange={(e) => setEditing({ ...editing, [f.key]: e.target.checked })} />
                    ) : f.type === 'select' ? (
                      <select id={id} className="field" value={String(value ?? '')}
                              onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}>
                        <option value="">—</option>
                        {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (
                      <input
                        id={id}
                        type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                        className="field"
                        value={value === null || value === undefined ? '' : String(value)}
                        onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                      />
                    )}
                    {f.help && <p className="mt-1 text-xs text-slate-light">{f.help}</p>}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex gap-2">
              <button onClick={() => setEditing(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={save} disabled={busy} className="btn-primary flex-1">
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title="Delete this entry?"
        body="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setConfirm(null)}
      />
      <Toast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}
