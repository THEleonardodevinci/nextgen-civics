import { NextResponse } from 'next/server';
import { contactInput } from '@/lib/validation/schemas';
import { createServiceClient } from '@/lib/supabase/server';
import { clientKey, rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const key = await clientKey(req);
  if (!rateLimit(`contact:${key}`, 5, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: 'Too many messages. Try again later.' }, { status: 429 });
  }

  const parsed = contactInput.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input.' }, { status: 400 });
  }
  if (parsed.data.website) return NextResponse.json({ message: 'Received.' });

  const { website: _ignored, ...row } = parsed.data;
  const { error } = await createServiceClient().from('contact_submissions').insert(row);
  if (error) return NextResponse.json({ error: 'Could not send your message.' }, { status: 500 });

  return NextResponse.json({ message: 'Message received. We reply to most inquiries within a week.' });
}
