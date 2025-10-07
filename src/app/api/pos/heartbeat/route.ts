import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { db } from '@/lib/db';
import { adminSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POS Heartbeat Endpoint
 *
 * Updates the lastActivityAt timestamp for the current session
 * Called periodically by the client to keep the session alive
 * and track user activity
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, reason: 'no_token' },
        { status: 401 }
      );
    }

    const decoded = verifyAccessToken(accessToken);

    if (!decoded) {
      return NextResponse.json(
        { success: false, reason: 'invalid_token' },
        { status: 401 }
      );
    }

    // Update session's lastActivityAt timestamp
    await db
      .update(adminSessions)
      .set({
        lastActivityAt: new Date(),
      })
      .where(eq(adminSessions.id, decoded.sessionId));

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[POS Heartbeat] Error:', error);
    return NextResponse.json(
      { success: false, reason: 'server_error' },
      { status: 500 }
    );
  }
}
