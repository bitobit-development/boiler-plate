import { db } from '@/lib/db';
import { kioskSessions, auditLogs, adminUsers } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { KioskSession } from '@/lib/db/schema';

// Type definitions
export interface DeviceInfo {
  fingerprint: string;
  ipAddress: string;
  userAgent: string;
  browserName?: string;
  osName?: string;
  deviceType?: string;
}

export interface KioskSessionResult {
  success: boolean;
  session?: KioskSession;
  message?: string;
  error?: string;
}

export interface SessionMetrics {
  ordersProcessed: number;
  totalSales: number;
  averageOrderValue?: number;
  otpOverridesCount?: number;
}

/**
 * Start a new kiosk session for a shop user
 * Ensures only one active session per kiosk at a time
 */
export async function startKioskSession(
  shopUserId: string,
  kioskId: string,
  deviceInfo: DeviceInfo,
  locationInfo?: { name?: string; code?: string }
): Promise<KioskSessionResult> {
  try {
    // Validate shop user exists and has correct role
    const [shopUser] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, shopUserId))
      .limit(1);

    if (!shopUser || shopUser.role !== 'shop_user') {
      return {
        success: false,
        message: 'Invalid shop user or insufficient permissions',
        error: 'INVALID_USER'
      };
    }

    // Check for existing active session on this kiosk
    const existingActiveSessions = await db
      .select()
      .from(kioskSessions)
      .where(
        and(
          eq(kioskSessions.kioskId, kioskId),
          eq(kioskSessions.isActive, true)
        )
      );

    // End any existing active sessions for this kiosk
    if (existingActiveSessions.length > 0) {
      for (const session of existingActiveSessions) {
        await endKioskSession(session.id, 'New session started');
      }
    }

    // Parse user agent for device details
    const deviceDetails = parseUserAgent(deviceInfo.userAgent);

    // Create new session
    const [newSession] = await db
      .insert(kioskSessions)
      .values({
        shopUserId,
        kioskId,
        startedAt: new Date(),
        isActive: true,
        lastActivityAt: new Date(),
        deviceFingerprint: deviceInfo.fingerprint,
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent,
        browserName: deviceDetails.browserName || deviceInfo.browserName,
        osName: deviceDetails.osName || deviceInfo.osName,
        deviceType: deviceDetails.deviceType || deviceInfo.deviceType,
        locationName: locationInfo?.name,
        locationCode: locationInfo?.code,
        ordersProcessed: 0,
        totalSales: 0,
        averageOrderValue: 0,
        otpOverridesCount: 0,
        suspiciousActivity: false,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Log session start in audit log
    await db.insert(auditLogs).values({
      adminUserId: shopUserId,
      adminEmail: shopUser.email,
      adminRole: 'shop_user',
      action: 'login',
      entityType: 'kiosk_session',
      entityId: newSession.id,
      entityName: `Kiosk ${kioskId}`,
      description: `Kiosk session started on ${kioskId}`,
      metadata: {
        kioskId,
        deviceFingerprint: deviceInfo.fingerprint,
        location: locationInfo
      },
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      sessionId: newSession.id,
      isSuccess: true,
      createdAt: new Date()
    });

    return {
      success: true,
      session: newSession,
      message: 'Kiosk session started successfully'
    };
  } catch (error) {
    console.error('Error starting kiosk session:', error);
    return {
      success: false,
      message: 'Failed to start kiosk session',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * End an active kiosk session
 */
export async function endKioskSession(
  sessionId: string,
  terminationReason?: string,
  terminatedBy?: string
): Promise<void> {
  try {
    // Get current session details
    const [session] = await db
      .select()
      .from(kioskSessions)
      .where(eq(kioskSessions.id, sessionId))
      .limit(1);

    if (!session || !session.isActive) {
      console.log('Session not found or already inactive:', sessionId);
      return;
    }

    // Update session to inactive
    await db
      .update(kioskSessions)
      .set({
        endedAt: new Date(),
        isActive: false,
        terminatedBy,
        terminationReason,
        updatedAt: new Date()
      })
      .where(eq(kioskSessions.id, sessionId));

    // Log session end in audit log
    await db.insert(auditLogs).values({
      adminUserId: terminatedBy || session.shopUserId,
      adminEmail: 'system',
      adminRole: 'shop_user',
      action: 'logout',
      entityType: 'kiosk_session',
      entityId: sessionId,
      entityName: `Kiosk ${session.kioskId}`,
      description: `Kiosk session ended on ${session.kioskId}`,
      metadata: {
        kioskId: session.kioskId,
        sessionDuration: calculateSessionDuration(session.startedAt, new Date()),
        ordersProcessed: session.ordersProcessed,
        totalSales: session.totalSales,
        terminationReason
      },
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      sessionId,
      isSuccess: true,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Error ending kiosk session:', error);
  }
}

/**
 * Update session metrics after order processing
 */
export async function updateSessionMetrics(
  sessionId: string,
  metrics: Partial<SessionMetrics>
): Promise<void> {
  try {
    // Get current session
    const [session] = await db
      .select()
      .from(kioskSessions)
      .where(eq(kioskSessions.id, sessionId))
      .limit(1);

    if (!session || !session.isActive) {
      console.log('Session not found or inactive:', sessionId);
      return;
    }

    // Calculate new metrics
    const newOrdersProcessed = (session.ordersProcessed || 0) + (metrics.ordersProcessed || 0);
    const newTotalSales = (session.totalSales || 0) + (metrics.totalSales || 0);
    const newOtpOverrides = (session.otpOverridesCount || 0) + (metrics.otpOverridesCount || 0);
    const newAverageOrderValue = newOrdersProcessed > 0
      ? Math.round(newTotalSales / newOrdersProcessed)
      : 0;

    // Update session
    await db
      .update(kioskSessions)
      .set({
        ordersProcessed: newOrdersProcessed,
        totalSales: newTotalSales,
        averageOrderValue: newAverageOrderValue,
        otpOverridesCount: newOtpOverrides,
        lastActivityAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(kioskSessions.id, sessionId));
  } catch (error) {
    console.error('Error updating session metrics:', error);
  }
}

/**
 * Get active kiosk session for a shop user
 */
export async function getActiveKioskSession(
  shopUserId: string
): Promise<KioskSession | null> {
  try {
    const [session] = await db
      .select()
      .from(kioskSessions)
      .where(
        and(
          eq(kioskSessions.shopUserId, shopUserId),
          eq(kioskSessions.isActive, true)
        )
      )
      .orderBy(desc(kioskSessions.startedAt))
      .limit(1);

    return session || null;
  } catch (error) {
    console.error('Error getting active kiosk session:', error);
    return null;
  }
}

/**
 * Get kiosk session by ID
 */
export async function getKioskSession(sessionId: string): Promise<KioskSession | null> {
  try {
    const [session] = await db
      .select()
      .from(kioskSessions)
      .where(eq(kioskSessions.id, sessionId))
      .limit(1);

    return session || null;
  } catch (error) {
    console.error('Error getting kiosk session:', error);
    return null;
  }
}

/**
 * Check if kiosk session is still active and not expired
 * Sessions expire after 8 hours of inactivity
 */
export async function validateKioskSession(sessionId: string): Promise<boolean> {
  try {
    const [session] = await db
      .select()
      .from(kioskSessions)
      .where(eq(kioskSessions.id, sessionId))
      .limit(1);

    if (!session || !session.isActive) {
      return false;
    }

    // Check for session timeout (8 hours)
    const sessionTimeout = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    const lastActivity = session.lastActivityAt || session.startedAt;
    const timeSinceActivity = Date.now() - lastActivity.getTime();

    if (timeSinceActivity > sessionTimeout) {
      // Auto-end expired session
      await endKioskSession(sessionId, 'Session timeout due to inactivity');
      return false;
    }

    // Update last activity
    await db
      .update(kioskSessions)
      .set({
        lastActivityAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(kioskSessions.id, sessionId));

    return true;
  } catch (error) {
    console.error('Error validating kiosk session:', error);
    return false;
  }
}

/**
 * Mark session as potentially suspicious
 * Used for fraud detection and monitoring
 */
export async function flagSuspiciousActivity(
  sessionId: string,
  reason: string
): Promise<void> {
  try {
    await db
      .update(kioskSessions)
      .set({
        suspiciousActivity: true,
        suspiciousActivityNotes: reason,
        updatedAt: new Date()
      })
      .where(eq(kioskSessions.id, sessionId));

    // Create security event in audit log
    await db.insert(auditLogs).values({
      adminUserId: null,
      adminEmail: 'system',
      adminRole: 'system',
      action: 'create',
      entityType: 'security_alert',
      entityId: sessionId,
      entityName: 'Kiosk Session',
      description: 'Suspicious activity detected in kiosk session',
      metadata: {
        sessionId,
        reason
      },
      ipAddress: '0.0.0.0',
      riskLevel: 7,
      isSecurity: true,
      isSuccess: false,
      errorMessage: reason,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Error flagging suspicious activity:', error);
  }
}

/**
 * Parse user agent string to extract browser and OS details
 */
function parseUserAgent(userAgent: string): {
  browserName?: string;
  osName?: string;
  deviceType?: string;
} {
  const ua = userAgent.toLowerCase();

  // Detect browser
  let browserName: string | undefined;
  if (ua.includes('chrome')) browserName = 'Chrome';
  else if (ua.includes('firefox')) browserName = 'Firefox';
  else if (ua.includes('safari')) browserName = 'Safari';
  else if (ua.includes('edge')) browserName = 'Edge';

  // Detect OS
  let osName: string | undefined;
  if (ua.includes('windows')) osName = 'Windows';
  else if (ua.includes('mac')) osName = 'macOS';
  else if (ua.includes('linux')) osName = 'Linux';
  else if (ua.includes('android')) osName = 'Android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) osName = 'iOS';

  // Detect device type
  let deviceType: string | undefined;
  if (ua.includes('mobile')) deviceType = 'mobile';
  else if (ua.includes('tablet')) deviceType = 'tablet';
  else deviceType = 'desktop';

  return { browserName, osName, deviceType };
}

/**
 * Calculate session duration in minutes
 */
function calculateSessionDuration(start: Date, end: Date): number {
  const durationMs = end.getTime() - start.getTime();
  return Math.round(durationMs / 60000); // Convert to minutes
}