import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const STAFF_ROLES = ['WRITER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN'];

/**
 * Refreshes the auth session and blocks /admin and /account for signed-out
 * users. This is a first gate for UX; the authoritative check is the RLS
 * policy on every table plus requireRole() in each page.
 */
export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isProtected = pathname.startsWith('/admin') || pathname.startsWith('/account');
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/admin') && user) {
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!data || !STAFF_ROLES.includes(data.role)) {
      const url = request.nextUrl.clone();
      url.pathname = '/account';
      url.searchParams.set('error', 'insufficient_role');
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|data/.*|.*\\.(?:svg|png|jpg|jpeg|webp|geojson)$).*)'],
};
