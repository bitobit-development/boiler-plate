/**
 * Session Activity Tracker
 * Monitors and updates admin session activity for extended session management
 * @module session-tracker
 */

import { AdminSession } from '@/lib/db/models/AdminSession';
import { SESSION_CONFIG } from '@/lib/auth/jwt';
import { AuditLog } from '@/lib/db/models/AuditLog';

/**
 * Track session activity and handle automatic session extension
 * Should be called on each authenticated admin request
 */
export async function trackSessionActivity(
  sessionId: string,
  userId: string,
  userEmail: string,
  userRole: string
): Promise<{
  shouldExtend: boolean;
  shouldWarn: boolean;
  minutesRemaining: number;
}> {
  try {
    // Get current session
    const session = await AdminSession.findOne({ id: sessionId });

    if (!session || session.status !== 'active') {
      return {
        shouldExtend: false,
        shouldWarn: false,
        minutesRemaining: 0
      };
    }

    // Update last activity
    await AdminSession.updateActivity(sessionId);

    // Calculate time remaining
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    const timeRemaining = expiresAt.getTime() - now.getTime();
    const minutesRemaining = Math.floor(timeRemaining / 60000);

    // Check if session needs extension (less than 10 minutes remaining)
    const shouldExtend = minutesRemaining < 10 && minutesRemaining > 0;

    // Check if user should be warned (5 minutes before expiry)
    const warningThresholdMinutes = SESSION_CONFIG.WARNING_THRESHOLD / 60;
    const shouldWarn = minutesRemaining <= warningThresholdMinutes && minutesRemaining > 0;

    // Auto-extend session if needed and activity is recent
    if (shouldExtend) {
      const isInactive = await AdminSession.checkInactivity(
        sessionId,
        SESSION_CONFIG.MAX_INACTIVE_TIME / 60
      );

      if (!isInactive) {
        // Extend session by another 60 minutes
        const extendedSession = await AdminSession.extendSession(sessionId, 60);

        if (extendedSession) {
          // Log session extension
          await AuditLog.create({
            adminUserId: userId,
            adminEmail: userEmail,
            adminRole: userRole,
            action: 'update',
            entityType: 'admin_session',
            entityId: sessionId,
            description: 'Session automatically extended due to activity',
            metadata: {
              oldExpiresAt: session.expiresAt,
              newExpiresAt: extendedSession.expiresAt,
              minutesExtended: 60
            },
            isSuccess: true
          });

          return {
            shouldExtend: false, // Already extended
            shouldWarn: false,
            minutesRemaining: 60
          };
        }
      }
    }

    return {
      shouldExtend,
      shouldWarn,
      minutesRemaining
    };
  } catch (error) {
    console.error('Error tracking session activity:', error);
    return {
      shouldExtend: false,
      shouldWarn: false,
      minutesRemaining: 0
    };
  }
}

/**
 * Check if a session needs cleanup due to inactivity
 */
export async function checkSessionInactivity(sessionId: string): Promise<boolean> {
  try {
    const maxInactiveMinutes = SESSION_CONFIG.MAX_INACTIVE_TIME / 60;
    return await AdminSession.checkInactivity(sessionId, maxInactiveMinutes);
  } catch (error) {
    console.error('Error checking session inactivity:', error);
    return true; // Assume inactive on error for security
  }
}

/**
 * Get all sessions that are about to expire
 */
export async function getExpiringSessions(): Promise<string[]> {
  try {
    const warningMinutes = SESSION_CONFIG.WARNING_THRESHOLD / 60;
    const sessions = await AdminSession.getExpiringSessions(warningMinutes);
    return sessions.map(s => s.id);
  } catch (error) {
    console.error('Error getting expiring sessions:', error);
    return [];
  }
}

/**
 * Clean up expired sessions
 * Should be called periodically (e.g., via cron job)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await AdminSession.deleteExpired();

    if (result.deletedCount > 0) {
      await AuditLog.create({
        adminEmail: 'system',
        adminRole: 'system',
        action: 'delete',
        entityType: 'admin_session',
        description: `Cleaned up ${result.deletedCount} expired sessions`,
        metadata: {
          deletedCount: result.deletedCount,
          cleanupTime: new Date()
        },
        isSuccess: true
      });
    }

    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    return 0;
  }
}

/**
 * Manually extend a session (user-triggered)
 */
export async function manualExtendSession(
  sessionId: string,
  userId: string,
  userEmail: string,
  userRole: string,
  additionalMinutes: number = 60
): Promise<boolean> {
  try {
    const session = await AdminSession.extendSession(sessionId, additionalMinutes);

    if (session) {
      // Log manual extension
      await AuditLog.create({
        adminUserId: userId,
        adminEmail: userEmail,
        adminRole: userRole,
        action: 'update',
        entityType: 'admin_session',
        entityId: sessionId,
        description: 'Session manually extended by user',
        metadata: {
          newExpiresAt: session.expiresAt,
          minutesExtended: additionalMinutes
        },
        isSuccess: true
      });

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error manually extending session:', error);
    return false;
  }
}

/**
 * Get session statistics for monitoring
 */
export async function getSessionStatistics() {
  try {
    const stats = await AdminSession.getStatistics();
    return {
      ...stats,
      sessionTimeout: SESSION_CONFIG.SESSION_TIMEOUT,
      warningThreshold: SESSION_CONFIG.WARNING_THRESHOLD,
      maxInactiveTime: SESSION_CONFIG.MAX_INACTIVE_TIME
    };
  } catch (error) {
    console.error('Error getting session statistics:', error);
    return null;
  }
}