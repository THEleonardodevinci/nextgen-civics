import { NextResponse } from 'next/server';
import { figureInput } from '@/lib/validation/schemas';
import { createClient } from '@/lib/supabase/server';
import { requireRoleApi } from '@/lib/auth/guards';

export async function POST(req: Request) {
  const auth = await requireRoleApi('ADMIN');
  if (!auth.profile) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const parsed = figureInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const id = typeof body.id === 'string' ? body.id : null;

  const { data, error } = id
    ? await supabase.from('political_figures').update(parsed.data).eq('id', id).select('id, name').single()
    : await supabase.from('political_figures').insert(parsed.data).select('id, name').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.rpc('log_action', {
    p_action: id ? 'figure.updated' : 'figure.created',
    p_object_type: 'political_figure',
    p_object_id: data.id,
    p_details: { name: data.name, state: parsed.data.state },
  });

  return NextResponse.json({ figure: data });
}

/** Marks a record verified as of today without touching any other field. */
export async function PATCH(req: Request) {
  const auth = await requireRoleApi('ADMIN');
  if (!auth.profile) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id, action } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

  const supabase = createClient();
  const patch =
    action === 'verify' ? { last_verified: new Date().toISOString().slice(0, 10), state: 'active' as const }
    : action === 'deactivate' ? { state: 'inactive' as const }
    : action === 'activate' ? { state: 'active' as const }
    : null;

  if (!patch) return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });

  const { error } = await supabase.from('political_figures').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.rpc('log_action', {
    p_action: `figure.${action}`, p_object_type: 'political_figure', p_object_id: id, p_details: {},
  });

  return NextResponse.json({ message: `Record ${action}d.` });
}

/**
 * Deactivation is the default. Outdated political records are kept so the
 * history stays auditable; only an explicit hard delete removes a row.
 */
export async function DELETE(req: Request) {
  const auth = await requireRoleApi('ADMIN');
  if (!auth.profile) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

  const supabase = createClient();
  const { error } = await supabase.from('political_figures').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.rpc('log_action', {
    p_action: 'figure.deleted', p_object_type: 'political_figure', p_object_id: id, p_details: {},
  });
  return NextResponse.json({ message: 'Record deleted.' });
}
