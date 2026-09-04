import { NextResponse } from 'next/server';
import { figureInput } from '@/lib/validation/schemas';
import { createClient } from '@/lib/supabase/server';
import { requireRoleApi } from '@/lib/auth/guards';
import { slugify } from '@/lib/sanitize';
import { FIGURE_COLUMNS as COLUMNS, parseCsv } from '@/lib/csv';

/** GET returns a template with the exact headers the importer expects. */
export async function GET() {
  const auth = await requireRoleApi('ADMIN');
  if (!auth.profile) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const example = [
    '[SAMPLE] Example Name', 'IL', 'IL-05', 'Sample Party', 'third_party', 'U.S. House',
    'third_party_candidate', 'One or two neutral sentences.', 'https://example.org', '', '', '',
    '', '', 'https://www.fec.gov', '2026-01-15',
  ];

  const csv = [COLUMNS.join(','), example.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="political-figures-template.csv"',
    },
  });
}

/**
 * Two-phase import. `dryRun: true` validates and returns a per-row report;
 * the UI shows valid / warning / invalid counts and requires confirmation
 * before a second call actually writes.
 */
export async function POST(req: Request) {
  const auth = await requireRoleApi('ADMIN');
  if (!auth.profile) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { csv, dryRun = true } = await req.json().catch(() => ({ csv: '' }));
  if (typeof csv !== 'string' || !csv.trim()) {
    return NextResponse.json({ error: 'No CSV content received.' }, { status: 400 });
  }

  const rows = parseCsv(csv);
  const header = rows.shift()?.map((h) => h.trim().toLowerCase()) ?? [];
  const missing = ['name', 'state_code'].filter((c) => !header.includes(c));
  if (missing.length) {
    return NextResponse.json(
      { error: `The CSV is missing required columns: ${missing.join(', ')}. Download the template for the expected format.` },
      { status: 400 }
    );
  }

  const report = rows.map((cells, index) => {
    const get = (col: string) => {
      const at = header.indexOf(col);
      return at === -1 ? '' : (cells[at] ?? '').trim();
    };

    const warnings: string[] = [];
    const sourceUrl = get('source_url');
    if (!sourceUrl) warnings.push('No source URL — the record will be flagged as needing verification.');
    if (!get('last_verified')) warnings.push('No verification date.');

    const candidate = {
      name: get('name'),
      slug: slugify(get('name')),
      state_code: get('state_code').toUpperCase(),
      district_code: get('district_code').toUpperCase() || null,
      party: get('party') || null,
      affiliation_type: (get('affiliation_type') || 'independent') as 'third_party' | 'independent' | 'other',
      office: get('office') || null,
      candidate_status: (get('candidate_status') || 'declared_candidate') as never,
      bio: get('bio') || null,
      image_url: get('image_url') || null,
      website_url: get('website_url') || null,
      campaign_url: get('campaign_url') || null,
      email: get('email') || null,
      phone: get('phone') || null,
      mailing_address: get('mailing_address') || null,
      social_links: {},
      source_urls: sourceUrl ? [{ label: 'Imported source', url: sourceUrl }] : [],
      is_sample: get('name').toLowerCase().includes('[sample]'),
      state: (sourceUrl && get('last_verified') ? 'active' : 'needs_verification') as never,
      last_verified: get('last_verified') || null,
    };

    const parsed = figureInput.safeParse(candidate);

    return {
      line: index + 2, // +1 for header, +1 for 1-indexing
      name: candidate.name || '(blank)',
      valid: parsed.success,
      errors: parsed.success ? [] : parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      warnings,
      data: parsed.success ? parsed.data : null,
    };
  });

  const valid = report.filter((r) => r.valid);
  const invalid = report.filter((r) => !r.valid);
  const warned = valid.filter((r) => r.warnings.length);

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      summary: { total: report.length, valid: valid.length, warnings: warned.length, invalid: invalid.length },
      rows: report,
    });
  }

  if (!valid.length) {
    return NextResponse.json({ error: 'No valid rows to import.' }, { status: 400 });
  }

  const supabase = createClient();
  const { error, count } = await supabase
    .from('political_figures')
    // The payload is already validated by figureInput above; the cast is only
    // needed because this project has no generated Database types, so the
    // client cannot infer the row shape for this table.
    .upsert(valid.map((r) => r.data) as never, { onConflict: 'district_code,slug', count: 'exact' });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.rpc('log_action', {
    p_action: 'figure.imported',
    p_object_type: 'political_figure',
    p_object_id: 'bulk',
    p_details: { imported: count ?? valid.length, skipped: invalid.length },
  });

  return NextResponse.json({
    message: `Imported ${count ?? valid.length} records. ${invalid.length} rows were skipped.`,
  });
}
