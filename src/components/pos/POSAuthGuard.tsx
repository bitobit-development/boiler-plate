'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Client-side authentication guard for POS pages
 * Redirects to login if no accessToken cookie is found
 *
 * This is needed because Next.js middleware doesn't work with custom servers,
 * and server-side layout redirects cause loops.
 */
export function POSAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip auth check if we're on the login page
    if (pathname === '/pos/login') {
      return;
    }

    // Check for accessToken cookie
    const hasAccessToken = document.cookie
      .split(';')
      .some(cookie => cookie.trim().startsWith('accessToken='));

    if (!hasAccessToken) {
      console.log('[POS Auth Guard] No access token found, redirecting to login');
      router.push(`/pos/login?returnUrl=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, router]);

  return <>{children}</>;
}
