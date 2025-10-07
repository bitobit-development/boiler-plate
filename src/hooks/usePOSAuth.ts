import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface POSAuthUser {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
  kioskSessionId?: string;
}

interface POSAuthSession {
  tokenAge: number;
  expiresIn: number;
}

interface POSAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: POSAuthUser | null;
  session: POSAuthSession | null;
  error: string | null;
}

/**
 * Custom hook to verify POS authentication
 *
 * Checks authentication status via API endpoint and redirects to login if not authenticated
 * This works with HTTP-only cookies by making a server-side check
 *
 * @returns Authentication state including user info and session details
 */
export function usePOSAuth(): POSAuthState {
  const router = useRouter();
  const [state, setState] = useState<POSAuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    session: null,
    error: null,
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/pos/auth/verify', {
          method: 'GET',
          credentials: 'include', // Send cookies
        });

        const data = await response.json();

        if (!response.ok || !data.authenticated) {
          // Not authenticated - redirect to login
          console.log('[usePOSAuth] Not authenticated:', data.reason);
          router.push(`/pos/login?returnUrl=${encodeURIComponent(window.location.pathname)}`);
          setState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            session: null,
            error: data.reason || 'authentication_failed',
          });
          return;
        }

        // Authenticated successfully
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: data.user,
          session: data.session,
          error: null,
        });

        // Store shop user ID in localStorage for cart operations
        if (data.user?.userId) {
          localStorage.setItem('shop_user_id', data.user.userId);
        }

      } catch (error) {
        console.error('[usePOSAuth] Error checking authentication:', error);
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          session: null,
          error: 'network_error',
        });
        router.push('/pos/login');
      }
    };

    checkAuth();
  }, [router]);

  return state;
}
