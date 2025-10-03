/**
 * Unit tests for JWT configuration and utilities
 * Tests 60-minute session timeout and related JWT functionality
 */

import jwt from 'jsonwebtoken';
import {
  SESSION_CONFIG,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  getTokenPayload,
  isTokenExpired,
  refreshAccessToken
} from '@/lib/auth/jwt';
import { AdminUserType } from '@/lib/db/models/AdminUser';

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = {
    ...originalEnv,
    JWT_ACCESS_SECRET: 'test-access-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_ACCESS_EXPIRY: '60m', // 60-minute access token
    JWT_REFRESH_EXPIRY: '7d',
    ADMIN_SESSION_TIMEOUT: '3600', // 60 minutes in seconds
    ADMIN_SESSION_WARNING_THRESHOLD: '300', // 5 minutes
    ADMIN_ACTIVITY_CHECK_INTERVAL: '300', // 5 minutes
    ADMIN_MAX_INACTIVE_TIME: '1800' // 30 minutes
  };
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
});

describe('JWT Configuration - 60 Minute Session', () => {
  describe('SESSION_CONFIG', () => {
    it('should have correct default session configuration values', () => {
      expect(SESSION_CONFIG.SESSION_TIMEOUT).toBe(3600); // 60 minutes
      expect(SESSION_CONFIG.WARNING_THRESHOLD).toBe(300); // 5 minutes
      expect(SESSION_CONFIG.ACTIVITY_CHECK_INTERVAL).toBe(300); // 5 minutes
      expect(SESSION_CONFIG.MAX_INACTIVE_TIME).toBe(1800); // 30 minutes
    });

    it('should use environment variables when set', () => {
      // Re-import to get new values
      jest.resetModules();
      process.env.ADMIN_SESSION_TIMEOUT = '7200'; // 2 hours
      process.env.ADMIN_SESSION_WARNING_THRESHOLD = '600'; // 10 minutes

      const { SESSION_CONFIG: newConfig } = require('@/lib/auth/jwt');

      expect(newConfig.SESSION_TIMEOUT).toBe(7200);
      expect(newConfig.WARNING_THRESHOLD).toBe(600);
    });
  });

  describe('generateTokens', () => {
    const mockUser: Partial<AdminUserType> = {
      id: 'user-123',
      email: 'admin@test.com',
      role: 'admin',
      permissions: ['view_analytics', 'manage_users']
    };

    it('should generate access and refresh tokens with 60-minute access expiry', () => {
      const sessionId = 'session-123';
      const result = generateTokens(mockUser, sessionId);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('accessExpiresAt');
      expect(result).toHaveProperty('refreshExpiresAt');

      // Verify access token expiry is ~60 minutes from now
      const expectedExpiry = Date.now() + (60 * 60 * 1000); // 60 minutes
      const actualExpiry = result.accessExpiresAt.getTime();
      expect(Math.abs(actualExpiry - expectedExpiry)).toBeLessThan(1000); // Within 1 second
    });

    it('should include session ID in token payload', () => {
      const sessionId = 'session-456';
      const result = generateTokens(mockUser, sessionId);

      const decoded = jwt.decode(result.accessToken) as any;
      expect(decoded.sessionId).toBe(sessionId);
    });

    it('should set correct token types', () => {
      const result = generateTokens(mockUser);

      const accessDecoded = jwt.decode(result.accessToken) as any;
      const refreshDecoded = jwt.decode(result.refreshToken) as any;

      expect(accessDecoded.type).toBe('access');
      expect(refreshDecoded.type).toBe('refresh');
    });

    it('should use default permissions based on role when not provided', () => {
      const userWithoutPermissions = {
        ...mockUser,
        permissions: undefined
      };

      const result = generateTokens(userWithoutPermissions);
      const decoded = jwt.decode(result.accessToken) as any;

      // Admin role should have these permissions
      expect(decoded.permissions).toContain('view_analytics');
      expect(decoded.permissions).toContain('view_registrations');
      expect(decoded.permissions).toContain('manage_registrations');
    });

    it('should set correct JWT options (issuer, audience)', () => {
      const result = generateTokens(mockUser);

      const accessDecoded = jwt.decode(result.accessToken, { complete: true }) as any;
      expect(accessDecoded.payload.iss).toBe('bigg-buzz-admin');
      expect(accessDecoded.payload.aud).toBe('bigg-buzz-api');
    });

    it('should calculate refresh token expiry as 7 days', () => {
      const result = generateTokens(mockUser);

      const expectedExpiry = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
      const actualExpiry = result.refreshExpiresAt.getTime();
      expect(Math.abs(actualExpiry - expectedExpiry)).toBeLessThan(1000); // Within 1 second
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@test.com',
        role: 'admin'
      };

      const { accessToken } = generateTokens(mockUser);
      const decoded = verifyAccessToken(accessToken);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe('user-123');
      expect(decoded?.type).toBe('access');
    });

    it('should return null for invalid token', () => {
      const decoded = verifyAccessToken('invalid-token');
      expect(decoded).toBeNull();
    });

    it('should return null for refresh token used as access token', () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@test.com',
        role: 'admin'
      };

      const { refreshToken } = generateTokens(mockUser);
      const decoded = verifyAccessToken(refreshToken);
      expect(decoded).toBeNull();
    });

    it('should return null for expired token', () => {
      const expiredToken = jwt.sign(
        { userId: 'user-123', type: 'access' },
        process.env.JWT_ACCESS_SECRET!,
        { expiresIn: '-1h' } // Already expired
      );

      const decoded = verifyAccessToken(expiredToken);
      expect(decoded).toBeNull();
    });

    it('should verify token has correct expiry time (60 minutes)', () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@test.com',
        role: 'admin'
      };

      const { accessToken } = generateTokens(mockUser);
      const decoded = verifyAccessToken(accessToken);

      if (decoded) {
        const expectedExpiry = Math.floor(Date.now() / 1000) + (60 * 60); // 60 minutes
        expect(Math.abs(decoded.exp - expectedExpiry)).toBeLessThan(5); // Within 5 seconds
      }
    });

  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@test.com',
        role: 'admin'
      };

      const { refreshToken } = generateTokens(mockUser);
      const decoded = verifyRefreshToken(refreshToken);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe('user-123');
      expect(decoded?.type).toBe('refresh');
    });

    it('should return null for access token used as refresh token', () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@test.com',
        role: 'admin'
      };

      const { accessToken } = generateTokens(mockUser);
      const decoded = verifyRefreshToken(accessToken);
      expect(decoded).toBeNull();
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new access token with 60-minute expiry from valid refresh token', () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@test.com',
        role: 'admin',
        permissions: ['view_analytics']
      };

      const { refreshToken } = generateTokens(mockUser, 'session-789');
      const result = refreshAccessToken(refreshToken);

      expect(result).not.toBeNull();
      expect(result?.accessToken).toBeDefined();

      // Verify new access token has 60-minute expiry
      const expectedExpiry = Date.now() + (60 * 60 * 1000);
      const actualExpiry = result!.accessExpiresAt.getTime();
      expect(Math.abs(actualExpiry - expectedExpiry)).toBeLessThan(1000);

      // Verify token contains same user data
      const decoded = jwt.decode(result!.accessToken) as any;
      expect(decoded.userId).toBe('user-123');
      expect(decoded.sessionId).toBe('session-789');
    });

    it('should return null for invalid refresh token', () => {
      const result = refreshAccessToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should maintain session ID when refreshing', () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@test.com',
        role: 'admin'
      };

      const sessionId = 'original-session-123';
      const { refreshToken } = generateTokens(mockUser, sessionId);
      const result = refreshAccessToken(refreshToken);

      const decoded = jwt.decode(result!.accessToken) as any;
      expect(decoded.sessionId).toBe(sessionId);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = extractTokenFromHeader('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(token).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('should return null for missing header', () => {
      const token = extractTokenFromHeader(undefined);
      expect(token).toBeNull();
    });

    it('should return null for invalid format', () => {
      expect(extractTokenFromHeader('InvalidFormat')).toBeNull();
      expect(extractTokenFromHeader('Token abc123')).toBeNull();
      expect(extractTokenFromHeader('Bearer')).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token within 60 minutes', () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@test.com',
        role: 'admin'
      };

      const { accessToken } = generateTokens(mockUser);
      expect(isTokenExpired(accessToken)).toBe(false);
    });

    it('should return true for expired token', () => {
      const expiredToken = jwt.sign(
        { userId: 'user-123' },
        'secret',
        { expiresIn: '-1h' }
      );

      expect(isTokenExpired(expiredToken)).toBe(true);
    });

    it('should return true for invalid token', () => {
      expect(isTokenExpired('invalid-token')).toBe(true);
    });

    it('should handle token without exp claim', () => {
      const tokenWithoutExp = jwt.sign(
        { userId: 'user-123' },
        'secret',
        { noTimestamp: true }
      );

      expect(isTokenExpired(tokenWithoutExp)).toBe(true);
    });
  });

  describe('getTokenPayload', () => {
    it('should decode token payload without verification', () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@test.com',
        role: 'admin'
      };

      const { accessToken } = generateTokens(mockUser);
      const payload = getTokenPayload(accessToken);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe('user-123');
      expect(payload?.email).toBe('admin@test.com');
    });

    it('should return null for invalid token', () => {
      const payload = getTokenPayload('invalid-token');
      expect(payload).toBeNull();
    });
  });

  describe('Permission Defaults', () => {
    it('should assign correct permissions for super_admin role', () => {
      const user = {
        id: 'user-1',
        email: 'super@test.com',
        role: 'super_admin'
      };

      const { accessToken } = generateTokens(user);
      const decoded = jwt.decode(accessToken) as any;

      expect(decoded.permissions).toContain('manage_settings');
      expect(decoded.permissions).toContain('import_data');
      expect(decoded.permissions).toContain('manage_users');
    });

    it('should assign correct permissions for admin role', () => {
      const user = {
        id: 'user-2',
        email: 'admin@test.com',
        role: 'admin'
      };

      const { accessToken } = generateTokens(user);
      const decoded = jwt.decode(accessToken) as any;

      expect(decoded.permissions).toContain('view_analytics');
      expect(decoded.permissions).toContain('manage_registrations');
      expect(decoded.permissions).not.toContain('manage_settings');
    });

    it('should assign correct permissions for viewer role', () => {
      const user = {
        id: 'user-3',
        email: 'viewer@test.com',
        role: 'viewer'
      };

      const { accessToken } = generateTokens(user);
      const decoded = jwt.decode(accessToken) as any;

      expect(decoded.permissions).toContain('view_analytics');
      expect(decoded.permissions).toContain('view_registrations');
      expect(decoded.permissions).not.toContain('manage_registrations');
    });
  });
});