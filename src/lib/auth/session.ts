import { cookies } from 'next/headers';
import { verifyAccessToken } from './jwt';
import { db } from '@/lib/db';
import { adminUsers, adminSessions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  sessionId?: string;
}

/**
 * Validate the current session from cookies
 * Used in Server Components to check authentication
 */
export async function validateSession(): Promise<{ user: SessionUser | null }> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    if (!accessToken) {
      return { user: null };
    }

    // Verify the JWT token
    const decoded = verifyAccessToken(accessToken);
    if (!decoded) {
      return { user: null };
    }

    // Validate session exists and is active
    if (decoded.sessionId) {
      const [session] = await db
        .select()
        .from(adminSessions)
        .where(
          and(
            eq(adminSessions.id, decoded.sessionId),
            eq(adminSessions.status, 'active')
          )
        )
        .limit(1);

      if (!session) {
        return { user: null };
      }

      // Check if session has expired
      if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
        return { user: null };
      }
    }

    // Get user details from database
    const [user] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, decoded.userId))
      .limit(1);

    if (!user || !user.isActive) {
      return { user: null };
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return { user: null };
    }

    return {
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
    console.error('Session validation error:', error);
    return { user: null };
  }
}

/**
 * Get current user from session
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const { user } = await validateSession();
  return user;
}

/**
 * Require authentication - throws if not authenticated
 * Use in Server Components that require auth
 */
export async function requireAuth(): Promise<SessionUser> {
  const { user } = await validateSession();

  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}

/**
 * Check if user has specific role(s)
 */
export async function hasRole(roles: string | string[]): Promise<boolean> {
  const { user } = await validateSession();

  if (!user) {
    return false;
  }

  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return allowedRoles.includes(user.role);
}