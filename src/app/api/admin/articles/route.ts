import { NextResponse } from 'next/server';
import { articleInput } from '@/lib/validation/schemas';
import { createClient } from '@/lib/supabase/server';
import { requireRoleApi } from '@/lib/auth/guards';
import { readingTime, sanitizeHtml } from '@/lib/sanitize';
import { atLeast } from '@/lib/auth/guards';

/**
 * Create or update an article. Authorization is checked here AND enforced by
 * RLS on the articles table, so a forged request that skipped this route
 * would still be rejected by Postgres.
 */
export async function POST(req: Request) {
  const auth = await requireRoleApi('WRITER');
  if (!auth.profile) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const parsed = articleInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') },
      { status: 400 }
    );
  }

  const { tagIds, ...fields } = parsed.data;

  // Only EDITOR and above may publish or archive.
  const publishing = fields.status === 'published' || fields.status === 'archived';
  if (publishing && !atLeast(auth.profile.role, 'EDITOR')) {
    return NextResponse.json(
      { error: 'Publishing requires an editor. Save as a draft and ask an editor to review it.' },
      { status: 403 }
    );
  }

  const content = sanitizeHtml(fields.content ?? '');
  const published_at =
    fields.status === 'published' ? (fields.published_at ?? new Date().toISOString())
    : fields.status === 'scheduled' ? fields.published_at
    : null;

  const supabase = createClient();
  const id = typeof body.id === 'string' ? body.id : null;

  const payload = {
    ...fields,
    content,
    published_at,
    reading_time: readingTime(content),
    created_by: auth.profile.id,
  };

  const { data, error } = id
    ? await supabase.from('articles').update(payload).eq('id', id).select('id, slug, status').single()
    : await supabase.from('articles').insert(payload).select('id, slug, status').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Replace the tag set.
  await supabase.from('article_tags').delete().eq('article_id', data.id);
  if (tagIds.length) {
    await supabase.from('article_tags').insert(tagIds.map((tag_id) => ({ article_id: data.id, tag_id })));
  }

  await supabase.rpc('log_action', {
    p_action: id ? `article.${fields.status}` : 'article.created',
    p_object_type: 'article',
    p_object_id: data.id,
    p_details: { slug: data.slug, status: data.status },
  });

  return NextResponse.json({ article: data });
}

/** Archive by default; hard delete requires an explicit flag and ADMIN. */
export async function DELETE(req: Request) {
  const auth = await requireRoleApi('EDITOR');
  if (!auth.profile) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const hard = searchParams.get('hard') === 'true';
  if (!id) return NextResponse.json({ error: 'Missing article id.' }, { status: 400 });

  const supabase = createClient();

  if (hard) {
    if (!atLeast(auth.profile.role, 'ADMIN')) {
      return NextResponse.json({ error: 'Permanent deletion requires an administrator.' }, { status: 403 });
    }
    const { error } = await supabase.from('articles').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await supabase.rpc('log_action', {
      p_action: 'article.deleted', p_object_type: 'article', p_object_id: id, p_details: {},
    });
    return NextResponse.json({ message: 'Article deleted.' });
  }

  const { error } = await supabase.from('articles').update({ status: 'archived' }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await supabase.rpc('log_action', {
    p_action: 'article.archived', p_object_type: 'article', p_object_id: id, p_details: {},
  });
  return NextResponse.json({ message: 'Article archived. It can be restored from the articles table.' });
}
