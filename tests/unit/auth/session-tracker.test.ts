/**
 * Unit tests for Session Activity Tracker
 * Tests session monitoring, auto-extension, and activity tracking
 */

import {
  trackSessionActivity,
  checkSessionInactivity,
  getExpiringSessions,
  cleanupExpiredSessions,
  manualExtendSession,
  getSessionStatistics
} from '@/lib/auth/session-tracker';
import { AdminSession } from '@/lib/db/models/AdminSession';
import { AuditLog } from '@/lib/db/models/AuditLog';
import { SESSION_CONFIG } from '@/lib/auth/jwt';

// Mock the models
jest.mock('@/lib/db/models/AdminSession');
jest.mock('@/lib/db/models/AuditLog');

describe('Session Activity Tracker', () => {
  const mockSession = {
    id: 'session-123',
    userId: 'user-456',
    token: 'token-789',
    status: 'active',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
    createdAt: new Date(),
    lastActivityAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.error to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('trackSessionActivity', () => {
    it('should track activity and calculate time remaining correctly', async () => {
      const futureTime = new Date(Date.now() + 45 * 60 * 1000); // 45 minutes
      (AdminSession.findOne as jest.Mock).mockResolvedValue({
        ...mockSession,
        expiresAt: futureTime
      });
      (AdminSession.updateActivity as jest.Mock).mockResolvedValue(true);

      const result = await trackSessionActivity(
        'session-123',
        'user-456',
        'admin@test.com',
        'admin'
      );

      expect(result.minutesRemaining).toBeCloseTo(45, 0);
      expect(result.shouldExtend).toBe(false); // More than 10 minutes remaining
      expect(result.shouldWarn).toBe(false); // More than 5 minutes remaining
      expect(AdminSession.updateActivity).toHaveBeenCalledWith('session-123');
    });

    it('should trigger warning when less than 5 minutes remain', async () => {
      const nearExpiry = new Date(Date.now() + 4 * 60 * 1000); // 4 minutes
      (AdminSession.findOne as jest.Mock).mockResolvedValue({
        ...mockSession,
        expiresAt: nearExpiry
      });
      (AdminSession.updateActivity as jest.Mock).mockResolvedValue(true);

      const result = await trackSessionActivity(
        'session-123',
        'user-456',
        'admin@test.com',
        'admin'
      );

      expect(result.minutesRemaining).toBeCloseTo(4, 0);
      expect(result.shouldWarn).toBe(true);
      expect(result.shouldExtend).toBe(true); // Less than 10 minutes
    });

    it('should auto-extend session when less than 10 minutes remain and activity is recent', async () => {
      const nearExpiry = new Date(Date.now() + 8 * 60 * 1000); // 8 minutes
      const extendedExpiry = new Date(Date.now() + 68 * 60 * 1000); // 68 minutes (8 + 60)

      (AdminSession.findOne as jest.Mock).mockResolvedValue({
        ...mockSession,
        expiresAt: nearExpiry
      });
      (AdminSession.updateActivity as jest.Mock).mockResolvedValue(true);
      (AdminSession.checkInactivity as jest.Mock).mockResolvedValue(false); // Not inactive
      (AdminSession.extendSession as jest.Mock).mockResolvedValue({
        ...mockSession,
        expiresAt: extendedExpiry
      });
      (AuditLog.create as jest.Mock).mockResolvedValue({});

      const result = await trackSessionActivity(
        'session-123',
        'user-456',
        'admin@test.com',
        'admin'
      );

      expect(AdminSession.checkInactivity).toHaveBeenCalledWith(
        'session-123',
        SESSION_CONFIG.MAX_INACTIVE_TIME / 60
      );
      expect(AdminSession.extendSession).toHaveBeenCalledWith('session-123', 60);
      expect(result.shouldExtend).toBe(false); // Already extended
      expect(result.shouldWarn).toBe(false);
      expect(result.minutesRemaining).toBe(60);

      // Verify audit log was created
      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
          entityType: 'admin_session',
          description: 'Session automatically extended due to activity'
        })
      );
    });

    it('should not auto-extend if session is inactive for more than 30 minutes', async () => {
      const nearExpiry = new Date(Date.now() + 8 * 60 * 1000);

      (AdminSession.findOne as jest.Mock).mockResolvedValue({
        ...mockSession,
        expiresAt: nearExpiry
      });
      (AdminSession.updateActivity as jest.Mock).mockResolvedValue(true);
      (AdminSession.checkInactivity as jest.Mock).mockResolvedValue(true); // Inactive

      const result = await trackSessionActivity(
        'session-123',
        'user-456',
        'admin@test.com',
        'admin'
      );

      expect(AdminSession.extendSession).not.toHaveBeenCalled();
      expect(result.shouldExtend).toBe(true);
      expect(result.minutesRemaining).toBeCloseTo(8, 0);
    });

    it('should return zeros for non-existent session', async () => {
      (AdminSession.findOne as jest.Mock).mockResolvedValue(null);

      const result = await trackSessionActivity(
        'non-existent',
        'user-456',
        'admin@test.com',
        'admin'
      );

      expect(result.shouldExtend).toBe(false);
      expect(result.shouldWarn).toBe(false);
      expect(result.minutesRemaining).toBe(0);
    });

    it('should return zeros for inactive session status', async () => {
      (AdminSession.findOne as jest.Mock).mockResolvedValue({
        ...mockSession,
        status: 'revoked'
      });

      const result = await trackSessionActivity(
        'session-123',
        'user-456',
        'admin@test.com',
        'admin'
      );

      expect(result.shouldExtend).toBe(false);
      expect(result.shouldWarn).toBe(false);
      expect(result.minutesRemaining).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      (AdminSession.findOne as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await trackSessionActivity(
        'session-123',
        'user-456',
        'admin@test.com',
        'admin'
      );

      expect(result.shouldExtend).toBe(false);
      expect(result.shouldWarn).toBe(false);
      expect(result.minutesRemaining).toBe(0);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('checkSessionInactivity', () => {
    it('should return true when session is inactive', async () => {
      (AdminSession.checkInactivity as jest.Mock).mockResolvedValue(true);

      const result = await checkSessionInactivity('session-123');

      expect(result).toBe(true);
      expect(AdminSession.checkInactivity).toHaveBeenCalledWith(
        'session-123',
        SESSION_CONFIG.MAX_INACTIVE_TIME / 60
      );
    });

    it('should return false when session is active', async () => {
      (AdminSession.checkInactivity as jest.Mock).mockResolvedValue(false);

      const result = await checkSessionInactivity('session-123');

      expect(result).toBe(false);
    });

    it('should return true on error (fail-safe)', async () => {
      (AdminSession.checkInactivity as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await checkSessionInactivity('session-123');

      expect(result).toBe(true); // Assume inactive for security
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('getExpiringSessions', () => {
    it('should return list of expiring session IDs', async () => {
      const expiringSessions = [
        { id: 'session-1', expiresAt: new Date() },
        { id: 'session-2', expiresAt: new Date() },
        { id: 'session-3', expiresAt: new Date() }
      ];

      (AdminSession.getExpiringSessions as jest.Mock).mockResolvedValue(expiringSessions);

      const result = await getExpiringSessions();

      expect(result).toEqual(['session-1', 'session-2', 'session-3']);
      expect(AdminSession.getExpiringSessions).toHaveBeenCalledWith(
        SESSION_CONFIG.WARNING_THRESHOLD / 60
      );
    });

    it('should return empty array on error', async () => {
      (AdminSession.getExpiringSessions as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await getExpiringSessions();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should delete expired sessions and log audit', async () => {
      (AdminSession.deleteExpired as jest.Mock).mockResolvedValue({ deletedCount: 5 });
      (AuditLog.create as jest.Mock).mockResolvedValue({});

      const result = await cleanupExpiredSessions();

      expect(result).toBe(5);
      expect(AdminSession.deleteExpired).toHaveBeenCalled();
      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          adminEmail: 'system',
          adminRole: 'system',
          action: 'delete',
          entityType: 'admin_session',
          description: 'Cleaned up 5 expired sessions'
        })
      );
    });

    it('should not create audit log when no sessions deleted', async () => {
      (AdminSession.deleteExpired as jest.Mock).mockResolvedValue({ deletedCount: 0 });

      const result = await cleanupExpiredSessions();

      expect(result).toBe(0);
      expect(AuditLog.create).not.toHaveBeenCalled();
    });

    it('should return 0 on error', async () => {
      (AdminSession.deleteExpired as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await cleanupExpiredSessions();

      expect(result).toBe(0);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('manualExtendSession', () => {
    it('should extend session by 60 minutes by default', async () => {
      const extendedSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() + 120 * 60 * 1000)
      };

      (AdminSession.extendSession as jest.Mock).mockResolvedValue(extendedSession);
      (AuditLog.create as jest.Mock).mockResolvedValue({});

      const result = await manualExtendSession(
        'session-123',
        'user-456',
        'admin@test.com',
        'admin'
      );

      expect(result).toBe(true);
      expect(AdminSession.extendSession).toHaveBeenCalledWith('session-123', 60);
      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
          entityType: 'admin_session',
          description: 'Session manually extended by user',
          metadata: expect.objectContaining({
            minutesExtended: 60
          })
        })
      );
    });

    it('should extend session by custom minutes', async () => {
      const extendedSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() + 150 * 60 * 1000)
      };

      (AdminSession.extendSession as jest.Mock).mockResolvedValue(extendedSession);
      (AuditLog.create as jest.Mock).mockResolvedValue({});

      const result = await manualExtendSession(
        'session-123',
        'user-456',
        'admin@test.com',
        'admin',
        90 // Custom 90 minutes
      );

      expect(result).toBe(true);
      expect(AdminSession.extendSession).toHaveBeenCalledWith('session-123', 90);
      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            minutesExtended: 90
          })
        })
      );
    });

    it('should return false when extension fails', async () => {
      (AdminSession.extendSession as jest.Mock).mockResolvedValue(null);

      const result = await manualExtendSession(
        'session-123',
        'user-456',
        'admin@test.com',
        'admin'
      );

      expect(result).toBe(false);
      expect(AuditLog.create).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (AdminSession.extendSession as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await manualExtendSession(
        'session-123',
        'user-456',
        'admin@test.com',
        'admin'
      );

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('getSessionStatistics', () => {
    it('should return session statistics with configuration', async () => {
      const mockStats = {
        totalSessions: 10,
        activeSessions: 5,
        expiredSessions: 3,
        revokedSessions: 2
      };

      (AdminSession.getStatistics as jest.Mock).mockResolvedValue(mockStats);

      const result = await getSessionStatistics();

      expect(result).toEqual({
        ...mockStats,
        sessionTimeout: SESSION_CONFIG.SESSION_TIMEOUT,
        warningThreshold: SESSION_CONFIG.WARNING_THRESHOLD,
        maxInactiveTime: SESSION_CONFIG.MAX_INACTIVE_TIME
      });
    });

    it('should return null on error', async () => {
      (AdminSession.getStatistics as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await getSessionStatistics();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Session Timeout Calculations', () => {
    it('should correctly calculate 60-minute session timeout', async () => {
      const sessionStart = new Date();
      const sessionEnd = new Date(sessionStart.getTime() + SESSION_CONFIG.SESSION_TIMEOUT * 1000);

      (AdminSession.findOne as jest.Mock).mockResolvedValue({
        ...mockSession,
        createdAt: sessionStart,
        expiresAt: sessionEnd
      });
      (AdminSession.updateActivity as jest.Mock).mockResolvedValue(true);

      const result = await trackSessionActivity(
        'session-123',
        'user-456',
        'admin@test.com',
        'admin'
      );

      // Should be approximately 60 minutes (allowing for test execution time)
      expect(result.minutesRemaining).toBeLessThanOrEqual(60);
      expect(result.minutesRemaining).toBeGreaterThan(59);
    });

    it('should trigger warning at exactly 5 minutes remaining', async () => {
      const warningTime = new Date(Date.now() + SESSION_CONFIG.WARNING_THRESHOLD * 1000);

      (AdminSession.findOne as jest.Mock).mockResolvedValue({
        ...mockSession,
        expiresAt: warningTime
      });
      (AdminSession.updateActivity as jest.Mock).mockResolvedValue(true);

      const result = await trackSessionActivity(
        'session-123',
        'user-456',
        'admin@test.com',
        'admin'
      );

      expect(result.shouldWarn).toBe(true);
      expect(result.minutesRemaining).toBe(5);
    });

    it('should check inactivity at 30-minute threshold', async () => {
      const lastActivity = new Date(Date.now() - (SESSION_CONFIG.MAX_INACTIVE_TIME + 60) * 1000);

      (AdminSession.checkInactivity as jest.Mock).mockImplementation(
        (sessionId, maxInactiveMinutes) => {
          return Promise.resolve(maxInactiveMinutes === 30);
        }
      );

      const result = await checkSessionInactivity('session-123');

      expect(AdminSession.checkInactivity).toHaveBeenCalledWith('session-123', 30);
    });
  });
});