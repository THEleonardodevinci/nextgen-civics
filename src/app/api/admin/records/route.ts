import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRoleApi } from '@/lib/auth/guards';
import { resourceInput, teamMemberInput, sourceSchema } from '@/lib/validation/schemas';

const districtInput = z.object({
  district_code: z.string().regex(/^[A-Z]{2}-(\d{2}|AL)$/),
  state_code: z.string().length(2),
  state_name: z.string().min(2),
  district_number: z.string().min(1),
  population: z.number().int().nonnegative().nullable().optional(),
  voting_age_population: z.number().int().nonnegative().nullable().optional(),
  median_household_income: z.number().int().nonnegative().nullable().optional(),
  urban_rural: z.string().nullable().optional(),
  house_member: z.string().nullable().optional(),
  house_member_party: z.string().nullable().optional(),
  house_member_url: z.string().nullable().optional(),
  house_member_phone: z.string().nullable().optional(),
  house_member_office: z.string().nullable().optional(),
  recent_turnout_pct: z.number().min(0).max(100).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  data_sources: z.array(sourceSchema).default([]),
  last_updated: z.string().date().nullable().optional(),
});

/** Tables an ADMIN may manage through the generic record endpoint. */
const TABLES = {
  resources: { schema: resourceInput, pk: 'id', label: 'resource' },
  team_members: { schema: teamMemberInput, pk: 'id', label: 'team member' },
  districts: { schema: districtInput, pk: 'district_code', label: 'district' },
} as const;

type TableName = keyof typeof TABLES;

function resolve(name: string | null) {
  if (!name || !(name in TABLES)) return null;
  return { name: name as TableName, ...TABLES[name as TableName] };
}

export async function POST(req: Request) {
  const auth = await requireRoleApi('ADMIN');
  if (!auth.profile) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const table = resolve(body.table);
  if (!table) return NextResponse.json({ error: 'Unknown table.' }, { status: 400 });

  const parsed = table.schema.safeParse(body.record);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const id = body.id ?? null;

  // parsed.data is a discriminated union across the three permitted tables and
  // has already passed that table's schema. The cast is only required because
  // the table name is chosen at runtime, so the client cannot infer a row type.
  const record = parsed.data as never;

  const { data, error } = id
    ? await supabase.from(table.name).update(record).eq(table.pk, id).select().single()
    : await supabase.from(table.name).insert(record).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.rpc('log_action', {
    p_action: `${table.label.replace(' ', '_')}.${id ? 'updated' : 'created'}`,
    p_object_type: table.name,
    p_object_id: String((data as Record<string, unknown>)[table.pk]),
    p_details: {},
  });

  return NextResponse.json({ record: data });
}

export async function DELETE(req: Request) {
  const auth = await requireRoleApi('ADMIN');
  if (!auth.profile) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const table = resolve(searchParams.get('table'));
  const id = searchParams.get('id');
  if (!table || !id) return NextResponse.json({ error: 'Missing table or id.' }, { status: 400 });

  const supabase = createClient();
  const { error } = await supabase.from(table.name).delete().eq(table.pk, id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.rpc('log_action', {
    p_action: `${table.label.replace(' ', '_')}.deleted`,
    p_object_type: table.name, p_object_id: id, p_details: {},
  });

  return NextResponse.json({ message: `${table.label} deleted.` });
}
