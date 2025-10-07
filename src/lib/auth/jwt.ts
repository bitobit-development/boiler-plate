import jwt from 'jsonwebtoken';
import { AdminUserType } from '@/lib/db/models/AdminUser';

// JWT Configuration Constants
/**
 * JWT configuration with extended session support
 * Access token duration extended to 60 minutes for better admin UX
 * @see https://jwt.io/introduction/
 */
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'default-access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';

/**
 * Access token expiry: 60 minutes (extended from 15m)
 * Can be overridden via JWT_ACCESS_EXPIRY environment variable
 */
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '60m';

/**
 * Refresh token expiry: 7 days
 * Can be overridden via JWT_REFRESH_EXPIRY environment variable
 */
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

/**
 * Session configuration
 * Used for activity monitoring and session management
 */
export const SESSION_CONFIG = {
  // Session timeout in seconds (60 minutes)
  SESSION_TIMEOUT: parseInt(process.env.ADMIN_SESSION_TIMEOUT || '3600'),
  // Warning threshold in seconds (5 minutes before expiry)
  WARNING_THRESHOLD: parseInt(process.env.ADMIN_SESSION_WARNING_THRESHOLD || '300'),
  // Activity check interval in seconds (check every 5 minutes)
  ACTIVITY_CHECK_INTERVAL: parseInt(process.env.ADMIN_ACTIVITY_CHECK_INTERVAL || '300'),
  // Maximum inactive time in seconds (30 minutes)
  MAX_INACTIVE_TIME: parseInt(process.env.ADMIN_MAX_INACTIVE_TIME || '1800')
};

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  sessionId?: string;
  kioskSessionId?: string;
  type: 'access' | 'refresh';
}

export interface DecodedToken extends TokenPayload {
  iat: number;
  exp: number;
}

/**
 * Generate access and refresh tokens for a user
 */
export function generateTokens(user: Partial<AdminUserType>, sessionId?: string, kioskSessionId?: string) {
  // Get permissions based on role if not explicitly set
  const permissions = user.permissions || getDefaultPermissions(user.role || 'viewer');

  const payload: Omit<TokenPayload, 'type'> = {
    userId: user.id!,
    email: user.email!,
    role: user.role!,
    permissions,
    sessionId,
    ...(kioskSessionId && { kioskSessionId })
  };

  const accessToken = jwt.sign(
    { ...payload, type: 'access' } as TokenPayload,
    ACCESS_SECRET,
    {
      expiresIn: ACCESS_EXPIRY,
      issuer: 'bigg-buzz-admin',
      audience: 'bigg-buzz-api'
    }
  );

  const refreshToken = jwt.sign(
    { ...payload, type: 'refresh' } as TokenPayload,
    REFRESH_SECRET,
    {
      expiresIn: REFRESH_EXPIRY,
      issuer: 'bigg-buzz-admin',
      audience: 'bigg-buzz-api'
    }
  );

  // Calculate expiry times
  const accessExpiresAt = new Date(Date.now() + parseExpiry(ACCESS_EXPIRY));
  const refreshExpiresAt = new Date(Date.now() + parseExpiry(REFRESH_EXPIRY));

  return {
    accessToken,
    refreshToken,
    accessExpiresAt,
    refreshExpiresAt
  };
}

/**
 * Verify and decode an access token
 */
export function verifyAccessToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET, {
      issuer: 'bigg-buzz-admin',
      audience: 'bigg-buzz-api'
    }) as DecodedToken;

    if (decoded.type !== 'access') {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Error verifying access token:', error);
    return null;
  }
}

/**
 * Verify and decode a refresh token
 */
export function verifyRefreshToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET, {
      issuer: 'bigg-buzz-admin',
      audience: 'bigg-buzz-api'
    }) as DecodedToken;

    if (decoded.type !== 'refresh') {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Error verifying refresh token:', error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Get token payload without verification (for debugging)
 */
export function getTokenPayload(token: string): TokenPayload | null {
  try {
    const decoded = jwt.decode(token) as DecodedToken;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as DecodedToken;
    if (!decoded || !decoded.exp) return true;

    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

/**
 * Parse expiry string to milliseconds
 */
function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 15 * 60 * 1000; // Default 15 minutes

  const [, value, unit] = match;
  const num = parseInt(value, 10);

  switch (unit) {
    case 's': return num * 1000;
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
}

/**
 * Generate a new access token from a refresh token
 */
export function refreshAccessToken(refreshToken: string): { accessToken: string; accessExpiresAt: Date } | null {
  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) return null;

  const accessToken = jwt.sign(
    {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions,
      sessionId: decoded.sessionId,
      ...(decoded.kioskSessionId && { kioskSessionId: decoded.kioskSessionId }),
      type: 'access'
    } as TokenPayload,
    ACCESS_SECRET,
    {
      expiresIn: ACCESS_EXPIRY,
      issuer: 'bigg-buzz-admin',
      audience: 'bigg-buzz-api'
    }
  );

  const accessExpiresAt = new Date(Date.now() + parseExpiry(ACCESS_EXPIRY));

  return { accessToken, accessExpiresAt };
}

/**
 * Get default permissions based on user role
 */
function getDefaultPermissions(role: string): string[] {
  switch (role) {
    case 'super_admin':
      return [
        'view_analytics',
        'view_registrations',
        'manage_registrations',
        'view_users',
        'manage_users',
        'view_settings',
        'manage_settings',
        'view_audit_logs',
        'export_data',
        'import_data'
      ];
    case 'admin':
      return [
        'view_analytics',
        'view_registrations',
        'manage_registrations',
        'view_users',
        'view_audit_logs',
        'export_data'
      ];
    case 'viewer':
      return [
        'view_analytics',
        'view_registrations',
        'view_audit_logs'
      ];
    default:
      return ['view_analytics'];
  }
}