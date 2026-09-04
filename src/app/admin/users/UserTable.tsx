'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Profile, UserRole } from '@/types/db';
import { fmtDateShort } from '@/lib/format';
import { Badge } from '@/components/ui/primitives';
import { Toast, type ToastState } from '@/components/admin/Toast';

const ROLES: UserRole[] = ['USER', 'WRITER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN'];

export default function UserTable({ users, currentUserId }: { users: Profile[]; currentUserId: string }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [toast, setToast] = useState<ToastState>(null);

  const rows = users.filter((u) =>
    !q || u.email.toLowerCase().includes(q.toLowerCase()) ||
    (u.display_name ?? '').toLowerCase().includes(q.toLowerCase())
  );

  async function changeRole(userId: string, role: UserRole) {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });
    const json = await res.json();
    setToast(res.ok ? { message: json.message, tone: 'good' } : { message: json.error, tone: 'bad' });
    if (res.ok) router.refresh();
  }

  return (
    <>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email"
             aria-label="Search users" className="field mt-6 max-w-xs" />

      <div className="mt-6 overflow-x-auto rounded-md border border-parchment-edge bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-parchment-edge">
              {['Name', 'Email', 'Joined', 'Status', 'Role'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-mono text-[0.65rem] uppercase tracking-wider text-slate">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-parchment-edge last:border-0">
                <td className="px-4 py-3 text-ink">{u.display_name ?? '—'}</td>
                <td className="px-4 py-3 text-slate">{u.email}</td>
                <td className="px-4 py-3 text-slate">{fmtDateShort(u.created_at)}</td>
                <td className="px-4 py-3">
                  <Badge tone={u.is_suspended ? 'alert' : 'good'}>{u.is_suspended ? 'Suspended' : 'Active'}</Badge>
                </td>
                <td className="px-4 py-3">
                  {u.id === currentUserId ? (
                    <span className="font-mono text-[0.7rem] text-slate-light">{u.role} (you)</span>
                  ) : (
                    <select
                      className="field max-w-[170px] py-1.5"
                      value={u.role}
                      aria-label={`Role for ${u.email}`}
                      onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Toast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}
