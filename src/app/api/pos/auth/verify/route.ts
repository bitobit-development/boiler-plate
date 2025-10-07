import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { db } from '@/lib/db';
import { adminSessions } from '@/lib/db/schema';

/**
 * POS Authentication Verification Endpoint
 *
 * Returns authentication status for the current user
 * Used by client-side components to check if user is authenticated
 * without accessing HTTP-only cookies directly
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { authenticated: false, reason: 'no_token' },
        { status: 401 }
      );
    }

    const decoded = verifyAccessToken(accessToken);

    if (!decoded) {
      return NextResponse.json(
        { authenticated: false, reason: 'invalid_token' },
        { status: 401 }
      );
    }

    // Check for shop_user role
    if (decoded.role !== 'shop_user') {
      return NextResponse.json(
        {
          authenticated: false,
          reason: 'invalid_role',
          role: decoded.role
        },
        { status: 403 }
      );
    }

    // Verify session exists in database
    const session = await db.query.adminSessions.findFirst({
      where: (sessions, { eq }) => eq(sessions.id, decoded.sessionId),
    });

    if (!session) {
      return NextResponse.json(
        { authenticated: false, reason: 'session_not_found' },
        { status: 401 }
      );
    }

    // Check if session status is 'active' (not 'expired' or 'revoked')
    if (session.status !== 'active') {
      return NextResponse.json(
        { authenticated: false, reason: 'session_inactive', status: session.status },
        { status: 401 }
      );
    }

    // Check session timeout (60 minutes)
    const tokenAge = Date.now() / 1000 - decoded.iat;
    const sessionTimeout = 60 * 60; // 60 minutes

    if (tokenAge > sessionTimeout) {
      return NextResponse.json(
        {
          authenticated: false,
          reason: 'session_expired',
          tokenAge: Math.floor(tokenAge / 60)
        },
        { status: 401 }
      );
    }

    // Authentication successful
    return NextResponse.json({
      authenticated: true,
      user: {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        sessionId: decoded.sessionId,
        kioskSessionId: decoded.kioskSessionId,
      },
      session: {
        tokenAge: Math.floor(tokenAge / 60), // in minutes
        expiresIn: Math.floor((sessionTimeout - tokenAge) / 60), // minutes remaining
      }
    });

  } catch (error) {
    console.error('[POS Auth Verify] Error:', error);
    return NextResponse.json(
      { authenticated: false, reason: 'server_error' },
      { status: 500 }
    );
  }
}
