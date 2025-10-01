import { NextRequest } from 'next/server';
import * as loginRoute from '@/app/api/admin/auth/login/route';
import * as logoutRoute from '@/app/api/admin/auth/logout/route';
import * as refreshRoute from '@/app/api/admin/auth/refresh/route';
import * as sessionRoute from '@/app/api/admin/auth/session/route';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { mockAdminUsers, mockTokens } from '@/test/fixtures/admin.fixtures';

// Mock database models
jest.mock('@/lib/db/models/AdminUser');
jest.mock('@/lib/db/models/AdminSession');
jest.mock('@/lib/db/models/AuditLog');
jest.mock('@/lib/db/connection', () => ({
  connectToDatabase: jest.fn().mockResolvedValue(true)
}));

// Mock Next.js functions
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    set: jest.fn(),
    delete: jest.fn(),
    get: jest.fn()
  }))
}));

// Mock rate limiter
jest.mock('@/lib/middleware/rateLimiter', () => ({
  withRateLimit: (handler: any) => handler
}));

const { AdminUser } = require('@/lib/db/models/AdminUser');
const { AdminSession } = require('@/lib/db/models/AdminSession');
const { AuditLog } = require('@/lib/db/models/AuditLog');

describe('Admin Authentication API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock returns
    AuditLog.create.mockResolvedValue({});
    AdminSession.create.mockResolvedValue({ _id: 'session-id' });
  });

  describe('POST /api/admin/auth/login', () => {
    const createLoginRequest = (body: any) => {
      return new NextRequest('http://localhost:3000/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Test Client'
        },
        body: JSON.stringify(body)
      });
    };

    it('should successfully login with valid credentials', async () => {
      const mockAdmin = {
        _id: '123',
        email: 'admin@biggbuzz.com',
        passwordHash: await bcrypt.hash('ValidPassword123!', 10),
        status: 'active',
        role: {
          name: 'super_admin',
          permissions: ['all']
        },
        firstName: 'Admin',
        lastName: 'User'
      };

      AdminUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockAdmin),
        populate: jest.fn().mockResolvedValue(mockAdmin)
      });

      const request = createLoginRequest({
        email: 'admin@biggbuzz.com',
        password: 'ValidPassword123!'
      });

      const response = await loginRoute.POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
      expect(body.user).toMatchObject({
        id: '123',
        email: 'admin@biggbuzz.com',
        role: 'super_admin'
      });

      expect(AdminUser.findOne).toHaveBeenCalledWith({ email: 'admin@biggbuzz.com' });
      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'login_success',
          userId: '123'
        })
      );
    });

    it('should fail login with invalid password', async () => {
      const mockAdmin = {
        _id: '123',
        email: 'admin@biggbuzz.com',
        passwordHash: await bcrypt.hash('CorrectPassword123!', 10),
        status: 'active'
      };

      AdminUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockAdmin)
      });

      const request = createLoginRequest({
        email: 'admin@biggbuzz.com',
        password: 'WrongPassword123!'
      });

      const response = await loginRoute.POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Invalid credentials');
      expect(body).not.toHaveProperty('accessToken');

      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'login_failed',
          details: expect.objectContaining({ reason: 'invalid_password' })
        })
      );
    });

    it('should fail login for non-existent user', async () => {
      AdminUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      const request = createLoginRequest({
        email: 'nonexistent@biggbuzz.com',
        password: 'AnyPassword123!'
      });

      const response = await loginRoute.POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Invalid credentials');

      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'login_failed',
          details: expect.objectContaining({ reason: 'user_not_found' })
        })
      );
    });

    it('should fail login for inactive account', async () => {
      const mockAdmin = {
        _id: '123',
        email: 'admin@biggbuzz.com',
        passwordHash: await bcrypt.hash('ValidPassword123!', 10),
        status: 'inactive'
      };

      AdminUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockAdmin)
      });

      const request = createLoginRequest({
        email: 'admin@biggbuzz.com',
        password: 'ValidPassword123!'
      });

      const response = await loginRoute.POST(request);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error).toBe('Account is inactive');

      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'login_failed',
          details: expect.objectContaining({ reason: 'account_inactive' })
        })
      );
    });

    it('should validate required fields', async () => {
      const testCases = [
        { email: '', password: 'pass' },
        { email: 'test@test.com', password: '' },
        { email: '', password: '' },
        {}
      ];

      for (const testCase of testCases) {
        const request = createLoginRequest(testCase);
        const response = await loginRoute.POST(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toBe('Email and password are required');
      }
    });

    it('should update last login timestamp', async () => {
      const mockAdmin = {
        _id: '123',
        email: 'admin@biggbuzz.com',
        passwordHash: await bcrypt.hash('ValidPassword123!', 10),
        status: 'active',
        role: { name: 'admin', permissions: [] },
        save: jest.fn()
      };

      AdminUser.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockAdmin)
        })
      });

      const request = createLoginRequest({
        email: 'admin@biggbuzz.com',
        password: 'ValidPassword123!'
      });

      await loginRoute.POST(request);

      expect(mockAdmin.save).toHaveBeenCalled();
      expect(mockAdmin.lastLogin).toBeDefined();
    });
  });

  describe('POST /api/admin/auth/refresh', () => {
    const createRefreshRequest = (token?: string) => {
      const headers: any = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      return new NextRequest('http://localhost:3000/api/admin/auth/refresh', {
        method: 'POST',
        headers
      });
    };

    it('should refresh tokens with valid refresh token', async () => {
      const mockSession = {
        _id: 'session-123',
        userId: '123',
        isValid: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        save: jest.fn()
      };

      const mockAdmin = {
        _id: '123',
        email: 'admin@biggbuzz.com',
        status: 'active',
        role: { name: 'admin', permissions: ['read'] }
      };

      // Mock valid refresh token
      const refreshToken = jwt.sign(
        { userId: '123', sessionId: 'session-123' },
        process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key-for-testing-only',
        { expiresIn: '7d' }
      );

      AdminSession.findById.mockResolvedValue(mockSession);
      AdminUser.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockAdmin)
      });

      const request = createRefreshRequest(refreshToken);
      const response = await refreshRoute.POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
    });

    it('should fail with invalid refresh token', async () => {
      const request = createRefreshRequest('invalid-token');
      const response = await refreshRoute.POST(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Invalid or expired refresh token');
    });

    it('should fail with expired session', async () => {
      const mockSession = {
        _id: 'session-123',
        userId: '123',
        isValid: true,
        expiresAt: new Date(Date.now() - 1000), // Expired
        save: jest.fn()
      };

      const refreshToken = jwt.sign(
        { userId: '123', sessionId: 'session-123' },
        process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key-for-testing-only',
        { expiresIn: '7d' }
      );

      AdminSession.findById.mockResolvedValue(mockSession);

      const request = createRefreshRequest(refreshToken);
      const response = await refreshRoute.POST(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Session expired');
    });

    it('should fail with invalidated session', async () => {
      const mockSession = {
        _id: 'session-123',
        userId: '123',
        isValid: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const refreshToken = jwt.sign(
        { userId: '123', sessionId: 'session-123' },
        process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key-for-testing-only',
        { expiresIn: '7d' }
      );

      AdminSession.findById.mockResolvedValue(mockSession);

      const request = createRefreshRequest(refreshToken);
      const response = await refreshRoute.POST(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Session expired');
    });
  });

  describe('POST /api/admin/auth/logout', () => {
    const createLogoutRequest = (token?: string) => {
      const headers: any = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      return new NextRequest('http://localhost:3000/api/admin/auth/logout', {
        method: 'POST',
        headers
      });
    };

    it('should successfully logout with valid token', async () => {
      const mockSession = {
        _id: 'session-123',
        isValid: true,
        save: jest.fn()
      };

      const accessToken = jwt.sign(
        {
          userId: '123',
          email: 'admin@biggbuzz.com',
          role: 'admin',
          permissions: [],
          sessionId: 'session-123'
        },
        process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
        { expiresIn: '15m' }
      );

      AdminSession.findById.mockResolvedValue(mockSession);

      const request = createLogoutRequest(accessToken);
      const response = await logoutRoute.POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('Logged out successfully');

      expect(mockSession.isValid).toBe(false);
      expect(mockSession.save).toHaveBeenCalled();

      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'logout',
          userId: '123'
        })
      );
    });

    it('should fail logout without token', async () => {
      const request = createLogoutRequest();
      const response = await logoutRoute.POST(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Authentication required');
    });

    it('should handle non-existent session gracefully', async () => {
      const accessToken = jwt.sign(
        {
          userId: '123',
          sessionId: 'non-existent'
        },
        process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
        { expiresIn: '15m' }
      );

      AdminSession.findById.mockResolvedValue(null);

      const request = createLogoutRequest(accessToken);
      const response = await logoutRoute.POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('Logged out successfully');
    });
  });

  describe('GET /api/admin/auth/session', () => {
    const createSessionRequest = (token?: string) => {
      const headers: any = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      return new NextRequest('http://localhost:3000/api/admin/auth/session', {
        method: 'GET',
        headers
      });
    };

    it('should return session info for valid token', async () => {
      const mockAdmin = {
        _id: '123',
        email: 'admin@biggbuzz.com',
        firstName: 'Admin',
        lastName: 'User',
        role: {
          name: 'super_admin',
          permissions: ['all']
        },
        status: 'active'
      };

      const accessToken = jwt.sign(
        {
          userId: '123',
          email: 'admin@biggbuzz.com',
          role: 'super_admin',
          permissions: ['all'],
          sessionId: 'session-123'
        },
        process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
        { expiresIn: '15m' }
      );

      AdminUser.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockAdmin)
      });

      const request = createSessionRequest(accessToken);
      const response = await sessionRoute.GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.user).toMatchObject({
        id: '123',
        email: 'admin@biggbuzz.com',
        role: 'super_admin'
      });
    });

    it('should return 401 for invalid token', async () => {
      const request = createSessionRequest('invalid-token');
      const response = await sessionRoute.GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Invalid or expired token');
    });

    it('should return 401 for expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: '123' },
        process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
        { expiresIn: '-1s' }
      );

      const request = createSessionRequest(expiredToken);
      const response = await sessionRoute.GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Invalid or expired token');
    });
  });
});