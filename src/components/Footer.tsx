import Link from 'next/link';
import { footerNav, nonpartisanDisclaimer, org } from '@/data/site-content';

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-parchment-edge bg-parchment-deep">
      <div className="shell py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <p className="font-display text-lg font-semibold text-ink">{org.name}</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate">{org.description}</p>
            <a href={`mailto:${org.contactEmail}`} className="link-underline mt-4 inline-block text-sm">
              {org.contactEmail}
            </a>
          </div>

          {Object.entries(footerNav).map(([heading, links]) => (
            <nav key={heading} aria-label={heading}>
              <h2 className="eyebrow">{heading}</h2>
              <ul className="mt-4 space-y-2.5">
                {links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="text-sm text-slate transition hover:text-ink">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="rule mt-12 pt-6">
          <p className="max-w-3xl text-sm leading-relaxed text-slate">{nonpartisanDisclaimer}</p>
          <p className="mt-4 font-mono text-[0.65rem] uppercase tracking-wider text-slate-faint">
            © {new Date().getFullYear()} {org.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
