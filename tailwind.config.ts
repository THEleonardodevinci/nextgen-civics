import type { Config } from 'tailwindcss';

/**
 * Design tokens live here and in src/styles/globals.css.
 * Palette: parchment ground, ink navy, slate text, civic blue,
 * burgundy used sparingly for emphasis, gold for rare accents.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        parchment: { DEFAULT: '#F7F5F0', deep: '#EFEBE2', edge: '#DCD8CF' },
        ink: { DEFAULT: '#16233A', soft: '#243453', deep: '#0D1626' },
        slate: { DEFAULT: '#414A56', light: '#6B7280', faint: '#98A0AB' },
        civic: { DEFAULT: '#3E6FA3', deep: '#2F567F', wash: '#E7EEF6' },
        burgundy: { DEFAULT: '#8C3A46', wash: '#F5E9EA' },
        gold: { DEFAULT: '#B8892E', wash: '#F7EFDC' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        eyebrow: ['0.6875rem', { lineHeight: '1', letterSpacing: '0.14em' }],
        display: ['clamp(2.5rem, 6vw, 4.25rem)', { lineHeight: '1.02', letterSpacing: '-0.02em' }],
        title: ['clamp(1.75rem, 3.2vw, 2.5rem)', { lineHeight: '1.12', letterSpacing: '-0.015em' }],
      },
      maxWidth: { prose: '68ch', shell: '1200px' },
      boxShadow: {
        card: '0 1px 2px rgba(22,35,58,.05), 0 8px 24px -16px rgba(22,35,58,.28)',
        lift: '0 2px 4px rgba(22,35,58,.06), 0 18px 34px -18px rgba(22,35,58,.34)',
      },
      transitionDuration: { DEFAULT: '180ms' },
      keyframes: {
        rise: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'none' } },
      },
      animation: { rise: 'rise 240ms ease-out both' },
    },
  },
  plugins: [],
};
export default config;
