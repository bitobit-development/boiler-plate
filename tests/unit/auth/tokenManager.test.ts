/**
 * Unit tests for Token Manager
 * Tests token storage, retrieval, expiry checks, and session management
 */

import {
  tokenManager,
  getSessionStatus,
  extendSession,
  refreshAccessToken,
  getTimeRemaining,
  needsTokenRefresh,
  isSessionExpiringSoon,
  formatTimeRemaining
} from '@/lib/auth/tokenManager';

// Mock fetch globally
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('Token Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Token Storage and Retrieval', () => {
    it('should store tokens correctly', () => {
      const tokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        accessExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 60 minutes
        refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };

      tokenManager.setTokens(tokens);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('admin_token', 'access-token-123');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('admin_refresh_token', 'refresh-token-456');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('admin_token_expiry', tokens.accessExpiresAt);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('admin_refresh_expiry', tokens.refreshExpiresAt);
    });

    it('should retrieve valid access token', () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      localStorageMock.setItem('admin_token', 'valid-token');
      localStorageMock.setItem('admin_token_expiry', futureDate.toISOString());

      const token = tokenManager.getAccessToken();

      expect(token).toBe('valid-token');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('admin_token');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('admin_token_expiry');
    });

    it('should return null for expired access token', () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      localStorageMock.setItem('admin_token', 'expired-token');
      localStorageMock.setItem('admin_token_expiry', pastDate.toISOString());

      const token = tokenManager.getAccessToken();

      expect(token).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('admin_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('admin_token_expiry');
    });

    it('should retrieve valid refresh token', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      localStorageMock.setItem('admin_refresh_token', 'valid-refresh');
      localStorageMock.setItem('admin_refresh_expiry', futureDate.toISOString());

      const token = tokenManager.getRefreshToken();

      expect(token).toBe('valid-refresh');
    });

    it('should clear all tokens when refresh token expires', () => {
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      localStorageMock.setItem('admin_refresh_token', 'expired-refresh');
      localStorageMock.setItem('admin_refresh_expiry', pastDate.toISOString());
      localStorageMock.setItem('admin_token', 'some-access-token');

      const token = tokenManager.getRefreshToken();

      expect(token).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('admin_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('admin_refresh_token');
    });
  });

  describe('Token Expiry Checks', () => {
    it('should detect when access token is expiring soon (within 1 minute)', () => {
      const expiringDate = new Date(Date.now() + 30 * 1000); // 30 seconds from now
      localStorageMock.setItem('admin_token_expiry', expiringDate.toISOString());

      const expiringSoon = tokenManager.isAccessTokenExpiringSoon();

      expect(expiringSoon).toBe(true);
    });

    it('should detect when access token is NOT expiring soon', () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      localStorageMock.setItem('admin_token_expiry', futureDate.toISOString());

      const expiringSoon = tokenManager.isAccessTokenExpiringSoon();

      expect(expiringSoon).toBe(false);
    });

    it('should return true when no expiry is stored', () => {
      const expiringSoon = tokenManager.isAccessTokenExpiringSoon();

      expect(expiringSoon).toBe(true);
    });
  });

  describe('Token Management Operations', () => {
    it('should clear only access token', () => {
      localStorageMock.setItem('admin_token', 'access-token');
      localStorageMock.setItem('admin_token_expiry', 'some-date');
      localStorageMock.setItem('admin_refresh_token', 'refresh-token');
      localStorageMock.setItem('admin_refresh_expiry', 'another-date');

      tokenManager.clearAccessToken();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('admin_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('admin_token_expiry');
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('admin_refresh_token');
    });

    it('should clear all tokens', () => {
      localStorageMock.setItem('admin_token', 'access-token');
      localStorageMock.setItem('admin_token_expiry', 'some-date');
      localStorageMock.setItem('admin_refresh_token', 'refresh-token');
      localStorageMock.setItem('admin_refresh_expiry', 'another-date');

      tokenManager.clearTokens();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('admin_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('admin_token_expiry');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('admin_refresh_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('admin_refresh_expiry');
    });

    it('should update access token', () => {
      const newToken = 'new-access-token';
      const newExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      tokenManager.updateAccessToken(newToken, newExpiry);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('admin_token', newToken);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('admin_token_expiry', newExpiry);
    });
  });

  describe('Session Status API', () => {
    it('should get session status successfully', async () => {
      const mockStatus = {
        isValid: true,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        expiresIn: 1800,
        lastActivityAt: new Date().toISOString(),
        needsRefresh: false
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockStatus
      });

      const status = await getSessionStatus();

      expect(status).toEqual(mockStatus);
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/auth/session-status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith('admin_token_expiry', mockStatus.expiresAt);
    });

    it('should return null on 401 response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401
      });

      const status = await getSessionStatus();

      expect(status).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const status = await getSessionStatus();

      expect(status).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Session Extension', () => {
    it('should extend session successfully', async () => {
      const mockStatus = {
        isValid: true,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Extended by 60 minutes
        expiresIn: 3600,
        lastActivityAt: new Date().toISOString(),
        needsRefresh: false
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockStatus
      });

      const status = await extendSession();

      expect(status).toEqual(mockStatus);
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/auth/session-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith('admin_token_expiry', mockStatus.expiresAt);
    });

    it('should return null when extension fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401
      });

      const status = await extendSession();

      expect(status).toBeNull();
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token successfully', async () => {
      const mockResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600 // 60 minutes in seconds
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await refreshAccessToken();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      // Check that new expiry was stored
      const expectedExpiry = new Date(Date.now() + 3600 * 1000);
      const storedExpiry = localStorageMock.setItem.mock.calls.find(
        call => call[0] === 'admin_token_expiry'
      )?.[1];

      expect(storedExpiry).toBeDefined();
      const storedDate = new Date(storedExpiry as string);
      expect(Math.abs(storedDate.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
    });

    it('should return false when refresh fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401
      });

      const result = await refreshAccessToken();

      expect(result).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });
  });

  describe('Time Calculation Utilities', () => {
    it('should calculate time remaining correctly', () => {
      const futureDate = new Date(Date.now() + 45 * 60 * 1000); // 45 minutes from now
      localStorageMock.setItem('admin_token_expiry', futureDate.toISOString());

      const remaining = getTimeRemaining();

      expect(remaining).toBeCloseTo(45 * 60, -1); // Approximately 2700 seconds
    });

    it('should return 0 for expired token', () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      localStorageMock.setItem('admin_token_expiry', pastDate.toISOString());

      const remaining = getTimeRemaining();

      expect(remaining).toBe(0);
    });

    it('should return 0 when no expiry is stored', () => {
      const remaining = getTimeRemaining();

      expect(remaining).toBe(0);
    });

    it('should detect when token needs refresh (< 10 minutes)', () => {
      const nearExpiry = new Date(Date.now() + 8 * 60 * 1000); // 8 minutes
      localStorageMock.setItem('admin_token_expiry', nearExpiry.toISOString());

      expect(needsTokenRefresh()).toBe(true);
    });

    it('should not need refresh when plenty of time remains', () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      localStorageMock.setItem('admin_token_expiry', futureDate.toISOString());

      expect(needsTokenRefresh()).toBe(false);
    });

    it('should detect when session is expiring soon (< 5 minutes)', () => {
      const nearExpiry = new Date(Date.now() + 4 * 60 * 1000); // 4 minutes
      localStorageMock.setItem('admin_token_expiry', nearExpiry.toISOString());

      expect(isSessionExpiringSoon()).toBe(true);
    });

    it('should not be expiring soon when > 5 minutes remain', () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      localStorageMock.setItem('admin_token_expiry', futureDate.toISOString());

      expect(isSessionExpiringSoon()).toBe(false);
    });
  });

  describe('Time Formatting', () => {
    it('should format time remaining as MM:SS', () => {
      expect(formatTimeRemaining(0)).toBe('0:00');
      expect(formatTimeRemaining(59)).toBe('0:59');
      expect(formatTimeRemaining(60)).toBe('1:00');
      expect(formatTimeRemaining(90)).toBe('1:30');
      expect(formatTimeRemaining(3599)).toBe('59:59');
      expect(formatTimeRemaining(3600)).toBe('60:00');
    });

    it('should pad seconds with leading zero', () => {
      expect(formatTimeRemaining(61)).toBe('1:01');
      expect(formatTimeRemaining(605)).toBe('10:05');
    });

    it('should handle negative values', () => {
      expect(formatTimeRemaining(-10)).toBe('0:00');
    });
  });

  describe('60-Minute Session Timeout Specifics', () => {
    it('should store 60-minute expiry correctly', () => {
      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        accessExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Exactly 60 minutes
        refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      tokenManager.setTokens(tokens);

      const storedExpiry = localStorageMock.setItem.mock.calls.find(
        call => call[0] === 'admin_token_expiry'
      )?.[1];

      const expiryDate = new Date(storedExpiry as string);
      const expectedExpiry = new Date(tokens.accessExpiresAt);
      expect(expiryDate.getTime()).toBe(expectedExpiry.getTime());
    });

    it('should calculate correct refresh timing for 60-minute session', () => {
      // Set expiry to 55 minutes from now (should need refresh at < 10 min)
      const expiry55Min = new Date(Date.now() + 55 * 60 * 1000);
      localStorageMock.setItem('admin_token_expiry', expiry55Min.toISOString());
      expect(needsTokenRefresh()).toBe(false);

      // Set expiry to 9 minutes from now (should need refresh)
      const expiry9Min = new Date(Date.now() + 9 * 60 * 1000);
      localStorageMock.setItem('admin_token_expiry', expiry9Min.toISOString());
      expect(needsTokenRefresh()).toBe(true);
    });

    it('should calculate correct warning timing for 60-minute session', () => {
      // Set expiry to 6 minutes from now (should not warn yet)
      const expiry6Min = new Date(Date.now() + 6 * 60 * 1000);
      localStorageMock.setItem('admin_token_expiry', expiry6Min.toISOString());
      expect(isSessionExpiringSoon()).toBe(false);

      // Set expiry to 4 minutes from now (should warn)
      const expiry4Min = new Date(Date.now() + 4 * 60 * 1000);
      localStorageMock.setItem('admin_token_expiry', expiry4Min.toISOString());
      expect(isSessionExpiringSoon()).toBe(true);
    });
  });
});