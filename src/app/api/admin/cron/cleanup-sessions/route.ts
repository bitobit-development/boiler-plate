import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredSessions } from '@/lib/auth/session-tracker';

/**
 * POST /api/admin/cron/cleanup-sessions
 * Cleanup expired admin sessions
 * This endpoint should be called periodically by a cron job
 *
 * Security: This endpoint should be protected by a secret key
 * or only accessible from internal network/cron service
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (if configured)
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get('authorization');
      const providedSecret = authHeader?.replace('Bearer ', '');

      if (providedSecret !== cronSecret) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Check if request is from internal network (optional security)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwardedFor || realIp || 'unknown';

    // You can add IP whitelist check here if needed
    // const allowedIps = ['127.0.0.1', '::1', '10.0.0.0/8'];
    // if (!isIpAllowed(ip, allowedIps)) { ... }

    // Perform cleanup
    const deletedCount = await cleanupExpiredSessions();

    // Return results
    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired session(s)`,
      deletedCount,
      timestamp: new Date().toISOString(),
      executedBy: ip
    });

  } catch (error) {
    console.error('Session cleanup error:', error);
    return NextResponse.json(
      {
        error: 'Failed to cleanup sessions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/cron/cleanup-sessions
 * Health check for the cleanup endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ready',
    endpoint: '/api/admin/cron/cleanup-sessions',
    method: 'POST',
    description: 'Cleanup expired admin sessions',
    lastRun: null, // You could store this in a database or cache
    nextRun: null  // You could calculate based on cron schedule
  });
}