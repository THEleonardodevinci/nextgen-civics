'use client';

import { useState } from 'react';

type Row = { line: number; name: string; valid: boolean; errors: string[]; warnings: string[] };
type Report = { summary: { total: number; valid: number; warnings: number; invalid: number }; rows: Row[] };

/** Validate first, show a per-row report, then require confirmation to write. */
export default function CsvImport({ onDone }: { onDone: (message: string) => void }) {
  const [csv, setCsv] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function send(dryRun: boolean) {
    setBusy(true); setError('');
    const res = await fetch('/api/admin/figures/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv, dryRun }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) { setError(json.error ?? 'Import failed.'); return; }
    if (dryRun) { setReport(json); return; }

    setReport(null); setCsv('');
    onDone(json.message);
  }

  return (
    <section className="card mt-6 p-6">
      <h2 className="text-[1.05rem]">Import records from CSV</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate">
        Paste CSV content or choose a file. Nothing is written until you review the validation report
        and confirm.
      </p>

      <input
        type="file"
        accept=".csv,text/csv"
        className="mt-4 block w-full text-sm text-slate file:mr-3 file:rounded-[3px] file:border
                   file:border-parchment-edge file:bg-parchment-deep file:px-3 file:py-2 file:text-sm"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) { setCsv(await file.text()); setReport(null); }
        }}
      />

      <label className="label mt-4" htmlFor="csv">CSV content</label>
      <textarea
        id="csv" value={csv} onChange={(e) => { setCsv(e.target.value); setReport(null); }}
        rows={6} className="field font-mono text-xs"
        placeholder="name,state_code,district_code,party,…"
      />

      {error && <p className="mt-3 text-sm text-burgundy" role="alert">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => send(true)} disabled={!csv.trim() || busy} className="btn-secondary">
          {busy ? 'Checking…' : 'Validate'}
        </button>
        {report && report.summary.valid > 0 && (
          <button onClick={() => send(false)} disabled={busy} className="btn-primary">
            Import {report.summary.valid} valid {report.summary.valid === 1 ? 'row' : 'rows'}
          </button>
        )}
      </div>

      {report && (
        <div className="mt-5 rounded-md border border-parchment-edge">
          <div className="flex flex-wrap gap-4 border-b border-parchment-edge bg-parchment-deep px-4 py-3
                          font-mono text-[0.7rem] uppercase tracking-wider">
            <span className="text-slate">{report.summary.total} rows</span>
            <span className="text-[#2F6B4F]">{report.summary.valid} valid</span>
            <span className="text-[#7A5A16]">{report.summary.warnings} with warnings</span>
            <span className="text-burgundy">{report.summary.invalid} invalid</span>
          </div>
          <ul className="max-h-64 divide-y divide-parchment-edge overflow-y-auto">
            {report.rows.map((r) => (
              <li key={r.line} className="px-4 py-2.5 text-sm">
                <span className="font-mono text-[0.7rem] text-slate-light">Line {r.line}</span>{' '}
                <span className="text-ink">{r.name}</span>
                {r.errors.map((e, i) => (
                  <span key={i} className="mt-1 block text-xs text-burgundy">Error — {e}</span>
                ))}
                {r.warnings.map((w, i) => (
                  <span key={i} className="mt-1 block text-xs text-[#7A5A16]">Warning — {w}</span>
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
