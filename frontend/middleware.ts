import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js middleware — runs in Edge Runtime.
 *
 * IMPORTANT: Cannot import firebase-admin here (Node.js only).
 * This middleware only checks for the PRESENCE of an auth token.
 * Actual token verification happens in API route handlers via lib/auth/server.ts.
 */

const ADMIN_PATHS = ['/admin'];
const AUTH_REQUIRED_PATHS = ['/checkout', '/orders', '/account'];

function hasAuthToken(request: NextRequest): boolean {
  // Check httpOnly session cookie
  if (request.cookies.get('session')?.value) return true;

  // Check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) return true;

  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if route requires authentication
  const needsAuth =
    AUTH_REQUIRED_PATHS.some((p) => pathname.startsWith(p)) ||
    ADMIN_PATHS.some((p) => pathname.startsWith(p));

  if (!needsAuth) return NextResponse.next();

  // Check token presence (not validity — that's done server-side in API routes)
  if (!hasAuthToken(request)) {
    // API routes: 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Pages: redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
