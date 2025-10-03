import {
  getTimeRemaining,
  formatTimeRemaining,
  getSessionStatus,
  extendSession,
  refreshAccessToken
} from '@/lib/auth/tokenManager';

// Mock fetch globally
global.fetch = jest.fn();

describe('Token Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-03T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getTimeRemaining', () => {
    it('should calculate correct time remaining in milliseconds', () => {
      const futureTime = new Date('2025-01-03T10:30:00Z'); // 30 minutes from now
      const remaining = getTimeRemaining(futureTime.toISOString());

      expect(remaining).toBe(30 * 60 * 1000); // 30 minutes in milliseconds
    });

    it('should return 0 for past times', () => {
      const pastTime = new Date('2025-01-03T09:30:00Z'); // 30 minutes ago
      const remaining = getTimeRemaining(pastTime.toISOString());

      expect(remaining).toBe(0);
    });

    it('should handle invalid date strings', () => {
      const remaining = getTimeRemaining('invalid-date');

      expect(remaining).toBe(0);
    });

    it('should handle null/undefined', () => {
      expect(getTimeRemaining(null as any)).toBe(0);
      expect(getTimeRemaining(undefined as any)).toBe(0);
    });

    it('should handle exact current time', () => {
      const now = new Date('2025-01-03T10:00:00Z');
      const remaining = getTimeRemaining(now.toISOString());

      expect(remaining).toBe(0);
    });
  });

  describe('formatTimeRemaining', () => {
    it('should format hours and minutes correctly', () => {
      const ms = (2 * 60 + 30) * 60 * 1000; // 2 hours 30 minutes
      const formatted = formatTimeRemaining(ms);

      expect(formatted).toBe('2h 30m');
    });

    it('should format only minutes when less than 1 hour', () => {
      const ms = 45 * 60 * 1000; // 45 minutes
      const formatted = formatTimeRemaining(ms);

      expect(formatted).toBe('45m');
    });

    it('should format only seconds when less than 1 minute', () => {
      const ms = 45 * 1000; // 45 seconds
      const formatted = formatTimeRemaining(ms);

      expect(formatted).toBe('45s');
    });

    it('should show "Expired" for 0 or negative values', () => {
      expect(formatTimeRemaining(0)).toBe('Expired');
      expect(formatTimeRemaining(-1000)).toBe('Expired');
    });

    it('should handle exact hour values', () => {
      const ms = 3 * 60 * 60 * 1000; // Exactly 3 hours
      const formatted = formatTimeRemaining(ms);

      expect(formatted).toBe('3h 0m');
    });

    it('should handle 1 minute exactly', () => {
      const ms = 60 * 1000; // Exactly 1 minute
      const formatted = formatTimeRemaining(ms);

      expect(formatted).toBe('1m');
    });

    it('should round down seconds', () => {
      const ms = 59999; // Just under 1 minute
      const formatted = formatTimeRemaining(ms);

      expect(formatted).toBe('59s');
    });

    it('should handle edge cases', () => {
      // Just over 1 hour
      expect(formatTimeRemaining(60 * 60 * 1000 + 1000)).toBe('1h 0m');

      // Maximum reasonable session time (7 days)
      expect(formatTimeRemaining(7 * 24 * 60 * 60 * 1000)).toBe('168h 0m');
    });
  });

  describe('getSessionStatus', () => {
    it('should fetch session status successfully', async () => {
      const mockResponse = {
        success: true,
        session: {
          id: 'session-123',
          expiresAt: '2025-01-03T11:00:00Z',
          lastActivity: '2025-01-03T10:00:00Z',
          isActive: true
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await getSessionStatus();

      expect(global.fetch).toHaveBeenCalledWith('/api/admin/auth/session-status', {
        method: 'GET',
        credentials: 'include'
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await getSessionStatus();

      expect(result).toEqual({
        success: false,
        error: 'Failed to get session status'
      });
    });

    it('should handle non-ok responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      const result = await getSessionStatus();

      expect(result).toEqual({
        success: false,
        error: 'Failed to get session status'
      });
    });

    it('should handle malformed JSON responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      const result = await getSessionStatus();

      expect(result).toEqual({
        success: false,
        error: 'Failed to get session status'
      });
    });

    it('should include credentials in request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await getSessionStatus();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include'
        })
      );
    });
  });

  describe('extendSession', () => {
    it('should extend session successfully', async () => {
      const mockResponse = {
        success: true,
        session: {
          id: 'session-123',
          expiresAt: '2025-01-03T11:00:00Z',
          extendedCount: 1
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await extendSession();

      expect(global.fetch).toHaveBeenCalledWith('/api/admin/auth/session-status', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'extend' })
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle extension failures', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Session expired' })
      });

      const result = await extendSession();

      expect(result).toEqual({
        success: false,
        error: 'Failed to extend session'
      });
    });

    it('should handle network errors during extension', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'));

      const result = await extendSession();

      expect(result).toEqual({
        success: false,
        error: 'Failed to extend session'
      });
    });

    it('should send correct action in request body', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await extendSession();

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body).toEqual({ action: 'extend' });
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh token successfully', async () => {
      const mockResponse = {
        success: true,
        accessToken: 'new-access-token',
        expiresAt: '2025-01-03T11:00:00Z'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await refreshAccessToken();

      expect(global.fetch).toHaveBeenCalledWith('/api/admin/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle refresh failures', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid refresh token' })
      });

      const result = await refreshAccessToken();

      expect(result).toEqual({
        success: false,
        error: 'Failed to refresh token'
      });
    });

    it('should handle network errors during refresh', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

      const result = await refreshAccessToken();

      expect(result).toEqual({
        success: false,
        error: 'Failed to refresh token'
      });
    });

    it('should not send body for refresh request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await refreshAccessToken();

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      expect(callArgs[1].body).toBeUndefined();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete session lifecycle', async () => {
      // 1. Get initial session status
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: {
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 60 min
          }
        })
      });

      const status = await getSessionStatus();
      expect(status.success).toBe(true);

      // 2. Calculate and format time remaining
      const remaining = getTimeRemaining(status.session.expiresAt);
      const formatted = formatTimeRemaining(remaining);
      expect(formatted).toBe('1h 0m');

      // 3. Simulate time passing - need to extend
      jest.advanceTimersByTime(52 * 60 * 1000); // 52 minutes pass, 8 min remaining

      // 4. Extend session
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: {
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // Reset to 60 min
          }
        })
      });

      const extended = await extendSession();
      expect(extended.success).toBe(true);

      // 5. Verify new time
      const newRemaining = getTimeRemaining(extended.session.expiresAt);
      const newFormatted = formatTimeRemaining(newRemaining);
      expect(newFormatted).toBe('1h 0m');
    });

    it('should handle session expiry and refresh flow', async () => {
      // Session about to expire
      const almostExpired = new Date(Date.now() + 30 * 1000).toISOString(); // 30 seconds

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: { expiresAt: almostExpired }
        })
      });

      const status = await getSessionStatus();
      const remaining = getTimeRemaining(status.session.expiresAt);
      const formatted = formatTimeRemaining(remaining);

      expect(formatted).toBe('30s');

      // Attempt to refresh token
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          accessToken: 'new-token',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        })
      });

      const refreshed = await refreshAccessToken();
      expect(refreshed.success).toBe(true);
      expect(refreshed.accessToken).toBe('new-token');
    });

    it('should handle complete session timeout', async () => {
      // Session expired
      const expired = new Date(Date.now() - 1000).toISOString(); // 1 second ago

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          session: { expiresAt: expired }
        })
      });

      const status = await getSessionStatus();
      const remaining = getTimeRemaining(status.session.expiresAt);
      const formatted = formatTimeRemaining(remaining);

      expect(remaining).toBe(0);
      expect(formatted).toBe('Expired');

      // Extension should fail
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Session expired' })
      });

      const extended = await extendSession();
      expect(extended.success).toBe(false);
    });
  });
});