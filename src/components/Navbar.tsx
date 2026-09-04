'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { mainNav, org } from '@/data/site-content';
import { ROLE_RANK, type UserRole } from '@/types/db';
import SearchModal from '@/components/SearchModal';

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setEmail(null); setRole(null); return; }
      setEmail(user.email ?? null);
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      setRole((data?.role as UserRole) ?? 'USER');
    };

    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, []);

  // Close menus on navigation.
  useEffect(() => { setOpen(false); setMenuOpen(false); }, [pathname]);

  // "/" focuses search, unless the user is typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if (e.key === '/' && !typing) { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isStaff = !!role && ROLE_RANK[role] >= ROLE_RANK.WRITER;
  const isCurrent = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-parchment-edge bg-parchment/90 backdrop-blur">
        <nav className="shell flex h-16 items-center gap-6" aria-label="Main">
          <Link href="/" className="flex items-center gap-2.5 font-display text-[1.05rem] font-semibold text-ink">
            <Mark />
            <span className="truncate">{org.name}</span>
          </Link>

          <ul className="ml-auto hidden items-center gap-1 md:flex">
            {mainNav.map((item) => (
              <li key={item.href + item.label}>
                <Link
                  href={item.href}
                  aria-current={isCurrent(item.href) ? 'page' : undefined}
                  className={`rounded px-3 py-2 text-sm transition hover:text-ink ${
                    isCurrent(item.href)
                      ? 'text-ink underline decoration-gold decoration-2 underline-offset-[6px]'
                      : 'text-slate'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="btn-quiet"
              aria-label="Search the site (press slash)"
            >
              <SearchIcon />
              <span className="sr-only md:not-sr-only md:font-mono md:text-[0.65rem] md:text-slate-faint">/</span>
            </button>

            {email ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-semibold text-parchment"
                >
                  <span aria-hidden>{email[0]?.toUpperCase()}</span>
                  <span className="sr-only">Account menu</span>
                </button>
                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 rounded-md border border-parchment-edge bg-white py-1 shadow-lift"
                  >
                    <p className="truncate px-3 py-2 font-mono text-[0.65rem] text-slate-light">{email}</p>
                    <Link role="menuitem" href="/account" className="block px-3 py-2 text-sm hover:bg-parchment-deep">
                      Your account
                    </Link>
                    {isStaff && (
                      <Link role="menuitem" href="/admin" className="block px-3 py-2 text-sm hover:bg-parchment-deep">
                        Admin dashboard
                      </Link>
                    )}
                    <button
                      role="menuitem"
                      type="button"
                      onClick={async () => {
                        await createClient().auth.signOut();
                        window.location.href = '/';
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-parchment-deep"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="btn-secondary hidden px-4 py-2 sm:inline-flex">Sign in</Link>
            )}

            <button
              type="button"
              className="btn-quiet md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
            >
              <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
              <MenuIcon open={open} />
            </button>
          </div>
        </nav>

        {open && (
          <div id="mobile-menu" className="border-t border-parchment-edge bg-parchment md:hidden">
            <ul className="shell flex flex-col py-2">
              {mainNav.map((item) => (
                <li key={item.href + item.label}>
                  <Link
                    href={item.href}
                    className="block border-b border-parchment-edge py-3 text-[0.95rem] text-ink"
                    aria-current={isCurrent(item.href) ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={email ? '/account' : '/login'} className="block py-3 text-[0.95rem] text-ink">
                  {email ? 'Your account' : 'Sign in'}
                </Link>
              </li>
              {isStaff && (
                <li><Link href="/admin" className="block py-3 text-[0.95rem] text-ink">Admin dashboard</Link></li>
              )}
            </ul>
          </div>
        )}
      </header>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

/** Two arcs meeting: the bridging motif used across the site. */
function Mark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden className="shrink-0">
      <circle cx="13" cy="13" r="12" fill="none" stroke="#DCD8CF" />
      <path d="M4 17c3-6 6-8 9-8s6 2 9 8" fill="none" stroke="#16233A" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="4" cy="17" r="2.2" fill="#3E6FA3" />
      <circle cx="22" cy="17" r="2.2" fill="#8C3A46" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="m13.5 13.5 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      {open ? (
        <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      ) : (
        <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  );
}
