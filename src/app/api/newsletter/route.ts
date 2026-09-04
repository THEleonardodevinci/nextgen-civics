import { NextResponse } from 'next/server';
import { newsletterInput } from '@/lib/validation/schemas';
import { createServiceClient } from '@/lib/supabase/server';
import { clientKey, rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const key = await clientKey(req);
  if (!rateLimit(`newsletter:${key}`, 5, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }

  const parsed = newsletterInput.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input.' }, { status: 400 });
  }
  if (parsed.data.website) return NextResponse.json({ message: 'Subscribed.' }); // bot

  const supabase = createServiceClient();
  const { error } = await supabase.from('newsletter_subscribers').upsert(
    { email: parsed.data.email.toLowerCase(), first_name: parsed.data.first_name ?? null },
    { onConflict: 'email' }
  );
  if (error) return NextResponse.json({ error: 'Could not subscribe right now.' }, { status: 500 });

  return NextResponse.json({
    message: 'You are on the list. Every email includes a one-click unsubscribe link.',
  });
}
