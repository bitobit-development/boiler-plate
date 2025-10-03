import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, refreshAccessToken } from '@/lib/auth/jwt';
import { AdminSession } from '@/lib/db/models/AdminSession';
import { AdminUser } from '@/lib/db/models/AdminUser';
import { AuditLog } from '@/lib/db/models/AuditLog';

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie or body
    const cookieToken = request.cookies.get('refreshToken')?.value;
    const body = await request.json().catch(() => ({}));
    const refreshToken = cookieToken || body.refreshToken;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    // Validate session
    const session = await AdminSession.findByRefreshToken(refreshToken);
    if (!session || session.status !== 'active') {
      return NextResponse.json(
        { error: 'Session not found or inactive' },
        { status: 401 }
      );
    }

    // Generate new access token
    const tokenData = refreshAccessToken(refreshToken);
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Failed to refresh token' },
        { status: 500 }
      );
    }

    // Update session with new access token
    await AdminSession.updateById(session.id, {
      accessToken: tokenData.accessToken,
      lastActivityAt: new Date()
    });

    // Get user details for audit logging
    const user = await AdminUser.findById(session.adminUserId);

    if (user) {
      // Log token refresh as an "update" action (updating the session)
      await AuditLog.create({
        adminUserId: user.id,
        adminEmail: user.email,
        adminRole: user.role,
        action: 'update', // Use 'update' since we're updating the session
        entityType: 'admin_session',
        entityId: session.id,
        description: 'Admin session token refreshed',
        metadata: {
          sessionId: session.id,
          tokenType: 'access_token'
        },
        ipAddress: request.headers.get('x-forwarded-for') ||
                  request.headers.get('x-real-ip') ||
                  'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        isSuccess: true
      });
    }

    // Prepare response
    const response = NextResponse.json({
      success: true,
      accessToken: tokenData.accessToken,
      accessExpiresAt: tokenData.accessExpiresAt
    });

    // Set new access token cookie with extended duration
    response.cookies.set('accessToken', tokenData.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 60 minutes (extended from 15 minutes)
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}