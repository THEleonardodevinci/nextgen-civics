export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

export const fmtDateShort = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export const fmtNumber = (n: number | null | undefined) =>
  n === null || n === undefined ? null : n.toLocaleString('en-US');

export const fmtMoney = (n: number | null | undefined) =>
  n === null || n === undefined ? null : `$${n.toLocaleString('en-US')}`;

/** 'IL-05' -> 'Illinois — District 5'. Needs the state name from the DB. */
export const districtLabel = (stateName: string, districtNumber: string) =>
  districtNumber === 'AL' ? `${stateName} — At-large` : `${stateName} — District ${Number(districtNumber)}`;

export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
