import { NextRequest, NextResponse } from 'next/server';
import { withAuth, requirePermissions, AuthenticatedRequest } from '@/lib/middleware/auth';
import * as jwtUtils from '@/lib/auth/jwt';
import { TokenPayload } from '@/lib/auth/jwt';

// Mock JWT utilities
jest.mock('@/lib/auth/jwt');

// Mock headers
jest.mock('next/headers', () => ({
  headers: jest.fn(() => ({
    get: jest.fn((key: string) => {
      if (key === 'x-forwarded-for') return '192.168.1.1';
      if (key === 'user-agent') return 'Mozilla/5.0';
      return null;
    })
  }))
}));

// Mock AuditLog
jest.mock('@/lib/db/models/AuditLog', () => ({
  AuditLog: {
    create: jest.fn()
  }
}));

describe('Auth Middleware', () => {
  const mockTokenPayload: TokenPayload = {
    userId: '123',
    email: 'admin@biggbuzz.com',
    role: 'super_admin',
    permissions: ['read', 'write', 'delete'],
    sessionId: 'session-123'
  };

  const mockHandler = jest.fn(async (req: AuthenticatedRequest) => {
    return NextResponse.json({
      success: true,
      user: req.user
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withAuth', () => {
    describe('Token Extraction', () => {
      it('should extract token from Authorization header', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/test', {
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        });

        (jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(mockTokenPayload);

        const wrappedHandler = await withAuth(mockHandler);
        const response = await wrappedHandler(request);

        expect(jwtUtils.verifyAccessToken).toHaveBeenCalledWith('valid-token');
        expect(mockHandler).toHaveBeenCalled();
        expect(response.status).toBe(200);
      });

      it('should extract token from cookie if no Authorization header', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/test');
        Object.defineProperty(request, 'cookies', {
          value: {
            get: jest.fn((name: string) => {
              if (name === 'access_token') {
                return { value: 'cookie-token' };
              }
              return null;
            })
          }
        });

        (jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(mockTokenPayload);

        const wrappedHandler = await withAuth(mockHandler);
        const response = await wrappedHandler(request);

        expect(jwtUtils.verifyAccessToken).toHaveBeenCalledWith('cookie-token');
        expect(mockHandler).toHaveBeenCalled();
        expect(response.status).toBe(200);
      });

      it('should prefer Authorization header over cookie', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/test', {
          headers: {
            'Authorization': 'Bearer header-token'
          }
        });
        Object.defineProperty(request, 'cookies', {
          value: {
            get: jest.fn(() => ({ value: 'cookie-token' }))
          }
        });

        (jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(mockTokenPayload);

        const wrappedHandler = await withAuth(mockHandler);
        await wrappedHandler(request);

        expect(jwtUtils.verifyAccessToken).toHaveBeenCalledWith('header-token');
        expect(jwtUtils.verifyAccessToken).not.toHaveBeenCalledWith('cookie-token');
      });
    });

    describe('Authentication Validation', () => {
      it('should return 401 if no token provided', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/test');
        Object.defineProperty(request, 'cookies', {
          value: {
            get: jest.fn(() => null)
          }
        });

        const wrappedHandler = await withAuth(mockHandler);
        const response = await wrappedHandler(request);

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.error).toBe('Authentication required');
        expect(mockHandler).not.toHaveBeenCalled();
      });

      it('should return 401 for invalid token', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/test', {
          headers: {
            'Authorization': 'Bearer invalid-token'
          }
        });

        (jwtUtils.verifyAccessToken as jest.Mock).mockImplementation(() => {
          throw new Error('Invalid token');
        });

        const wrappedHandler = await withAuth(mockHandler);
        const response = await wrappedHandler(request);

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.error).toBe('Invalid or expired token');
        expect(mockHandler).not.toHaveBeenCalled();
      });

      it('should attach user to request on successful authentication', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/test', {
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        });

        (jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(mockTokenPayload);

        const wrappedHandler = await withAuth(mockHandler);
        await wrappedHandler(request);

        expect(mockHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            user: mockTokenPayload
          })
        );
      });
    });

    describe('Permission Checking', () => {
      it('should allow access when user has required permissions', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/test', {
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        });

        (jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(mockTokenPayload);

        const wrappedHandler = await withAuth(mockHandler, ['read', 'write']);
        const response = await wrappedHandler(request);

        expect(response.status).toBe(200);
        expect(mockHandler).toHaveBeenCalled();
      });

      it('should return 403 when user lacks required permissions', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/test', {
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        });

        const limitedUser = {
          ...mockTokenPayload,
          permissions: ['read'] // Missing 'admin' permission
        };

        (jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(limitedUser);

        const wrappedHandler = await withAuth(mockHandler, ['read', 'admin']);
        const response = await wrappedHandler(request);

        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.error).toBe('Insufficient permissions');
        expect(mockHandler).not.toHaveBeenCalled();
      });

      it('should allow access when no permissions are required', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/test', {
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        });

        const userWithNoPermissions = {
          ...mockTokenPayload,
          permissions: []
        };

        (jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(userWithNoPermissions);

        const wrappedHandler = await withAuth(mockHandler); // No permissions required
        const response = await wrappedHandler(request);

        expect(response.status).toBe(200);
        expect(mockHandler).toHaveBeenCalled();
      });

      it('should check all required permissions', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/test', {
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        });

        const partialPermUser = {
          ...mockTokenPayload,
          permissions: ['read', 'write'] // Missing 'delete'
        };

        (jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(partialPermUser);

        const wrappedHandler = await withAuth(mockHandler, ['read', 'write', 'delete']);
        const response = await wrappedHandler(request);

        expect(response.status).toBe(403);
        expect(mockHandler).not.toHaveBeenCalled();
      });
    });

    describe('Error Handling', () => {
      it('should handle malformed Authorization header', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/test', {
          headers: {
            'Authorization': 'NotBearer token'
          }
        });
        Object.defineProperty(request, 'cookies', {
          value: {
            get: jest.fn(() => null)
          }
        });

        const wrappedHandler = await withAuth(mockHandler);
        const response = await wrappedHandler(request);

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.error).toBe('Authentication required');
      });

      it('should handle JWT verification errors gracefully', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/test', {
          headers: {
            'Authorization': 'Bearer expired-token'
          }
        });

        (jwtUtils.verifyAccessToken as jest.Mock).mockImplementation(() => {
          throw new Error('Token expired');
        });

        const wrappedHandler = await withAuth(mockHandler);
        const response = await wrappedHandler(request);

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.error).toBe('Invalid or expired token');
      });

      it('should handle handler errors', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/test', {
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        });

        (jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(mockTokenPayload);

        const errorHandler = jest.fn().mockRejectedValue(new Error('Handler error'));
        const wrappedHandler = await withAuth(errorHandler);

        await expect(wrappedHandler(request)).rejects.toThrow('Handler error');
      });
    });
  });

  describe('requirePermissions', () => {
    it('should create middleware with required permissions', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/test', {
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      (jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(mockTokenPayload);

      const protectedHandler = requirePermissions('read', 'write')(mockHandler);
      const response = await protectedHandler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should reject when missing required permissions', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/test', {
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      const limitedUser = {
        ...mockTokenPayload,
        permissions: ['read']
      };

      (jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(limitedUser);

      const protectedHandler = requirePermissions('read', 'write', 'admin')(mockHandler);
      const response = await protectedHandler(request);

      expect(response.status).toBe(403);
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should support single permission requirement', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/test', {
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      (jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(mockTokenPayload);

      const protectedHandler = requirePermissions('read')(mockHandler);
      const response = await protectedHandler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should support no permissions (empty call)', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/test', {
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      (jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(mockTokenPayload);

      const protectedHandler = requirePermissions()(mockHandler);
      const response = await protectedHandler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array(5).fill(null).map((_, i) =>
        new NextRequest(`http://localhost:3000/api/admin/test${i}`, {
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        })
      );

      (jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(mockTokenPayload);

      const wrappedHandler = await withAuth(mockHandler);
      const responses = await Promise.all(
        requests.map(req => wrappedHandler(req))
      );

      expect(responses).toHaveLength(5);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      expect(mockHandler).toHaveBeenCalledTimes(5);
    });

    it('should handle mixed authentication states', async () => {
      const validRequest = new NextRequest('http://localhost:3000/api/admin/test', {
        headers: { 'Authorization': 'Bearer valid-token' }
      });

      const invalidRequest = new NextRequest('http://localhost:3000/api/admin/test', {
        headers: { 'Authorization': 'Bearer invalid-token' }
      });

      const noAuthRequest = new NextRequest('http://localhost:3000/api/admin/test');
      Object.defineProperty(noAuthRequest, 'cookies', {
        value: { get: jest.fn(() => null) }
      });

      (jwtUtils.verifyAccessToken as jest.Mock)
        .mockReturnValueOnce(mockTokenPayload)
        .mockImplementationOnce(() => { throw new Error('Invalid'); });

      const wrappedHandler = await withAuth(mockHandler);

      const validResponse = await wrappedHandler(validRequest);
      const invalidResponse = await wrappedHandler(invalidRequest);
      const noAuthResponse = await wrappedHandler(noAuthRequest);

      expect(validResponse.status).toBe(200);
      expect(invalidResponse.status).toBe(401);
      expect(noAuthResponse.status).toBe(401);
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });
  });
});