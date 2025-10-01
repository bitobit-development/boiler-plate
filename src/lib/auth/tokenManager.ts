/**
 * Token Manager for handling JWT tokens in the admin dashboard
 * Provides secure storage and retrieval of authentication tokens
 */

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
}

// Export singleton instance
export const tokenManager = new TokenManager();

// Export type for convenience
export type { TokenData };