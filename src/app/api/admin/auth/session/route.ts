import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAuth } from '@/lib/auth/middleware';
import { AdminUser } from '@/lib/db/models/AdminUser';

export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const { authenticated, user, error } = await validateAdminAuth(request);

    if (!authenticated) {
      return NextResponse.json(
        { authenticated: false, error: error || 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get full user details
    const fullUser = await AdminUser.findById(user.id);

    if (!fullUser || !fullUser.isActive) {
      return NextResponse.json(
        { authenticated: false, error: 'User account is disabled or not found' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: fullUser.id,
        email: fullUser.email,
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        role: fullUser.role,
        avatar: fullUser.avatar,
        isSuperAdmin: fullUser.isSuperAdmin,
        permissions: fullUser.permissions || [],
        lastLoginAt: fullUser.lastLoginAt,
        sessionId: user.sessionId
      }
    });

  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Failed to validate session' },
      { status: 500 }
    );
  }
}