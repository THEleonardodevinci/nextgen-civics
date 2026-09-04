/**
 * CSV helpers for the political figure importer.
 *
 * These live outside the route file because Next.js only permits its own
 * reserved exports from a route handler, and because keeping the parser here
 * makes it directly testable.
 */

export const FIGURE_COLUMNS = [
  'name', 'state_code', 'district_code', 'party', 'affiliation_type', 'office',
  'candidate_status', 'bio', 'website_url', 'campaign_url', 'email', 'phone',
  'mailing_address', 'image_url', 'source_url', 'last_verified',
] as const;

export type FigureColumn = (typeof FIGURE_COLUMNS)[number];

/**
 * Minimal RFC-4180 parser. Handles quoted fields, escaped quotes ("" inside a
 * quoted field), embedded newlines, and CRLF line endings. Blank lines are
 * dropped so a trailing newline does not produce a phantom row.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }

  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

/** Quote a value for CSV output. */
export function toCsvField(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/** Build a CSV document from a header row and record objects. */
export function toCsv(headers: readonly string[], rows: Record<string, unknown>[]): string {
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => toCsvField(r[h])).join(',')),
  ].join('\n');
}
