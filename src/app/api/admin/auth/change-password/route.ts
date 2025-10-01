import { NextRequest, NextResponse } from 'next/server';
import { AdminUser } from '@/lib/db/models/AdminUser';
import { AuditLog } from '@/lib/db/models/AuditLog';
import { verifyPassword, hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth';
import { connectToDatabase } from '@/lib/db/connection';

async function changePasswordHandler(req: AuthenticatedRequest) {
  try {
    await connectToDatabase();

    const user = req.user!;
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    // Validate new password strength
    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Password does not meet requirements', details: validation.errors },
        { status: 400 }
      );
    }

    // Get user with password
    const admin = await AdminUser.findById(user.userId).select('+passwordHash');
    if (!admin) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, admin.passwordHash);
    if (!isValidPassword) {
      await AuditLog.create({
        userId: user.userId,
        action: 'change_password_failed',
        resource: 'admin_auth',
        details: { reason: 'invalid_current_password' },
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
      });

      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Check if new password is same as current
    if (await verifyPassword(newPassword, admin.passwordHash)) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      );
    }

    // Hash new password and update
    admin.passwordHash = await hashPassword(newPassword);
    admin.passwordChangedAt = new Date();
    await admin.save();

    // Log password change
    await AuditLog.create({
      userId: user.userId,
      action: 'change_password_success',
      resource: 'admin_auth',
      details: { timestamp: new Date() },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'An error occurred while changing password' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(changePasswordHandler);