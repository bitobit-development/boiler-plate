import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth';
import { AdminUser } from '@/lib/db/models/AdminUser';
import { AdminRole } from '@/lib/db/models/AdminRole';
import { AdminSession } from '@/lib/db/models/AdminSession';
import { AuditLog } from '@/lib/db/models/AuditLog';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { connectToDatabase } from '@/lib/db/connection';

interface Params {
  params: {
    id: string;
  };
}

async function getAdminUser(req: AuthenticatedRequest, { params }: Params) {
  try {
    await connectToDatabase();

    // Check permission
    if (!req.user?.permissions.includes('manage_users')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const user = await AdminUser.findById(params.id)
      .populate('role')
      .select('-passwordHash');

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get admin user error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching admin user' },
      { status: 500 }
    );
  }
}

async function updateAdminUser(req: AuthenticatedRequest, { params }: Params) {
  try {
    await connectToDatabase();

    // Check permission
    if (!req.user?.permissions.includes('manage_users')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, name, roleId, status, password } = body;

    // Find user
    const user = await AdminUser.findById(params.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent self-deactivation
    if (params.id === req.user.userId && status !== 'active') {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account' },
        { status: 400 }
      );
    }

    // Track changes for audit log
    const changes: any = {};

    // Update fields if provided
    if (email && email !== user.email) {
      // Check if new email already exists
      const existingUser = await AdminUser.findOne({ email, _id: { $ne: params.id } });
      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 409 }
        );
      }
      changes.email = { from: user.email, to: email };
      user.email = email;
    }

    if (name && name !== user.name) {
      changes.name = { from: user.name, to: name };
      user.name = name;
    }

    if (roleId && roleId !== user.role.toString()) {
      const role = await AdminRole.findById(roleId);
      if (!role) {
        return NextResponse.json(
          { error: 'Invalid role' },
          { status: 400 }
        );
      }
      const oldRole = await AdminRole.findById(user.role);
      changes.role = { from: oldRole?.name, to: role.name };
      user.role = roleId;
    }

    if (status && status !== user.status) {
      changes.status = { from: user.status, to: status };
      user.status = status;

      // If suspending or deactivating, invalidate all sessions
      if (status === 'suspended' || status === 'inactive') {
        await AdminSession.updateMany(
          { userId: params.id, active: true },
          { active: false, endedAt: new Date() }
        );
      }
    }

    if (password) {
      // Validate password strength
      const validation = validatePasswordStrength(password);
      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Password does not meet requirements', details: validation.errors },
          { status: 400 }
        );
      }
      user.passwordHash = await hashPassword(password);
      user.passwordChangedAt = new Date();
      changes.password = 'changed';
    }

    user.updatedAt = new Date();
    await user.save();

    // Log update
    await AuditLog.create({
      userId: req.user.userId,
      action: 'update_admin_user',
      resource: 'admin_users',
      resourceId: params.id,
      details: { changes },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    });

    // Return updated user
    const updatedUser = await AdminUser.findById(params.id)
      .populate('role')
      .select('-passwordHash');

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update admin user error:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating admin user' },
      { status: 500 }
    );
  }
}

async function deleteAdminUser(req: AuthenticatedRequest, { params }: Params) {
  try {
    await connectToDatabase();

    // Check permission
    if (!req.user?.permissions.includes('manage_users')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Prevent self-deletion
    if (params.id === req.user.userId) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    const user = await AdminUser.findById(params.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Soft delete - set status to inactive instead of actually deleting
    user.status = 'inactive';
    user.deletedAt = new Date();
    await user.save();

    // Invalidate all sessions
    await AdminSession.updateMany(
      { userId: params.id, active: true },
      { active: false, endedAt: new Date() }
    );

    // Log deletion
    await AuditLog.create({
      userId: req.user.userId,
      action: 'delete_admin_user',
      resource: 'admin_users',
      resourceId: params.id,
      details: { email: user.email, name: user.name },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete admin user error:', error);
    return NextResponse.json(
      { error: 'An error occurred while deleting admin user' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getAdminUser);
export const PUT = withAuth(updateAdminUser);
export const DELETE = withAuth(deleteAdminUser);