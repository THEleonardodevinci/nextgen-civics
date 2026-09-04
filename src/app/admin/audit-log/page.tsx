import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/guards';
import { EmptyState } from '@/components/ui/primitives';
import type { AuditLog } from '@/types/db';

export default async function AuditLogPage() {
  await requireRole('ADMIN');
  const { data } = await createClient()
    .from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);

  const logs = (data as AuditLog[]) ?? [];

  return (
    <>
      <h1 className="text-title">Audit log</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
        Security-sensitive actions, written by the database rather than the application, so entries
        cannot be skipped by a client that avoids the admin UI.
      </p>

      {logs.length === 0 ? (
        <div className="mt-6"><EmptyState title="No entries yet" body="Actions appear here as soon as administrators start making changes." /></div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-md border border-parchment-edge bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-parchment-edge">
                {['When', 'Actor', 'Action', 'Object', 'Details'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-mono text-[0.65rem] uppercase tracking-wider text-slate">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-parchment-edge last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[0.72rem] text-slate">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate">{l.actor_email ?? 'system'}</td>
                  <td className="px-4 py-3 font-mono text-[0.72rem] text-ink">{l.action}</td>
                  <td className="px-4 py-3 text-slate">{l.object_type ?? '—'}</td>
                  <td className="max-w-[260px] truncate px-4 py-3 font-mono text-[0.7rem] text-slate-light">
                    {JSON.stringify(l.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
