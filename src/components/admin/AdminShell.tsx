'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ROLE_RANK, type UserRole } from '@/types/db';

const NAV: { href: string; label: string; min: UserRole }[] = [
  { href: '/admin', label: 'Overview', min: 'WRITER' },
  { href: '/admin/articles', label: 'Articles', min: 'WRITER' },
  { href: '/admin/political-figures', label: 'Political figures', min: 'ADMIN' },
  { href: '/admin/districts', label: 'Districts', min: 'ADMIN' },
  { href: '/admin/resources', label: 'Resources', min: 'ADMIN' },
  { href: '/admin/team', label: 'Team', min: 'ADMIN' },
  { href: '/admin/users', label: 'Users', min: 'SUPER_ADMIN' },
  { href: '/admin/audit-log', label: 'Audit log', min: 'ADMIN' },
  { href: '/admin/settings', label: 'Settings', min: 'SUPER_ADMIN' },
];

export default function AdminShell({
  role, children, breadcrumb,
}: { role: UserRole; children: React.ReactNode; breadcrumb?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const visible = NAV.filter((n) => ROLE_RANK[role] >= ROLE_RANK[n.min]);

  return (
    <div className="shell grid gap-8 py-10 lg:grid-cols-[220px_1fr]">
      <div className="lg:hidden">
        <button onClick={() => setOpen((v) => !v)} className="btn-secondary w-full" aria-expanded={open}>
          {open ? 'Hide' : 'Show'} admin menu
        </button>
      </div>

      <nav aria-label="Admin" className={`${open ? 'block' : 'hidden'} lg:block`}>
        <p className="eyebrow">Administration</p>
        <ul className="mt-4 space-y-0.5">
          {visible.map((n) => {
            const active = n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href);
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={active ? 'page' : undefined}
                  className={`block rounded-[3px] px-3 py-2 text-sm transition ${
                    active ? 'bg-ink text-parchment' : 'text-slate hover:bg-parchment-deep hover:text-ink'
                  }`}
                >
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 border-t border-parchment-edge pt-4 font-mono text-[0.65rem] uppercase tracking-wider text-slate-faint">
          Signed in as {role.replace('_', ' ')}
        </p>
      </nav>

      <div className="min-w-0">
        {breadcrumb && (
          <p className="mb-4 font-mono text-[0.65rem] uppercase tracking-wider text-slate-light">
            <Link href="/admin" className="hover:text-ink">Admin</Link>
            <span aria-hidden> / </span>
            <span className="text-ink">{breadcrumb}</span>
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
