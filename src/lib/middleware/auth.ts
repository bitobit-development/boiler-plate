import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, TokenPayload } from '@/lib/auth/jwt';
import { AuditLog } from '@/lib/db/models/AuditLog';
import { AdminSession } from '@/lib/db/models/AdminSession';
import { trackSessionActivity } from '@/lib/auth/session-tracker';
import { headers } from 'next/headers';

export interface AuthenticatedRequest extends NextRequest {
  user?: TokenPayload;
}

export function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  requiredPermissions?: string[]
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Get token from Authorization header or cookie
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7)
        : req.cookies.get('accessToken')?.value;

      if (!token) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Verify token
      const payload = verifyAccessToken(token);

      if (!payload) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      // Validate session exists and is active
      if (payload.sessionId) {
        const session = await AdminSession.findOne({
          id: payload.sessionId,
          status: 'active'
        });

        if (!session) {
          return NextResponse.json(
            { error: 'Session expired or invalid' },
            { status: 401 }
          );
        }

        // Track session activity and handle auto-extension
        await trackSessionActivity(
          payload.sessionId,
          payload.userId,
          payload.email,
          payload.role
        );
      }

      // Check permissions if required
      if (requiredPermissions && requiredPermissions.length > 0) {
        const hasPermission = requiredPermissions.every(perm =>
          payload.permissions.includes(perm)
        );

        if (!hasPermission) {
          await logUnauthorizedAccess(payload.userId, req.url, requiredPermissions);
          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          );
        }
      }

      // Add user to request
      (req as AuthenticatedRequest).user = payload;

      // Call the handler
      return handler(req as AuthenticatedRequest);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
  };
}

async function logUnauthorizedAccess(
  userId: string,
  url: string,
  requiredPermissions: string[]
) {
  try {
    await AuditLog.create({
      userId,
      action: 'unauthorized_access_attempt',
      resource: url,
      details: {
        requiredPermissions,
        timestamp: new Date(),
      },
      ipAddress: headers().get('x-forwarded-for') || 'unknown',
      userAgent: headers().get('user-agent') || 'unknown',
    });
  } catch (error) {
    console.error('Failed to log unauthorized access:', error);
  }
}

export function requirePermissions(...permissions: string[]) {
  return (handler: (req: AuthenticatedRequest) => Promise<NextResponse>) => {
    return withAuth(handler, permissions);
  };
}