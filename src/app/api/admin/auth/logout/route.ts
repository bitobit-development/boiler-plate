import { NextRequest, NextResponse } from 'next/server';
import { AdminSession } from '@/lib/db/models/AdminSession';
import { AuditLog } from '@/lib/db/models/AuditLog';
import { validateAdminAuth } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const { authenticated, user, error } = await validateAdminAuth(request);

    if (!authenticated) {
      return NextResponse.json(
        { error: error || 'Authentication required' },
        { status: 401 }
      );
    }

    // Get session ID from request
    const sessionId = user.sessionId;
    const accessToken = request.cookies.get('accessToken')?.value;

    // Delete the session
    if (sessionId) {
      await AdminSession.deleteOne({ id: sessionId });
    } else if (accessToken) {
      await AdminSession.deleteOne({ accessToken });
    }

    // Log the logout
    await AuditLog.create({
      adminUserId: user.id,
      adminEmail: user.email,
      adminRole: user.role,
      action: 'logout',
      entityType: 'admin_auth',
      entityId: user.id,
      description: 'User logged out',
      metadata: {
        sessionId
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      isSuccess: true
    });

    // Clear cookies
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    response.cookies.set('accessToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}