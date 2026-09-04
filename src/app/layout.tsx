import type { Metadata } from 'next';
import { Newsreader, Public_Sans, IBM_Plex_Mono } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { org } from '@/data/site-content';
import '@/styles/globals.css';

const display = Newsreader({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Public_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  // org.url is validated in site-content.ts and always parses, but guard here
  // too: a throw at this point fails the whole production build.
  metadataBase: (() => { try { return new URL(org.url); } catch { return new URL('http://localhost:3000'); } })(),
  title: { default: `${org.name} — ${org.tagline}`, template: `%s — ${org.name}` },
  description: org.description,
  openGraph: { type: 'website', siteName: org.name, locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: org.name,
    url: org.url,
    description: org.description,
  };

  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50
                     focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-parchment"
        >
          Skip to content
        </a>
        <Navbar />
        <main id="main" className="flex-1">{children}</main>
        <Footer />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
      </body>
    </html>
  );
}
