import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { SESSION_CONFIG } from '@/lib/auth/jwt';
import AdminUser from '@/lib/db/models/AdminUser';
import AdminSession from '@/lib/db/models/AdminSession';
import { POST as loginHandler } from '@/app/api/admin/auth/login/route';
import { POST as refreshHandler } from '@/app/api/admin/auth/refresh/route';
import { GET as sessionStatusHandler, POST as sessionExtendHandler, DELETE as sessionRevokeHandler } from '@/app/api/admin/auth/session-status/route';
import { GET as cleanupHandler } from '@/app/api/admin/cron/cleanup-sessions/route';

// Mock dependencies
jest.mock('@/lib/db/models/AdminUser');
jest.mock('@/lib/db/models/AdminSession');
jest.mock('bcryptjs');

// Set up environment variables
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.CRON_SECRET = 'test-cron-secret';

describe('Admin Authentication Flow Integration', () => {
  let mockAdmin: any;
  let mockSession: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-03T10:00:00Z'));

    mockAdmin = {
      _id: 'admin-123',
      email: 'admin@test.com',
      password: 'hashed-password',
      isActive: true,
      save: jest.fn()
    };

    mockSession = {
      _id: 'session-123',
      userId: 'admin-123',
      token: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: new Date('2025-01-03T11:00:00Z'), // 60 minutes from now
      lastActivity: new Date('2025-01-03T10:00:00Z'),
      isActive: true,
      extendedCount: 0,
      save: jest.fn()
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Complete Login Flow with 60-minute Session', () => {
    it('should create session with 60-minute expiry on successful login', async () => {
      (AdminUser.findOne as jest.Mock).mockResolvedValue(mockAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (AdminSession.create as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'correct-password'
        })
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.admin.email).toBe('admin@test.com');

      // Verify session created with 60-minute expiry
      expect(AdminSession.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'admin-123',
        expiresAt: expect.any(Date)
      }));

      const sessionCreateCall = (AdminSession.create as jest.Mock).mock.calls[0][0];
      const expiryTime = sessionCreateCall.expiresAt.getTime() - Date.now();

      // Should be approximately 60 minutes (allowing small variance for execution time)
      expect(expiryTime).toBeGreaterThanOrEqual(59 * 60 * 1000);
      expect(expiryTime).toBeLessThanOrEqual(61 * 60 * 1000);

      // Verify cookie settings
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('Max-Age=3600'); // 60 minutes in seconds
    });

    it('should verify JWT token has 60-minute expiry', async () => {
      (AdminUser.findOne as jest.Mock).mockResolvedValue(mockAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (AdminSession.create as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'correct-password'
        })
      });

      const response = await loginHandler(request);
      const data = await response.json();

      // Decode the access token
      const decoded = jwt.decode(data.accessToken) as jwt.JwtPayload;

      expect(decoded.exp).toBeDefined();

      // Verify token expires in 60 minutes
      const now = Math.floor(Date.now() / 1000);
      const tokenExpirySeconds = decoded.exp! - now;

      expect(tokenExpirySeconds).toBe(60 * 60); // Exactly 3600 seconds
    });

    it('should handle failed login attempts', async () => {
      (AdminUser.findOne as jest.Mock).mockResolvedValue(mockAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const request = new NextRequest('http://localhost/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'wrong-password'
        })
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid credentials');
      expect(AdminSession.create).not.toHaveBeenCalled();
    });

    it('should handle inactive admin accounts', async () => {
      mockAdmin.isActive = false;
      (AdminUser.findOne as jest.Mock).mockResolvedValue(mockAdmin);

      const request = new NextRequest('http://localhost/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'correct-password'
        })
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid credentials');
    });
  });

  describe('Refresh Token Flow Extends by 60 Minutes', () => {
    it('should extend session by 60 minutes on token refresh', async () => {
      const refreshToken = jwt.sign(
        { sessionId: 'session-123', userId: 'admin-123' },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );

      (AdminSession.findOne as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/admin/auth/refresh', {
        method: 'POST',
        headers: {
          cookie: `adminRefreshToken=${refreshToken}`
        }
      });

      const response = await refreshHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.accessToken).toBeDefined();

      // Verify new token has 60-minute expiry
      const decoded = jwt.decode(data.accessToken) as jwt.JwtPayload;
      const now = Math.floor(Date.now() / 1000);
      const tokenExpirySeconds = decoded.exp! - now;

      expect(tokenExpirySeconds).toBe(60 * 60);

      // Verify session extended
      expect(mockSession.save).toHaveBeenCalled();

      // Check session expiry was extended by 60 minutes
      const expectedExpiry = new Date(Date.now() + SESSION_CONFIG.SESSION_TIMEOUT_MS);
      expect(mockSession.expiresAt.getTime()).toBeCloseTo(expectedExpiry.getTime(), -2);
    });

    it('should reject expired refresh tokens', async () => {
      const expiredToken = jwt.sign(
        { sessionId: 'session-123', userId: 'admin-123' },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '-1s' } // Already expired
      );

      const request = new NextRequest('http://localhost/api/admin/auth/refresh', {
        method: 'POST',
        headers: {
          cookie: `adminRefreshToken=${expiredToken}`
        }
      });

      const response = await refreshHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid refresh token');
    });

    it('should reject refresh for inactive sessions', async () => {
      const refreshToken = jwt.sign(
        { sessionId: 'session-123', userId: 'admin-123' },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );

      mockSession.isActive = false;
      (AdminSession.findOne as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/admin/auth/refresh', {
        method: 'POST',
        headers: {
          cookie: `adminRefreshToken=${refreshToken}`
        }
      });

      const response = await refreshHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Session expired or invalid');
    });
  });

  describe('Session Status Endpoint', () => {
    it('should return session status with time remaining', async () => {
      const token = jwt.sign(
        { userId: 'admin-123', sessionId: 'session-123' },
        process.env.JWT_SECRET!,
        { expiresIn: '60m' }
      );

      (AdminSession.findById as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/admin/auth/session-status', {
        method: 'GET',
        headers: {
          cookie: `adminToken=${token}`
        }
      });

      const response = await sessionStatusHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.session).toBeDefined();
      expect(data.session.expiresAt).toBe(mockSession.expiresAt.toISOString());
      expect(data.session.isActive).toBe(true);
    });

    it('should handle missing session', async () => {
      const token = jwt.sign(
        { userId: 'admin-123', sessionId: 'non-existent' },
        process.env.JWT_SECRET!,
        { expiresIn: '60m' }
      );

      (AdminSession.findById as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/auth/session-status', {
        method: 'GET',
        headers: {
          cookie: `adminToken=${token}`
        }
      });

      const response = await sessionStatusHandler(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Session not found');
    });
  });

  describe('Session Extension Endpoint', () => {
    it('should extend session by 60 minutes', async () => {
      const token = jwt.sign(
        { userId: 'admin-123', sessionId: 'session-123' },
        process.env.JWT_SECRET!,
        { expiresIn: '5m' } // About to expire
      );

      (AdminSession.findById as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/admin/auth/session-status', {
        method: 'POST',
        headers: {
          cookie: `adminToken=${token}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ action: 'extend' })
      });

      const response = await sessionExtendHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.session).toBeDefined();

      // Verify session was extended
      expect(mockSession.save).toHaveBeenCalled();
      expect(mockSession.extendedCount).toBe(1);

      // Check new expiry is 60 minutes from now
      const expectedExpiry = new Date(Date.now() + SESSION_CONFIG.SESSION_TIMEOUT_MS);
      expect(mockSession.expiresAt.getTime()).toBeCloseTo(expectedExpiry.getTime(), -2);
    });

    it('should not extend inactive sessions', async () => {
      const token = jwt.sign(
        { userId: 'admin-123', sessionId: 'session-123' },
        process.env.JWT_SECRET!,
        { expiresIn: '60m' }
      );

      mockSession.isActive = false;
      (AdminSession.findById as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/admin/auth/session-status', {
        method: 'POST',
        headers: {
          cookie: `adminToken=${token}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ action: 'extend' })
      });

      const response = await sessionExtendHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot extend inactive session');
      expect(mockSession.save).not.toHaveBeenCalled();
    });
  });

  describe('Session Revocation', () => {
    it('should revoke active session', async () => {
      const token = jwt.sign(
        { userId: 'admin-123', sessionId: 'session-123' },
        process.env.JWT_SECRET!,
        { expiresIn: '60m' }
      );

      (AdminSession.findById as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/admin/auth/session-status', {
        method: 'DELETE',
        headers: {
          cookie: `adminToken=${token}`
        }
      });

      const response = await sessionRevokeHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Session revoked successfully');

      // Verify session was deactivated
      expect(mockSession.isActive).toBe(false);
      expect(mockSession.save).toHaveBeenCalled();
    });
  });

  describe('Session Cleanup After 60+ Minutes', () => {
    it('should cleanup expired sessions', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date('2025-01-03T08:00:00Z'), // 2 hours ago
        deleteOne: jest.fn()
      };

      const activeSession = {
        ...mockSession,
        _id: 'session-456',
        expiresAt: new Date('2025-01-03T10:30:00Z'), // 30 minutes from now
        deleteOne: jest.fn()
      };

      (AdminSession.find as jest.Mock).mockResolvedValue([expiredSession, activeSession]);

      const request = new NextRequest('http://localhost/api/admin/cron/cleanup-sessions', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${process.env.CRON_SECRET}`
        }
      });

      const response = await cleanupHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletedCount).toBe(1);

      // Only expired session should be deleted
      expect(expiredSession.deleteOne).toHaveBeenCalled();
      expect(activeSession.deleteOne).not.toHaveBeenCalled();
    });

    it('should require correct cron secret', async () => {
      const request = new NextRequest('http://localhost/api/admin/cron/cleanup-sessions', {
        method: 'GET',
        headers: {
          authorization: 'Bearer wrong-secret'
        }
      });

      const response = await cleanupHandler(request);

      expect(response.status).toBe(401);
    });

    it('should handle cleanup errors gracefully', async () => {
      (AdminSession.find as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/admin/cron/cleanup-sessions', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${process.env.CRON_SECRET}`
        }
      });

      const response = await cleanupHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to cleanup sessions');
    });
  });

  describe('Complete Session Lifecycle', () => {
    it('should handle complete session from login to expiry', async () => {
      // 1. Login
      (AdminUser.findOne as jest.Mock).mockResolvedValue(mockAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (AdminSession.create as jest.Mock).mockResolvedValue(mockSession);

      const loginRequest = new NextRequest('http://localhost/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'password'
        })
      });

      const loginResponse = await loginHandler(loginRequest);
      const loginData = await loginResponse.json();

      expect(loginData.success).toBe(true);
      const { accessToken } = loginData;

      // 2. Check status after 30 minutes
      jest.advanceTimersByTime(30 * 60 * 1000);

      (AdminSession.findById as jest.Mock).mockResolvedValue({
        ...mockSession,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes remaining
      });

      const statusRequest = new NextRequest('http://localhost/api/admin/auth/session-status', {
        method: 'GET',
        headers: {
          cookie: `adminToken=${accessToken}`
        }
      });

      const statusResponse = await sessionStatusHandler(statusRequest);
      const statusData = await statusResponse.json();

      expect(statusData.success).toBe(true);

      // 3. Extend session when warning threshold reached
      jest.advanceTimersByTime(25 * 60 * 1000); // 55 minutes total, 5 min remaining

      (AdminSession.findById as jest.Mock).mockResolvedValue({
        ...mockSession,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes remaining
      });

      const extendRequest = new NextRequest('http://localhost/api/admin/auth/session-status', {
        method: 'POST',
        headers: {
          cookie: `adminToken=${accessToken}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ action: 'extend' })
      });

      const extendResponse = await sessionExtendHandler(extendRequest);
      const extendData = await extendResponse.json();

      expect(extendData.success).toBe(true);

      // 4. Eventually expire after 60 more minutes without extension
      jest.advanceTimersByTime(61 * 60 * 1000);

      (AdminSession.findById as jest.Mock).mockResolvedValue({
        ...mockSession,
        expiresAt: new Date(Date.now() - 60 * 1000), // Expired 1 minute ago
        isActive: false
      });

      const expiredRequest = new NextRequest('http://localhost/api/admin/auth/session-status', {
        method: 'GET',
        headers: {
          cookie: `adminToken=${accessToken}`
        }
      });

      // Token itself would be expired at this point
      const expiredResponse = await sessionStatusHandler(expiredRequest);
      expect(expiredResponse.status).toBe(401); // Unauthorized due to expired token
    });
  });
});