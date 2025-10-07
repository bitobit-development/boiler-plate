import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';

/**
 * Next.js Middleware for POS Authentication
 *
 * Protects POS routes by enforcing:
 * 1. Valid accessToken in cookies
 * 2. shop_user role verification
 * 3. 60-minute session timeout
 * 4. Redirects unauthenticated users to /pos/login
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow /pos/login to pass through
  if (pathname === '/pos/login') {
    return NextResponse.next();
  }

  // Allow API routes through - they have their own authentication
  if (pathname.startsWith('/api/pos')) {
    return NextResponse.next();
  }

  // Protect all other /pos/* routes
  if (pathname.startsWith('/pos')) {
    // Extract accessToken from cookies
    const accessToken = request.cookies.get('accessToken')?.value;

    if (!accessToken) {
      console.log('[Middleware] No access token found, redirecting to login');
      return redirectToLogin(request);
    }

    // Verify token and extract payload
    const decoded = verifyAccessToken(accessToken);

    if (!decoded) {
      console.log('[Middleware] Invalid or expired token, redirecting to login');
      return redirectToLogin(request);
    }

    // Verify shop_user role
    if (decoded.role !== 'shop_user') {
      console.log('[Middleware] Access denied - not a shop_user role:', decoded.role);
      return NextResponse.json(
        { error: 'Access denied. Shop user role required.' },
        { status: 403 }
      );
    }

    // Check token expiration (60-minute timeout)
    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = decoded.exp - now;

    if (timeRemaining <= 0) {
      console.log('[Middleware] Token expired, redirecting to login');
      return redirectToLogin(request);
    }

    // Add session warning header if token expiring soon (< 5 minutes)
    const response = NextResponse.next();
    if (timeRemaining < 300) {
      response.headers.set('X-Session-Expiring', 'true');
      response.headers.set('X-Session-Remaining', timeRemaining.toString());
    }

    // Add user info to response headers for downstream use
    response.headers.set('X-User-Id', decoded.userId);
    response.headers.set('X-User-Email', decoded.email);
    response.headers.set('X-User-Role', decoded.role);

    // Add pathname to headers for layout to access
    response.headers.set('x-pathname', pathname);

    return response;
  }

  // Allow all other routes through
  return NextResponse.next();
}

/**
 * Redirect to login page with return URL preserved
 */
function redirectToLogin(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  const returnUrl = url.pathname + url.search;

  url.pathname = '/pos/login';
  url.search = `?returnUrl=${encodeURIComponent(returnUrl)}`;

  return NextResponse.redirect(url);
}

/**
 * Matcher configuration for Next.js middleware
 * Only runs on /pos/* routes (excluding static files)
 */
export const config = {
  matcher: [
    /*
     * Match all POS routes except:
     * - /pos/login (handled in middleware logic)
     * - Static files (_next/static, _next/image)
     * - Favicon and images
     */
    '/pos/:path*',
  ],
};
