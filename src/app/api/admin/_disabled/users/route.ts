import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth';
import { AdminUser } from '@/lib/db/models/AdminUser';
import { AdminRole } from '@/lib/db/models/AdminRole';
import { AuditLog } from '@/lib/db/models/AuditLog';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { connectToDatabase } from '@/lib/db/connection';

async function getAdminUsers(req: AuthenticatedRequest) {
  try {
    await connectToDatabase();

    // Check permission
    if (!req.user?.permissions.includes('manage_users')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const role = searchParams.get('role') || '';

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (role) {
      query.role = role;
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      AdminUser.find(query)
        .populate('role')
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AdminUser.countDocuments(query),
    ]);

    // Log access
    await AuditLog.create({
      userId: req.user.userId,
      action: 'view_admin_users',
      resource: 'admin_users',
      details: {
        page,
        limit,
        filters: { search, status, role },
        resultsCount: users.length,
      },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching admin users' },
      { status: 500 }
    );
  }
}

async function createAdminUser(req: AuthenticatedRequest) {
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
    const { email, password, name, roleId } = body;

    // Validate input
    if (!email || !password || !name || !roleId) {
      return NextResponse.json(
        { error: 'Email, password, name, and role are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    const validation = validatePasswordStrength(password);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Password does not meet requirements', details: validation.errors },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await AdminUser.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Verify role exists
    const role = await AdminRole.findById(roleId);
    if (!role) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Create user
    const hashedPassword = await hashPassword(password);
    const newUser = await AdminUser.create({
      email,
      passwordHash: hashedPassword,
      name,
      role: roleId,
      status: 'active',
      createdBy: req.user.userId,
    });

    // Log creation
    await AuditLog.create({
      userId: req.user.userId,
      action: 'create_admin_user',
      resource: 'admin_users',
      resourceId: newUser._id.toString(),
      details: {
        email,
        name,
        role: role.name,
      },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    });

    // Return user without password
    const userResponse = await AdminUser.findById(newUser._id)
      .populate('role')
      .select('-passwordHash');

    return NextResponse.json({
      success: true,
      user: userResponse,
    });
  } catch (error) {
    console.error('Create admin user error:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating admin user' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getAdminUsers);
export const POST = withAuth(createAdminUser);