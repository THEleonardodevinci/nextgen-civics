import { NextResponse } from 'next/server';
import { correctionInput } from '@/lib/validation/schemas';
import { createServiceClient } from '@/lib/supabase/server';
import { clientKey, rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const key = await clientKey(req);
  if (!rateLimit(`corrections:${key}`, 8, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: 'Too many submissions. Try again later.' }, { status: 429 });
  }

  const parsed = correctionInput.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input.' }, { status: 400 });
  }
  if (parsed.data.website) return NextResponse.json({ message: 'Received.' });

  const { website: _ignored, ...row } = parsed.data;
  const { error } = await createServiceClient().from('correction_reports').insert({
    ...row,
    submitter_email: row.submitter_email || null,
    source_url: row.source_url || null,
  });
  if (error) return NextResponse.json({ error: 'Could not save your report.' }, { status: 500 });

  return NextResponse.json({ message: 'Thank you. An editor reviews every correction report.' });
}
