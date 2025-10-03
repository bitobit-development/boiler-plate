import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAuth } from '@/lib/auth/middleware';
import { AdminSession } from '@/lib/db/models/AdminSession';
import { manualExtendSession, trackSessionActivity } from '@/lib/auth/session-tracker';

/**
 * GET /api/admin/auth/session-status
 * Get current session status and warning information
 */
export async function GET(request: NextRequest) {
  try {
    const { authenticated, user, error } = await validateAdminAuth(request);

    if (!authenticated) {
      return NextResponse.json(
        { error: error || 'Not authenticated' },
        { status: 401 }
      );
    }

    if (!user.sessionId) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 400 }
      );
    }

    // Get session details
    const session = await AdminSession.findOne({ id: user.sessionId });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Track activity and get status
    const activityStatus = await trackSessionActivity(
      user.sessionId,
      user.id,
      user.email,
      user.role
    );

    // Calculate detailed timing
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    const lastActivityAt = new Date(session.lastActivityAt);
    const timeRemaining = Math.max(0, expiresAt.getTime() - now.getTime());
    const timeSinceActivity = now.getTime() - lastActivityAt.getTime();

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        expiresAt: session.expiresAt,
        lastActivityAt: session.lastActivityAt,
        createdAt: session.createdAt
      },
      timing: {
        minutesRemaining: activityStatus.minutesRemaining,
        secondsRemaining: Math.floor(timeRemaining / 1000),
        minutesSinceActivity: Math.floor(timeSinceActivity / 60000),
        shouldWarn: activityStatus.shouldWarn,
        shouldExtend: activityStatus.shouldExtend
      },
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Session status error:', error);
    return NextResponse.json(
      { error: 'Failed to get session status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/auth/session-status
 * Manually extend the current session
 */
export async function POST(request: NextRequest) {
  try {
    const { authenticated, user, error } = await validateAdminAuth(request);

    if (!authenticated) {
      return NextResponse.json(
        { error: error || 'Not authenticated' },
        { status: 401 }
      );
    }

    if (!user.sessionId) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { extendMinutes = 60 } = body;

    // Validate extension duration
    if (extendMinutes < 1 || extendMinutes > 120) {
      return NextResponse.json(
        { error: 'Extension duration must be between 1 and 120 minutes' },
        { status: 400 }
      );
    }

    // Extend the session
    const extended = await manualExtendSession(
      user.sessionId,
      user.id,
      user.email,
      user.role,
      extendMinutes
    );

    if (!extended) {
      return NextResponse.json(
        { error: 'Failed to extend session' },
        { status: 500 }
      );
    }

    // Get updated session details
    const session = await AdminSession.findOne({ id: user.sessionId });

    return NextResponse.json({
      success: true,
      message: `Session extended by ${extendMinutes} minutes`,
      session: {
        id: session!.id,
        expiresAt: session!.expiresAt,
        lastActivityAt: session!.lastActivityAt
      },
      extendedMinutes: extendMinutes
    });

  } catch (error) {
    console.error('Session extend error:', error);
    return NextResponse.json(
      { error: 'Failed to extend session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/auth/session-status
 * Revoke all other sessions for the current user (security feature)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { authenticated, user, error } = await validateAdminAuth(request);

    if (!authenticated) {
      return NextResponse.json(
        { error: error || 'Not authenticated' },
        { status: 401 }
      );
    }

    // Delete all other sessions for this user
    const result = await AdminSession.deleteUserSessions(
      user.id,
      user.sessionId // Exclude current session
    );

    return NextResponse.json({
      success: true,
      message: `Revoked ${result.deletedCount} other session(s)`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Session revoke error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke sessions' },
      { status: 500 }
    );
  }
}