import { NextRequest, NextResponse } from 'next/server';
import { AdminUser } from '@/lib/db/models/AdminUser';
import { AdminSession } from '@/lib/db/models/AdminSession';
import { AuditLog } from '@/lib/db/models/AuditLog';
import { generateTokens } from '@/lib/auth/jwt';
import { rateLimit } from '@/lib/auth/middleware';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    // Get IP address for rate limiting
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // Apply rate limiting
    if (!rateLimit(`login:${ip}`)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await AdminUser.findByEmail(email.toLowerCase());

    if (!user) {
      // Log failed attempt - use provided email for tracking
      await AuditLog.create({
        adminEmail: email, // Use the attempted email for tracking
        adminRole: 'unknown', // Role unknown since user not found
        action: 'login',
        entityType: 'admin_auth',
        description: 'Failed login attempt - user not found',
        metadata: {
          reason: 'User not found',
          attemptedEmail: email
        },
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') || 'unknown',
        isSuccess: false,
        errorMessage: 'User not found'
      });

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);

      await AuditLog.create({
        adminUserId: user.id,
        adminEmail: user.email,
        adminRole: user.role,
        action: 'login',
        entityType: 'admin_auth',
        entityId: user.id,
        description: 'Failed login attempt - account locked',
        metadata: {
          reason: 'Account locked',
          minutesLeft
        },
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') || 'unknown',
        isSuccess: false,
        errorMessage: 'Account locked'
      });

      return NextResponse.json(
        { error: `Account is locked. Please try again in ${minutesLeft} minutes.` },
        { status: 423 }
      );
    }

    // Check if account is active
    if (!user.isActive) {
      await AuditLog.create({
        adminUserId: user.id,
        adminEmail: user.email,
        adminRole: user.role,
        action: 'login',
        entityType: 'admin_auth',
        entityId: user.id,
        description: 'Failed login attempt - account inactive',
        metadata: {
          reason: 'Account inactive'
        },
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') || 'unknown',
        isSuccess: false,
        errorMessage: 'Account inactive'
      });

      return NextResponse.json(
        { error: 'Account is disabled. Please contact administrator.' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // Increment login attempts
      await AdminUser.incrementLoginAttempts(user.id);

      await AuditLog.create({
        adminUserId: user.id,
        adminEmail: user.email,
        adminRole: user.role,
        action: 'login',
        entityType: 'admin_auth',
        entityId: user.id,
        entityName: `${user.firstName} ${user.lastName}`,
        description: 'Failed login attempt - invalid password',
        metadata: {
          reason: 'Invalid password',
          attempts: (user.loginAttempts || 0) + 1
        },
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') || 'unknown',
        isSuccess: false,
        errorMessage: 'Invalid password'
      });

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate tokens
    const { accessToken, refreshToken, accessExpiresAt, refreshExpiresAt } = generateTokens(user);

    // Create session
    const session = await AdminSession.create({
      adminUserId: user.id,
      accessToken,
      refreshToken,
      expiresAt: refreshExpiresAt,
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') || 'unknown',
      status: 'active'
    });

    // Update user login info
    await AdminUser.updateLoginInfo(user.id, ip);

    // Log successful login
    await AuditLog.create({
      adminUserId: user.id,
      adminEmail: user.email,
      adminRole: user.role,
      action: 'login',
      entityType: 'admin_auth',
      entityId: user.id,
      entityName: `${user.firstName} ${user.lastName}`,
      description: `Successful login from IP: ${ip}`,
      metadata: {
        sessionId: session.id
      },
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') || 'unknown',
      sessionId: session.id,
      riskLevel: 0,
      isCompliance: true,
      isSecurity: true,
      isSuccess: true
    });

    // Prepare response
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
        isSuperAdmin: user.isSuperAdmin
      },
      tokens: {
        accessToken,
        refreshToken,
        accessExpiresAt,
        refreshExpiresAt
      },
      sessionId: session.id
    });

    // Set HTTP-only cookies for tokens
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
      path: '/'
    });

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { error: 'An error occurred during login', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}