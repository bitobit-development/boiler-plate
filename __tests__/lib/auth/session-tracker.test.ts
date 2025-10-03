import {
  trackActivity,
  shouldExtendSession,
  shouldWarnUser,
  isSessionInactive,
  extendSessionIfNeeded,
  getSessionTimeRemaining,
  createAuditLog
} from '@/lib/auth/session-tracker';
import { SESSION_CONFIG } from '@/lib/auth/jwt';

// Mock dependencies
jest.mock('@/lib/db/models/AdminSession', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));

jest.mock('@/lib/db/models/AuditLog', () => ({
  create: jest.fn()
}));

import AdminSession from '@/lib/db/models/AdminSession';
import AuditLog from '@/lib/db/models/AuditLog';

describe('Session Tracker', () => {
  let mockSession: any;
  let originalConsoleLog: typeof console.log;

  beforeAll(() => {
    jest.useFakeTimers();
    originalConsoleLog = console.log;
    console.log = jest.fn();
  });

  afterAll(() => {
    jest.useRealTimers();
    console.log = originalConsoleLog;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.setSystemTime(new Date('2025-01-03T10:00:00Z'));

    mockSession = {
      _id: 'session-123',
      userId: 'admin-456',
      expiresAt: new Date('2025-01-03T11:00:00Z'), // 60 minutes from now
      lastActivity: new Date('2025-01-03T10:00:00Z'),
      isActive: true,
      extendedCount: 0,
      save: jest.fn()
    };
  });

  describe('trackActivity', () => {
    it('should update lastActivity timestamp', async () => {
      (AdminSession.findById as jest.Mock).mockResolvedValue(mockSession);

      await trackActivity('session-123');

      expect(AdminSession.findById).toHaveBeenCalledWith('session-123');
      expect(mockSession.lastActivity).toEqual(new Date('2025-01-03T10:00:00Z'));
      expect(mockSession.save).toHaveBeenCalled();
    });

    it('should handle missing session gracefully', async () => {
      (AdminSession.findById as jest.Mock).mockResolvedValue(null);

      await trackActivity('non-existent-session');

      expect(AdminSession.findById).toHaveBeenCalledWith('non-existent-session');
      expect(console.log).toHaveBeenCalledWith('Session not found for tracking: non-existent-session');
    });

    it('should handle database errors', async () => {
      (AdminSession.findById as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await trackActivity('session-123');

      expect(console.log).toHaveBeenCalledWith('Error tracking activity:', expect.any(Error));
    });

    it('should not update inactive sessions', async () => {
      mockSession.isActive = false;
      (AdminSession.findById as jest.Mock).mockResolvedValue(mockSession);

      await trackActivity('session-123');

      expect(mockSession.save).not.toHaveBeenCalled();
    });
  });

  describe('shouldExtendSession', () => {
    it('should return true when time remaining is less than 10 minutes', () => {
      // 9 minutes remaining
      const expiresAt = new Date(Date.now() + 9 * 60 * 1000);
      expect(shouldExtendSession(expiresAt)).toBe(true);
    });

    it('should return true when time remaining is exactly 10 minutes', () => {
      // Exactly 10 minutes remaining
      const expiresAt = new Date(Date.now() + SESSION_CONFIG.AUTO_EXTEND_THRESHOLD_MS);
      expect(shouldExtendSession(expiresAt)).toBe(true);
    });

    it('should return false when time remaining is more than 10 minutes', () => {
      // 11 minutes remaining
      const expiresAt = new Date(Date.now() + 11 * 60 * 1000);
      expect(shouldExtendSession(expiresAt)).toBe(false);
    });

    it('should return true for expired sessions', () => {
      // Already expired
      const expiresAt = new Date(Date.now() - 1000);
      expect(shouldExtendSession(expiresAt)).toBe(true);
    });
  });

  describe('shouldWarnUser', () => {
    it('should return true when time remaining is less than 5 minutes', () => {
      // 4 minutes remaining
      const expiresAt = new Date(Date.now() + 4 * 60 * 1000);
      expect(shouldWarnUser(expiresAt)).toBe(true);
    });

    it('should return true when time remaining is exactly 5 minutes', () => {
      // Exactly 5 minutes remaining
      const expiresAt = new Date(Date.now() + SESSION_CONFIG.WARNING_THRESHOLD_MS);
      expect(shouldWarnUser(expiresAt)).toBe(true);
    });

    it('should return false when time remaining is more than 5 minutes', () => {
      // 6 minutes remaining
      const expiresAt = new Date(Date.now() + 6 * 60 * 1000);
      expect(shouldWarnUser(expiresAt)).toBe(false);
    });

    it('should return true for expired sessions', () => {
      // Already expired
      const expiresAt = new Date(Date.now() - 1000);
      expect(shouldWarnUser(expiresAt)).toBe(true);
    });
  });

  describe('isSessionInactive', () => {
    it('should return true when last activity was more than 30 minutes ago', () => {
      // 31 minutes ago
      const lastActivity = new Date(Date.now() - 31 * 60 * 1000);
      expect(isSessionInactive(lastActivity)).toBe(true);
    });

    it('should return false when last activity was exactly 30 minutes ago', () => {
      // Exactly 30 minutes ago
      const lastActivity = new Date(Date.now() - SESSION_CONFIG.INACTIVITY_THRESHOLD_MS);
      expect(isSessionInactive(lastActivity)).toBe(false);
    });

    it('should return false when last activity was less than 30 minutes ago', () => {
      // 29 minutes ago
      const lastActivity = new Date(Date.now() - 29 * 60 * 1000);
      expect(isSessionInactive(lastActivity)).toBe(false);
    });

    it('should return false for recent activity', () => {
      // 1 minute ago
      const lastActivity = new Date(Date.now() - 60 * 1000);
      expect(isSessionInactive(lastActivity)).toBe(false);
    });
  });

  describe('extendSessionIfNeeded', () => {
    it('should extend session when time remaining is less than 10 minutes', async () => {
      // Set session to expire in 9 minutes
      mockSession.expiresAt = new Date(Date.now() + 9 * 60 * 1000);
      (AdminSession.findById as jest.Mock).mockResolvedValue(mockSession);

      const result = await extendSessionIfNeeded('session-123');

      expect(result).toBe(true);
      expect(mockSession.expiresAt.getTime()).toBeGreaterThan(Date.now() + 59 * 60 * 1000);
      expect(mockSession.extendedCount).toBe(1);
      expect(mockSession.save).toHaveBeenCalled();
    });

    it('should not extend session when time remaining is more than 10 minutes', async () => {
      // Set session to expire in 30 minutes
      mockSession.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      (AdminSession.findById as jest.Mock).mockResolvedValue(mockSession);

      const result = await extendSessionIfNeeded('session-123');

      expect(result).toBe(false);
      expect(mockSession.extendedCount).toBe(0);
      expect(mockSession.save).not.toHaveBeenCalled();
    });

    it('should not extend inactive sessions', async () => {
      mockSession.isActive = false;
      mockSession.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      (AdminSession.findById as jest.Mock).mockResolvedValue(mockSession);

      const result = await extendSessionIfNeeded('session-123');

      expect(result).toBe(false);
      expect(mockSession.save).not.toHaveBeenCalled();
    });

    it('should handle missing session', async () => {
      (AdminSession.findById as jest.Mock).mockResolvedValue(null);

      const result = await extendSessionIfNeeded('non-existent');

      expect(result).toBe(false);
    });

    it('should increment extendedCount on each extension', async () => {
      mockSession.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      mockSession.extendedCount = 3;
      (AdminSession.findById as jest.Mock).mockResolvedValue(mockSession);

      await extendSessionIfNeeded('session-123');

      expect(mockSession.extendedCount).toBe(4);
    });

    it('should create audit log when extending', async () => {
      mockSession.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      (AdminSession.findById as jest.Mock).mockResolvedValue(mockSession);

      await extendSessionIfNeeded('session-123');

      expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'admin-456',
        action: 'SESSION_EXTENDED',
        details: expect.objectContaining({
          sessionId: 'session-123',
          extendedCount: 1,
          reason: 'auto_extend'
        })
      }));
    });
  });

  describe('getSessionTimeRemaining', () => {
    it('should calculate correct time remaining', () => {
      const expiresAt = new Date(Date.now() + 45 * 60 * 1000); // 45 minutes from now
      const remaining = getSessionTimeRemaining(expiresAt);

      expect(remaining).toBe(45 * 60 * 1000);
    });

    it('should return 0 for expired sessions', () => {
      const expiresAt = new Date(Date.now() - 1000); // Already expired
      const remaining = getSessionTimeRemaining(expiresAt);

      expect(remaining).toBe(0);
    });

    it('should handle edge case of exactly expired', () => {
      const expiresAt = new Date(Date.now());
      const remaining = getSessionTimeRemaining(expiresAt);

      expect(remaining).toBe(0);
    });
  });

  describe('createAuditLog', () => {
    it('should create audit log for session events', async () => {
      await createAuditLog('user-123', 'SESSION_TIMEOUT', {
        sessionId: 'session-456',
        reason: 'inactivity'
      });

      expect(AuditLog.create).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'SESSION_TIMEOUT',
        details: {
          sessionId: 'session-456',
          reason: 'inactivity'
        },
        timestamp: expect.any(Date),
        ipAddress: undefined,
        userAgent: undefined
      });
    });

    it('should include IP and user agent when provided', async () => {
      await createAuditLog(
        'user-123',
        'LOGIN',
        { success: true },
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      }));
    });

    it('should handle audit log creation errors gracefully', async () => {
      (AuditLog.create as jest.Mock).mockRejectedValue(new Error('DB Error'));

      // Should not throw
      await expect(
        createAuditLog('user-123', 'SESSION_EXTEND', {})
      ).resolves.not.toThrow();

      expect(console.log).toHaveBeenCalledWith('Error creating audit log:', expect.any(Error));
    });
  });

  describe('Integration scenarios', () => {
    it('should handle typical session lifecycle', async () => {
      // Initial session state - 60 minutes remaining
      mockSession.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      (AdminSession.findById as jest.Mock).mockResolvedValue(mockSession);

      // Activity tracking should update lastActivity
      await trackActivity('session-123');
      expect(mockSession.save).toHaveBeenCalled();

      // Should not extend when plenty of time remaining
      expect(shouldExtendSession(mockSession.expiresAt)).toBe(false);
      expect(shouldWarnUser(mockSession.expiresAt)).toBe(false);

      // Simulate time passing - 51 minutes later (9 minutes remaining)
      jest.advanceTimersByTime(51 * 60 * 1000);
      mockSession.expiresAt = new Date(Date.now() + 9 * 60 * 1000);

      // Should auto-extend now
      expect(shouldExtendSession(mockSession.expiresAt)).toBe(true);
      const extended = await extendSessionIfNeeded('session-123');
      expect(extended).toBe(true);

      // Simulate more time passing - warning threshold
      jest.advanceTimersByTime(55 * 60 * 1000);
      mockSession.expiresAt = new Date(Date.now() + 4 * 60 * 1000);

      expect(shouldWarnUser(mockSession.expiresAt)).toBe(true);
    });

    it('should handle inactive session cleanup', async () => {
      // Set last activity to 35 minutes ago
      mockSession.lastActivity = new Date(Date.now() - 35 * 60 * 1000);
      (AdminSession.findById as jest.Mock).mockResolvedValue(mockSession);

      // Check if inactive
      expect(isSessionInactive(mockSession.lastActivity)).toBe(true);

      // Should still extend if needed despite inactivity
      mockSession.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      const extended = await extendSessionIfNeeded('session-123');
      expect(extended).toBe(true);
    });
  });
});