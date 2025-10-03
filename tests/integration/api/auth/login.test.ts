/**
 * Integration tests for admin login API route
 * Tests 60-minute session timeout configuration and cookie settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/admin/auth/login/route';
import { AdminUser } from '@/lib/db/models/AdminUser';
import { AdminSession } from '@/lib/db/models/AdminSession';
import { AuditLog } from '@/lib/db/models/AuditLog';
import { generateTokens } from '@/lib/auth/jwt';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock the models and dependencies
jest.mock('@/lib/db/models/AdminUser');
jest.mock('@/lib/db/models/AdminSession');
jest.mock('@/lib/db/models/AuditLog');
jest.mock('@/lib/auth/middleware', () => ({
  rateLimit: jest.fn(() => true)
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  compare: jest.fn()
}));

describe('Admin Login API Route - 60 Minute Session', () => {
  const mockUser = {
    id: 'user-123',
    email: 'admin@test.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    passwordHash: 'hashed-password',
    isActive: true,
    isSuperAdmin: false,
    avatar: null,
    loginAttempts: 0,
    lockedUntil: null
  };

  const mockRequest = (body: any, headers: Record<string, string> = {}) => {
    return {
      json: jest.fn().mockResolvedValue(body),
      headers: {
        get: jest.fn((key: string) => headers[key] || null)
      }
    } as unknown as NextRequest;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Successful Login with 60-minute Session', () => {
    it('should create session with 60-minute access token expiry', async () => {
      const mockSession = {
        id: 'session-456',
        adminUserId: mockUser.id,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'active'
      };

      (AdminUser.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (AdminSession.create as jest.Mock).mockResolvedValue(mockSession);
      (AdminUser.updateLoginInfo as jest.Mock).mockResolvedValue(true);
      (AuditLog.create as jest.Mock).mockResolvedValue({});

      const request = mockRequest(
        { email: 'admin@test.com', password: 'password123' },
        { 'x-forwarded-for': '192.168.1.1', 'user-agent': 'Test Browser' }
      );

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.tokens).toBeDefined();

      // Verify tokens were generated
      const { accessToken } = responseData.tokens;
      const decoded = jwt.decode(accessToken) as any;

      // Check that access token expires in approximately 60 minutes
      const expectedExpiry = Math.floor(Date.now() / 1000) + (60 * 60);
      expect(Math.abs(decoded.exp - expectedExpiry)).toBeLessThan(5);
    });

    it('should set cookie with maxAge of 3600 seconds (60 minutes)', async () => {
      (AdminUser.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (AdminSession.create as jest.Mock).mockResolvedValue({
        id: 'session-123',
        adminUserId: mockUser.id
      });
      (AdminUser.updateLoginInfo as jest.Mock).mockResolvedValue(true);
      (AuditLog.create as jest.Mock).mockResolvedValue({});

      const request = mockRequest({
        email: 'admin@test.com',
        password: 'password123'
      });

      const response = await POST(request);

      // Check cookies were set with correct maxAge
      const cookies = response.cookies;
      const accessTokenCookie = cookies.get('accessToken');
      const refreshTokenCookie = cookies.get('refreshToken');

      expect(accessTokenCookie).toBeDefined();
      expect(accessTokenCookie?.maxAge).toBe(3600); // 60 minutes in seconds

      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie?.maxAge).toBe(7 * 24 * 60 * 60); // 7 days in seconds
    });

    it('should include session ID in response and audit log', async () => {
      const mockSessionId = 'session-789';

      (AdminUser.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (AdminSession.create as jest.Mock).mockResolvedValue({
        id: mockSessionId,
        adminUserId: mockUser.id
      });
      (AdminUser.updateLoginInfo as jest.Mock).mockResolvedValue(true);
      (AuditLog.create as jest.Mock).mockResolvedValue({});

      const request = mockRequest({
        email: 'admin@test.com',
        password: 'password123'
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.sessionId).toBe(mockSessionId);

      // Verify audit log includes session ID
      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: mockSessionId,
          metadata: expect.objectContaining({
            sessionId: mockSessionId
          })
        })
      );
    });

    it('should return correct user data and tokens', async () => {
      (AdminUser.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (AdminSession.create as jest.Mock).mockResolvedValue({
        id: 'session-123'
      });
      (AdminUser.updateLoginInfo as jest.Mock).mockResolvedValue(true);
      (AuditLog.create as jest.Mock).mockResolvedValue({});

      const request = mockRequest({
        email: 'admin@test.com',
        password: 'password123'
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
        avatar: mockUser.avatar,
        isSuperAdmin: mockUser.isSuperAdmin
      });

      expect(responseData.tokens.accessToken).toBeDefined();
      expect(responseData.tokens.refreshToken).toBeDefined();
      expect(responseData.tokens.accessExpiresAt).toBeDefined();
      expect(responseData.tokens.refreshExpiresAt).toBeDefined();
    });
  });

  describe('Failed Login Attempts', () => {
    it('should return 400 for missing credentials', async () => {
      const request = mockRequest({ email: 'admin@test.com' });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Email and password are required');
    });

    it('should return 401 for non-existent user', async () => {
      (AdminUser.findByEmail as jest.Mock).mockResolvedValue(null);

      const request = mockRequest({
        email: 'nonexistent@test.com',
        password: 'password123'
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Invalid email or password');

      // Verify audit log was created for failed attempt
      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'login',
          isSuccess: false,
          description: 'Failed login attempt - user not found'
        })
      );
    });

    it('should return 401 for invalid password', async () => {
      (AdminUser.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (AdminUser.incrementLoginAttempts as jest.Mock).mockResolvedValue(true);

      const request = mockRequest({
        email: 'admin@test.com',
        password: 'wrongpassword'
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Invalid email or password');
      expect(AdminUser.incrementLoginAttempts).toHaveBeenCalledWith(mockUser.id);

      // Verify audit log for failed password attempt
      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'login',
          isSuccess: false,
          description: 'Failed login attempt - invalid password'
        })
      );
    });

    it('should return 423 for locked account', async () => {
      const lockedUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000) // Locked for 30 minutes
      };

      (AdminUser.findByEmail as jest.Mock).mockResolvedValue(lockedUser);

      const request = mockRequest({
        email: 'admin@test.com',
        password: 'password123'
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(423);
      expect(responseData.error).toMatch(/Account is locked/);

      // Verify audit log for locked account
      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'login',
          isSuccess: false,
          description: 'Failed login attempt - account locked'
        })
      );
    });

    it('should return 403 for inactive account', async () => {
      const inactiveUser = {
        ...mockUser,
        isActive: false
      };

      (AdminUser.findByEmail as jest.Mock).mockResolvedValue(inactiveUser);

      const request = mockRequest({
        email: 'admin@test.com',
        password: 'password123'
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.error).toBe('Account is disabled. Please contact administrator.');

      // Verify audit log for inactive account
      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'login',
          isSuccess: false,
          description: 'Failed login attempt - account inactive'
        })
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      const { rateLimit } = require('@/lib/auth/middleware');
      (rateLimit as jest.Mock).mockReturnValue(false);

      const request = mockRequest(
        { email: 'admin@test.com', password: 'password123' },
        { 'x-forwarded-for': '192.168.1.1' }
      );

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(429);
      expect(responseData.error).toBe('Too many login attempts. Please try again later.');
      expect(rateLimit).toHaveBeenCalledWith('login:192.168.1.1');
    });
  });

  describe('Session Creation and Token Generation', () => {
    it('should create session with correct parameters', async () => {
      (AdminUser.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (AdminSession.create as jest.Mock).mockResolvedValue({
        id: 'session-123'
      });
      (AdminUser.updateLoginInfo as jest.Mock).mockResolvedValue(true);
      (AuditLog.create as jest.Mock).mockResolvedValue({});

      const request = mockRequest(
        { email: 'admin@test.com', password: 'password123' },
        {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0'
        }
      );

      await POST(request);

      // Verify session was created with correct data
      expect(AdminSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          adminUserId: mockUser.id,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          status: 'active'
        })
      );
    });

    it('should update user login info after successful login', async () => {
      (AdminUser.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (AdminSession.create as jest.Mock).mockResolvedValue({
        id: 'session-123'
      });
      (AdminUser.updateLoginInfo as jest.Mock).mockResolvedValue(true);
      (AuditLog.create as jest.Mock).mockResolvedValue({});

      const request = mockRequest(
        { email: 'admin@test.com', password: 'password123' },
        { 'x-forwarded-for': '192.168.1.1' }
      );

      await POST(request);

      expect(AdminUser.updateLoginInfo).toHaveBeenCalledWith(
        mockUser.id,
        '192.168.1.1'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      (AdminUser.findByEmail as jest.Mock).mockRejectedValue(
        new Error('Database connection error')
      );

      const request = mockRequest({
        email: 'admin@test.com',
        password: 'password123'
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('An error occurred during login');
      expect(responseData.details).toBe('Database connection error');
    });

    it('should handle session creation failures', async () => {
      (AdminUser.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (AdminSession.create as jest.Mock).mockRejectedValue(
        new Error('Failed to create session')
      );

      const request = mockRequest({
        email: 'admin@test.com',
        password: 'password123'
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('An error occurred during login');
    });
  });

  describe('Security Features', () => {
    it('should use secure cookies in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      (AdminUser.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (AdminSession.create as jest.Mock).mockResolvedValue({
        id: 'session-123'
      });
      (AdminUser.updateLoginInfo as jest.Mock).mockResolvedValue(true);
      (AuditLog.create as jest.Mock).mockResolvedValue({});

      const request = mockRequest({
        email: 'admin@test.com',
        password: 'password123'
      });

      const response = await POST(request);
      const accessTokenCookie = response.cookies.get('accessToken');

      expect(accessTokenCookie?.secure).toBe(true);
      expect(accessTokenCookie?.httpOnly).toBe(true);
      expect(accessTokenCookie?.sameSite).toBe('lax');

      process.env.NODE_ENV = originalEnv;
    });

    it('should normalize email to lowercase', async () => {
      (AdminUser.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (AdminSession.create as jest.Mock).mockResolvedValue({
        id: 'session-123'
      });
      (AdminUser.updateLoginInfo as jest.Mock).mockResolvedValue(true);
      (AuditLog.create as jest.Mock).mockResolvedValue({});

      const request = mockRequest({
        email: 'ADMIN@TEST.COM',
        password: 'password123'
      });

      await POST(request);

      expect(AdminUser.findByEmail).toHaveBeenCalledWith('admin@test.com');
    });
  });
});