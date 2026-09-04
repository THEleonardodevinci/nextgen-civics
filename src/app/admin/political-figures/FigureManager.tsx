'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { PoliticalFigure } from '@/types/db';
import { CANDIDATE_STATUS_LABEL, RECORD_STATE_LABEL, INCLUSION_BASIS_LABEL } from '@/types/db';
import { fmtDateShort, daysSince } from '@/lib/format';
import { slugify } from '@/lib/sanitize';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { ConfirmDialog, Toast, type ToastState } from '@/components/admin/Toast';
import CsvImport from './CsvImport';

type Editable = Partial<PoliticalFigure> & { sourceUrl?: string };

const emptyFigure: Editable = {
  name: '', slug: '', state_code: '', district_code: '', party: '',
  affiliation_type: 'independent', office: '', candidate_status: 'declared_candidate',
  inclusion_basis: 'filed_candidacy', stated_positions: [], verification_note: '',
  bio: '', state: 'needs_verification', is_sample: false, sourceUrl: '',
};

export default function FigureManager({
  figures, districtCodes, windowDays,
}: { figures: PoliticalFigure[]; districtCodes: string[]; windowDays: number }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [recordFilter, setRecordFilter] = useState('all');
  const [editing, setEditing] = useState<Editable | null>(null);
  const [confirm, setConfirm] = useState<PoliticalFigure | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [showImport, setShowImport] = useState(false);

  const states = useMemo(
    () => Array.from(new Set(figures.map((f) => f.state_code))).sort(),
    [figures]
  );

  const rows = useMemo(
    () => figures.filter((f) => {
      if (stateFilter !== 'all' && f.state_code !== stateFilter) return false;
      if (recordFilter === 'needs_verification') {
        const age = daysSince(f.last_verified);
        if (f.state !== 'needs_verification' && age !== null && age <= windowDays) return false;
      } else if (recordFilter !== 'all' && f.state !== recordFilter) return false;
      if (q) {
        const needle = q.toLowerCase();
        const hay = `${f.name} ${f.party ?? ''} ${f.district_code ?? ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    }),
    [figures, q, stateFilter, recordFilter, windowDays]
  );

  async function save() {
    if (!editing) return;
    const { sourceUrl, ...rest } = editing;

    const payload = {
      ...rest,
      slug: rest.slug || slugify(rest.name ?? ''),
      district_code: rest.district_code || null,
      party: rest.party || null,
      office: rest.office || null,
      bio: rest.bio || null,
      image_url: rest.image_url || null,
      website_url: rest.website_url || null,
      campaign_url: rest.campaign_url || null,
      email: rest.email || null,
      phone: rest.phone || null,
      mailing_address: rest.mailing_address || null,
      social_links: rest.social_links ?? {},
      stated_positions: rest.stated_positions ?? [],
      verification_note: rest.verification_note || null,
      source_urls: sourceUrl ? [{ label: 'Source', url: sourceUrl }] : (rest.source_urls ?? []),
      last_verified: rest.last_verified || null,
    };

    const res = await fetch('/api/admin/figures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (res.ok) { setEditing(null); setToast({ message: 'Record saved.', tone: 'good' }); router.refresh(); }
    else setToast({ message: json.error ?? 'Could not save.', tone: 'bad' });
  }

  async function act(id: string, action: 'verify' | 'deactivate' | 'activate') {
    const res = await fetch('/api/admin/figures', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    const json = await res.json();
    setToast(res.ok ? { message: json.message, tone: 'good' } : { message: json.error, tone: 'bad' });
    if (res.ok) router.refresh();
  }

  async function remove() {
    if (!confirm) return;
    const res = await fetch(`/api/admin/figures?id=${confirm.id}`, { method: 'DELETE' });
    const json = await res.json();
    setToast(res.ok ? { message: json.message, tone: 'good' } : { message: json.error, tone: 'bad' });
    setConfirm(null);
    if (res.ok) router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title">Political figures</h1>
        <div className="flex flex-wrap gap-2">
          <a href="/api/admin/figures/import" className="btn-secondary">Download CSV template</a>
          <button onClick={() => setShowImport((v) => !v)} className="btn-secondary">
            {showImport ? 'Close importer' : 'Import CSV'}
          </button>
          <button onClick={() => setEditing({ ...emptyFigure })} className="btn-primary">Add figure</button>
        </div>
      </div>

      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
        Never enter a candidate you cannot source. Records without a source URL or verification date
        are automatically flagged and surface on the dashboard.
      </p>

      {showImport && <CsvImport onDone={(m) => { setToast({ message: m, tone: 'good' }); router.refresh(); }} />}

      <div className="mt-6 flex flex-wrap gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, party, district"
               aria-label="Search figures" className="field max-w-xs" />
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}
                aria-label="Filter by state" className="field max-w-[150px]">
          <option value="all">All states</option>
          {states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={recordFilter} onChange={(e) => setRecordFilter(e.target.value)}
                aria-label="Filter by record state" className="field max-w-[220px]">
          <option value="all">All records</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="needs_verification">Needs verification</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No records match" body="Adjust the filters, or add a verified listing." />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-md border border-parchment-edge bg-white">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-parchment-edge">
                {['Name', 'Affiliation', 'District', 'Status', 'Last verified', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-mono text-[0.65rem] uppercase tracking-wider text-slate">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id} className="border-b border-parchment-edge last:border-0">
                  <td className="px-4 py-3">
                    <span className="text-ink">{f.name}</span>
                    {f.is_sample && <span className="ml-2 text-[0.65rem] uppercase text-[#7A5A16]">Sample</span>}
                  </td>
                  <td className="px-4 py-3 text-slate">{f.party ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-[0.75rem] text-slate">{f.district_code ?? f.state_code}</td>
                  <td className="px-4 py-3">
                    <Badge tone={f.state === 'active' ? 'good' : f.state === 'inactive' ? 'neutral' : 'warn'}>
                      {RECORD_STATE_LABEL[f.state]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate">{fmtDateShort(f.last_verified)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setEditing({ ...f })} className="link-underline">Edit</button>
                      <button onClick={() => act(f.id, 'verify')} className="link-underline">Verify</button>
                      {f.state === 'inactive' ? (
                        <button onClick={() => act(f.id, 'activate')} className="link-underline">Activate</button>
                      ) : (
                        <button onClick={() => act(f.id, 'deactivate')} className="link-underline">Deactivate</button>
                      )}
                      <button onClick={() => setConfirm(f)} className="text-burgundy underline underline-offset-[3px]">
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
            <h2 className="font-display text-xl text-ink">{editing.id ? 'Edit record' : 'New record'}</h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Name" value={editing.name ?? ''}
                     onChange={(v) => setEditing({ ...editing, name: v, slug: editing.id ? editing.slug : slugify(v) })} />
              <Field label="Slug" value={editing.slug ?? ''} onChange={(v) => setEditing({ ...editing, slug: slugify(v) })} />
              <Field label="State code" value={editing.state_code ?? ''}
                     onChange={(v) => setEditing({ ...editing, state_code: v.toUpperCase().slice(0, 2) })} />
              <div>
                <label className="label">District code</label>
                <input list="district-codes" className="field" value={editing.district_code ?? ''}
                       onChange={(e) => setEditing({ ...editing, district_code: e.target.value.toUpperCase() })} />
                <datalist id="district-codes">
                  {districtCodes.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <Field label="Party / affiliation" value={editing.party ?? ''} onChange={(v) => setEditing({ ...editing, party: v })} />
              <div>
                <label className="label">Affiliation type</label>
                <select className="field" value={editing.affiliation_type}
                        onChange={(e) => setEditing({ ...editing, affiliation_type: e.target.value as never })}>
                  <option value="third_party">Third party</option>
                  <option value="independent">Independent</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Field label="Office / seat" value={editing.office ?? ''} onChange={(v) => setEditing({ ...editing, office: v })} />
              <div>
                <label className="label">Status</label>
                <select className="field" value={editing.candidate_status}
                        onChange={(e) => setEditing({ ...editing, candidate_status: e.target.value as never })}>
                  {Object.entries(CANDIDATE_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <Field label="Website" value={editing.website_url ?? ''} onChange={(v) => setEditing({ ...editing, website_url: v })} />
              <Field label="Campaign website" value={editing.campaign_url ?? ''} onChange={(v) => setEditing({ ...editing, campaign_url: v })} />
              <Field label="Email" value={editing.email ?? ''} onChange={(v) => setEditing({ ...editing, email: v })} />
              <Field label="Phone" value={editing.phone ?? ''} onChange={(v) => setEditing({ ...editing, phone: v })} />
              <Field label="Image URL" value={editing.image_url ?? ''} onChange={(v) => setEditing({ ...editing, image_url: v })} />
              <Field label="Source URL" value={editing.sourceUrl ?? editing.source_urls?.[0]?.url ?? ''}
                     onChange={(v) => setEditing({ ...editing, sourceUrl: v })} />
              <div>
                <label className="label">Last verified</label>
                <input type="date" className="field" value={editing.last_verified ?? ''}
                       onChange={(e) => setEditing({ ...editing, last_verified: e.target.value })} />
              </div>
              <div>
                <label className="label">Inclusion basis</label>
                <select className="field" value={editing.inclusion_basis}
                        onChange={(e) => setEditing({ ...editing, inclusion_basis: e.target.value as never })}>
                  {Object.entries(INCLUSION_BASIS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Record state</label>
                <select className="field" value={editing.state}
                        onChange={(e) => setEditing({ ...editing, state: e.target.value as never })}>
                  {Object.entries(RECORD_STATE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            <label className="label mt-4">Mailing address</label>
            <input className="field" value={editing.mailing_address ?? ''}
                   onChange={(e) => setEditing({ ...editing, mailing_address: e.target.value })} />

            <label className="label mt-4">How was this verified?</label>
            <input className="field" value={editing.verification_note ?? ''}
                   onChange={(e) => setEditing({ ...editing, verification_note: e.target.value })}
                   placeholder="e.g. Confirmed against the Illinois SBE certified candidate list, 2026-08-14" />
            <p className="mt-1 text-xs text-slate-light">
              Name the specific record you checked. This is shown publicly.
            </p>

            <label className="label mt-4">Neutral biography</label>
            <textarea className="field" rows={4} value={editing.bio ?? ''}
                      onChange={(e) => setEditing({ ...editing, bio: e.target.value })} />
            <p className="mt-1 text-xs text-slate-light">
              State what the person has done — prior offices, occupation, where they live — and stop.
              Do not characterize their views here; use stated positions for that, in their own words.
            </p>

            <label className="mt-4 flex items-center gap-2 text-sm text-slate">
              <input type="checkbox" checked={!!editing.is_sample}
                     onChange={(e) => setEditing({ ...editing, is_sample: e.target.checked })} />
              This is placeholder sample data (shows a SAMPLE DATA badge publicly)
            </label>

            <div className="mt-6 flex gap-2">
              <button onClick={() => setEditing(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={save} className="btn-primary flex-1">Save record</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title="Delete this record?"
        body={`"${confirm?.name}" will be removed permanently. Deactivating keeps the record for audit purposes and is usually better.`}
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setConfirm(null)}
      />
      <Toast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, '-');
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
