/**
 * Token Manager Utility
 * Handles token refresh, session status, and session extension
 */

interface SessionStatus {
  isValid: boolean;
  expiresAt: string;
  expiresIn: number;
  lastActivityAt: string;
  needsRefresh: boolean;
}

// Backend response structure from session-status endpoint
interface SessionStatusResponse {
  success: boolean;
  session: {
    id: string;
    status: string;
    expiresAt: string;
    lastActivityAt: string;
    createdAt: string;
  };
  timing: {
    minutesRemaining: number;
    secondsRemaining: number;
    minutesSinceActivity: number;
    shouldWarn: boolean;
    shouldExtend: boolean;
  };
  user: {
    id: string;
    email: string;
    role: string;
  };
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface TokenData {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
}

class TokenManager {
  private readonly ACCESS_TOKEN_KEY = 'admin_token';
  private readonly REFRESH_TOKEN_KEY = 'admin_refresh_token';
  private readonly TOKEN_EXPIRY_KEY = 'admin_token_expiry';
  private readonly REFRESH_EXPIRY_KEY = 'admin_refresh_expiry';

  /**
   * Store tokens in localStorage
   */
  setTokens(tokens: TokenData): void {
    try {
      // Store access token and its expiry
      localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken);
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, tokens.accessExpiresAt);

      // Store refresh token and its expiry
      localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
      localStorage.setItem(this.REFRESH_EXPIRY_KEY, tokens.refreshExpiresAt);
    } catch (error) {
      console.error('Failed to store tokens:', error);
    }
  }

  /**
   * Get the access token if it's still valid
   */
  getAccessToken(): string | null {
    try {
      const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
      const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);

      if (!token || !expiry) {
        return null;
      }

      // Check if token is expired
      const expiryDate = new Date(expiry);
      if (expiryDate <= new Date()) {
        // Token expired, clear it
        this.clearAccessToken();
        return null;
      }

      return token;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  /**
   * Get the refresh token if it's still valid
   */
  getRefreshToken(): string | null {
    try {
      const token = localStorage.getItem(this.REFRESH_TOKEN_KEY);
      const expiry = localStorage.getItem(this.REFRESH_EXPIRY_KEY);

      if (!token || !expiry) {
        return null;
      }

      // Check if token is expired
      const expiryDate = new Date(expiry);
      if (expiryDate <= new Date()) {
        // Refresh token expired, clear all tokens
        this.clearTokens();
        return null;
      }

      return token;
    } catch (error) {
      console.error('Failed to get refresh token:', error);
      return null;
    }
  }

  /**
   * Check if access token is about to expire (within 1 minute)
   */
  isAccessTokenExpiringSoon(): boolean {
    try {
      const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
      if (!expiry) {
        return true;
      }

      const expiryDate = new Date(expiry);
      const now = new Date();
      const oneMinuteFromNow = new Date(now.getTime() + 60000);

      return expiryDate <= oneMinuteFromNow;
    } catch (error) {
      console.error('Failed to check token expiry:', error);
      return true;
    }
  }

  /**
   * Clear only the access token (used when refreshing)
   */
  clearAccessToken(): void {
    try {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
    } catch (error) {
      console.error('Failed to clear access token:', error);
    }
  }

  /**
   * Clear all tokens (used on logout)
   */
  clearTokens(): void {
    try {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_EXPIRY_KEY);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  /**
   * Update only the access token (after refresh)
   */
  updateAccessToken(accessToken: string, accessExpiresAt: string): void {
    try {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, accessExpiresAt);
    } catch (error) {
      console.error('Failed to update access token:', error);
    }
  }

  /**
   * Store token expiry in localStorage for client-side checks
   */
  storeTokenExpiry(expiryTime: Date | string): void {
    const expiry = typeof expiryTime === 'string' ? expiryTime : expiryTime.toISOString();
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiry);
    }
  }

  /**
   * Get stored token expiry from localStorage
   */
  getStoredTokenExpiry(): Date | null {
    if (typeof window === 'undefined') return null;

    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiry) return null;

    const date = new Date(expiry);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Clear stored token expiry
   */
  clearStoredTokenExpiry(): void {
    if (typeof window !== 'undefined') {
      this.clearTokens();
    }
  }
}

// Export singleton instance
export const tokenManager = new TokenManager();

/**
 * Get current session status from the backend
 */
export async function getSessionStatus(): Promise<SessionStatus | null> {
  try {
    console.log('[SessionStatus] Fetching session status...');

    const response = await fetch('/api/admin/auth/session-status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Essential for sending cookies
    });

    console.log('[SessionStatus] Response status:', response.status);

    if (!response.ok) {
      if (response.status === 401) {
        console.log('[SessionStatus] Session expired (401)');
        tokenManager.clearStoredTokenExpiry();
        return null;
      }
      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[SessionStatus] Bad request (400):', errorData);
        // Return null for bad request but don't clear tokens yet
        return null;
      }
      throw new Error(`Failed to get session status: ${response.status}`);
    }

    const data: SessionStatusResponse = await response.json();
    console.log('[SessionStatus] Raw response:', data);

    // Transform backend response to expected SessionStatus format
    const sessionStatus: SessionStatus = {
      isValid: data.success && data.session.status === 'active',
      expiresAt: data.session.expiresAt,
      expiresIn: data.timing.secondsRemaining,
      lastActivityAt: data.session.lastActivityAt,
      needsRefresh: data.timing.shouldExtend || data.timing.minutesRemaining < 10
    };

    console.log('[SessionStatus] Transformed status:', sessionStatus);

    // Store the expiry time for client-side checks
    if (sessionStatus.expiresAt) {
      tokenManager.storeTokenExpiry(sessionStatus.expiresAt);
    }

    return sessionStatus;
  } catch (error) {
    console.error('[SessionStatus] Error getting session status:', error);
    return null;
  }
}

/**
 * Extend the current session
 */
export async function extendSession(): Promise<SessionStatus | null> {
  try {
    console.log('[ExtendSession] Extending session...');

    const response = await fetch('/api/admin/auth/session-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ extendMinutes: 60 }), // Default to 60 minutes extension
      credentials: 'include', // Essential for sending cookies
    });

    console.log('[ExtendSession] Response status:', response.status);

    if (!response.ok) {
      if (response.status === 401) {
        console.log('[ExtendSession] Session expired (401)');
        tokenManager.clearStoredTokenExpiry();
        return null;
      }
      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[ExtendSession] Bad request (400):', errorData);
        return null;
      }
      throw new Error(`Failed to extend session: ${response.status}`);
    }

    const data = await response.json();
    console.log('[ExtendSession] Response:', data);

    // After extending, fetch the updated session status
    // The extend endpoint returns a different structure, so we need to get the full status
    const updatedStatus = await getSessionStatus();

    console.log('[ExtendSession] Updated status:', updatedStatus);

    return updatedStatus;
  } catch (error) {
    console.error('[ExtendSession] Error extending session:', error);
    return null;
  }
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken(): Promise<boolean> {
  try {
    console.log('[RefreshToken] Refreshing access token...');

    const response = await fetch('/api/admin/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Essential for sending cookies
    });

    console.log('[RefreshToken] Response status:', response.status);

    if (!response.ok) {
      if (response.status === 401) {
        console.log('[RefreshToken] Refresh token expired (401)');
        tokenManager.clearStoredTokenExpiry();
        return false;
      }
      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[RefreshToken] Bad request (400):', errorData);
        return false;
      }
      throw new Error(`Failed to refresh token: ${response.status}`);
    }

    const data: RefreshResponse = await response.json();
    console.log('[RefreshToken] Token refreshed successfully');

    // Calculate and store new expiry time
    if (data.expiresIn) {
      const expiryDate = new Date(Date.now() + data.expiresIn * 1000);
      tokenManager.storeTokenExpiry(expiryDate);
      console.log('[RefreshToken] New expiry:', expiryDate.toISOString());
    }

    return true;
  } catch (error) {
    console.error('[RefreshToken] Error refreshing token:', error);
    return false;
  }
}

/**
 * Calculate time remaining until token expiry in seconds
 */
export function getTimeRemaining(): number {
  const expiry = tokenManager.getStoredTokenExpiry();
  if (!expiry) return 0;

  const now = new Date();
  const remaining = Math.floor((expiry.getTime() - now.getTime()) / 1000);
  return Math.max(0, remaining);
}

/**
 * Check if session needs refresh (< 10 minutes remaining)
 */
export function needsTokenRefresh(): boolean {
  const remaining = getTimeRemaining();
  return remaining > 0 && remaining < 600; // 10 minutes in seconds
}

/**
 * Check if session is about to expire (< 5 minutes remaining)
 */
export function isSessionExpiringSoon(): boolean {
  const remaining = getTimeRemaining();
  return remaining > 0 && remaining < 300; // 5 minutes in seconds
}

/**
 * Format seconds to human-readable time string (e.g., "1d 2h 30m", "45m 30s", "2m 15s")
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '0s';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0 || days > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || hours > 0 || days > 0) {
    parts.push(`${minutes}m`);
  }
  // Only show seconds if less than 1 hour remaining
  if (days === 0 && hours === 0) {
    parts.push(`${secs}s`);
  }

  return parts.join(' ');
}

/**
 * Format seconds to short MM:SS string for compact displays
 */
export function formatTimeRemainingShort(seconds: number): string {
  if (seconds <= 0) return '0:00';

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Export type for convenience
export type { TokenData, SessionStatus, RefreshResponse };