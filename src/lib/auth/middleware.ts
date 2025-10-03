import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, extractTokenFromHeader } from './jwt';
import { AdminUser } from '@/lib/db/models/AdminUser';
import { AdminSession } from '@/lib/db/models/AdminSession';
import { AuditLog } from '@/lib/db/models/AuditLog';
import { trackSessionActivity } from './session-tracker';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    role: string;
    sessionId?: string;
  };
}

/**
 * Validate admin authentication for API routes
 */
export async function validateAdminAuth(request: NextRequest): Promise<{
  authenticated: boolean;
  user?: any;
  error?: string;
}> {
  try {
    // Extract token from header or cookie
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('accessToken')?.value;

    const token = extractTokenFromHeader(authHeader) || cookieToken;

    if (!token) {
      return { authenticated: false, error: 'No authentication token provided' };
    }

    // Verify the token
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return { authenticated: false, error: 'Invalid or expired token' };
    }

    // Validate session exists and is active
    if (decoded.sessionId) {
      const session = await AdminSession.findOne({
        id: decoded.sessionId,
        status: 'active'
      });

      if (!session) {
        return { authenticated: false, error: 'Session expired or invalid' };
      }

      // Track session activity and handle auto-extension
      const activityStatus = await trackSessionActivity(
        decoded.sessionId,
        decoded.userId,
        decoded.email,
        decoded.role
      );

      // Add session status to response headers if warning needed
      if (activityStatus.shouldWarn) {
        // This will be available to the frontend for showing warnings
        console.log(`Session expiring soon: ${activityStatus.minutesRemaining} minutes remaining`);
      }
    }

    // Get user details from database
    const user = await AdminUser.findById(decoded.userId);
    if (!user || !user.isActive) {
      return { authenticated: false, error: 'User account is disabled or not found' };
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return { authenticated: false, error: 'Account is temporarily locked' };
    }

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        sessionId: decoded.sessionId
      }
    };
  } catch (error) {
    console.error('Authentication validation error:', error);
    return { authenticated: false, error: 'Authentication failed' };
  }
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(
  request: NextRequest,
  handler: (req: NextRequest & { user: any }) => Promise<NextResponse>
): Promise<NextResponse> {
  const { authenticated, user, error } = await validateAdminAuth(request);

  if (!authenticated) {
    return NextResponse.json(
      { error: error || 'Authentication required' },
      { status: 401 }
    );
  }

  // Add user to request
  const authRequest = request as NextRequest & { user: any };
  authRequest.user = user;

  // Log the API access
  try {
    await AuditLog.create({
      adminUserId: user.id,
      action: 'api_access',
      resource: 'api',
      resourceId: request.nextUrl.pathname,
      details: {
        method: request.method,
        path: request.nextUrl.pathname,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      status: 'success'
    });
  } catch (err) {
    console.error('Failed to log API access:', err);
  }

  return handler(authRequest);
}

/**
 * Check if user has specific role
 */
export function requireRole(role: string | string[]) {
  return async (
    request: NextRequest & { user: any },
    handler: (req: NextRequest & { user: any }) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    const allowedRoles = Array.isArray(role) ? role : [role];

    if (!request.user || !allowedRoles.includes(request.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return handler(request);
  };
}

/**
 * Extract user from request without requiring authentication
 */
export async function extractUser(request: NextRequest): Promise<any | null> {
  const { authenticated, user } = await validateAdminAuth(request);
  return authenticated ? user : null;
}

/**
 * Rate limiting helper
 */
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute for auth endpoints

export function rateLimit(identifier: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);

  if (!userLimit || now - userLimit.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(identifier, { count: 1, timestamp: now });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * Clean up expired rate limit entries
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now - value.timestamp > RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW);