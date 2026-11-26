import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/candidate', '/recruiter', '/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!isProtected) {
    return NextResponse.next();
  }

  const hasAccessCookie = Boolean(request.cookies.get('ats_access_token')?.value);
  const hasRefreshCookie = Boolean(request.cookies.get('ats_refresh_token')?.value);

  // Optimistic cookie check at the edge; authoritative JWT & DB role validation
  // occurs via /api/v1/auth/me and protected backend endpoints on every load.
  if (!hasAccessCookie && !hasRefreshCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/candidate/:path*', '/recruiter/:path*', '/admin/:path*'],
};

