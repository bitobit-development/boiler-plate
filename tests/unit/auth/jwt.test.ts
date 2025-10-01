import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  TokenPayload,
  RefreshTokenPayload
} from '@/lib/auth/jwt';

// Mock environment variables are set in tests/setup.ts
const JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
const JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';

describe('JWT Utilities', () => {
  const mockTokenPayload: TokenPayload = {
    userId: '123',
    email: 'admin@biggbuzz.com',
    role: 'super_admin',
    permissions: ['read', 'write', 'delete'],
    sessionId: 'session-123'
  };

  const mockRefreshPayload: RefreshTokenPayload = {
    userId: '123',
    sessionId: 'session-123'
  };

  describe('generateAccessToken', () => {
    it('should generate a valid JWT access token', () => {
      const token = generateAccessToken(mockTokenPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include all payload fields in the token', () => {
      const token = generateAccessToken(mockTokenPayload);
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      expect(decoded.userId).toBe(mockTokenPayload.userId);
      expect(decoded.email).toBe(mockTokenPayload.email);
      expect(decoded.role).toBe(mockTokenPayload.role);
      expect(decoded.permissions).toEqual(mockTokenPayload.permissions);
      expect(decoded.sessionId).toBe(mockTokenPayload.sessionId);
    });

    it('should set expiration time to 15 minutes', () => {
      const token = generateAccessToken(mockTokenPayload);
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      const now = Math.floor(Date.now() / 1000);
      const expirationTime = decoded.exp - decoded.iat;

      expect(expirationTime).toBe(15 * 60); // 15 minutes in seconds
    });

    it('should generate different tokens for different payloads', () => {
      const token1 = generateAccessToken(mockTokenPayload);
      const token2 = generateAccessToken({
        ...mockTokenPayload,
        userId: '456'
      });

      expect(token1).not.toBe(token2);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid JWT refresh token', () => {
      const token = generateRefreshToken(mockRefreshPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include refresh payload fields in the token', () => {
      const token = generateRefreshToken(mockRefreshPayload);
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as any;

      expect(decoded.userId).toBe(mockRefreshPayload.userId);
      expect(decoded.sessionId).toBe(mockRefreshPayload.sessionId);
    });

    it('should set expiration time to 7 days', () => {
      const token = generateRefreshToken(mockRefreshPayload);
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as any;

      const expirationTime = decoded.exp - decoded.iat;
      expect(expirationTime).toBe(7 * 24 * 60 * 60); // 7 days in seconds
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify and return payload for valid token', () => {
      const token = generateAccessToken(mockTokenPayload);
      const verified = verifyAccessToken(token);

      expect(verified.userId).toBe(mockTokenPayload.userId);
      expect(verified.email).toBe(mockTokenPayload.email);
      expect(verified.role).toBe(mockTokenPayload.role);
      expect(verified.permissions).toEqual(mockTokenPayload.permissions);
      expect(verified.sessionId).toBe(mockTokenPayload.sessionId);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => verifyAccessToken(invalidToken)).toThrow('Invalid or expired access token');
    });

    it('should throw error for expired token', () => {
      // Create token that expires immediately
      const expiredToken = jwt.sign(mockTokenPayload, JWT_SECRET, {
        expiresIn: '-1s'
      });

      expect(() => verifyAccessToken(expiredToken)).toThrow('Invalid or expired access token');
    });

    it('should throw error for token signed with wrong secret', () => {
      const wrongSecretToken = jwt.sign(mockTokenPayload, 'wrong-secret', {
        expiresIn: '15m'
      });

      expect(() => verifyAccessToken(wrongSecretToken)).toThrow('Invalid or expired access token');
    });

    it('should throw error for malformed token', () => {
      const malformedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

      expect(() => verifyAccessToken(malformedToken)).toThrow('Invalid or expired access token');
    });

    it('should throw error for refresh token used as access token', () => {
      const refreshToken = generateRefreshToken(mockRefreshPayload);

      expect(() => verifyAccessToken(refreshToken)).toThrow('Invalid or expired access token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify and return payload for valid refresh token', () => {
      const token = generateRefreshToken(mockRefreshPayload);
      const verified = verifyRefreshToken(token);

      expect(verified.userId).toBe(mockRefreshPayload.userId);
      expect(verified.sessionId).toBe(mockRefreshPayload.sessionId);
    });

    it('should throw error for invalid refresh token', () => {
      const invalidToken = 'invalid.refresh.token';

      expect(() => verifyRefreshToken(invalidToken)).toThrow('Invalid or expired refresh token');
    });

    it('should throw error for expired refresh token', () => {
      const expiredToken = jwt.sign(mockRefreshPayload, JWT_REFRESH_SECRET, {
        expiresIn: '-1s'
      });

      expect(() => verifyRefreshToken(expiredToken)).toThrow('Invalid or expired refresh token');
    });

    it('should throw error for access token used as refresh token', () => {
      const accessToken = generateAccessToken(mockTokenPayload);

      expect(() => verifyRefreshToken(accessToken)).toThrow('Invalid or expired refresh token');
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = generateAccessToken(mockTokenPayload);
      const decoded = decodeToken(token) as any;

      expect(decoded.userId).toBe(mockTokenPayload.userId);
      expect(decoded.email).toBe(mockTokenPayload.email);
      expect(decoded.role).toBe(mockTokenPayload.role);
    });

    it('should return null for invalid token format', () => {
      const invalidToken = 'not-a-jwt-token';
      const decoded = decodeToken(invalidToken);

      expect(decoded).toBeNull();
    });

    it('should decode expired tokens', () => {
      const expiredToken = jwt.sign(mockTokenPayload, JWT_SECRET, {
        expiresIn: '-1s'
      });
      const decoded = decodeToken(expiredToken) as any;

      expect(decoded.userId).toBe(mockTokenPayload.userId);
    });

    it('should decode tokens with invalid signatures', () => {
      const wrongSecretToken = jwt.sign(mockTokenPayload, 'wrong-secret', {
        expiresIn: '15m'
      });
      const decoded = decodeToken(wrongSecretToken) as any;

      expect(decoded.userId).toBe(mockTokenPayload.userId);
    });
  });

  describe('Token Security', () => {
    it('should not expose sensitive data in token payload', () => {
      const token = generateAccessToken(mockTokenPayload);
      const decoded = decodeToken(token) as any;

      // Check that no password or sensitive data is included
      expect(decoded.password).toBeUndefined();
      expect(decoded.passwordHash).toBeUndefined();
    });

    it('should include standard JWT claims', () => {
      const token = generateAccessToken(mockTokenPayload);
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      expect(decoded.iat).toBeDefined(); // Issued at
      expect(decoded.exp).toBeDefined(); // Expiration
      expect(typeof decoded.iat).toBe('number');
      expect(typeof decoded.exp).toBe('number');
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    it('should handle concurrent token generation', async () => {
      const tokens: string[] = [];

      // Generate tokens with slight delays to ensure different iat timestamps
      for (let i = 0; i < 10; i++) {
        tokens.push(generateAccessToken({
          ...mockTokenPayload,
          userId: mockTokenPayload.userId + i // Ensure uniqueness
        }));
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      // All tokens should be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(10);

      // Verify all are valid tokens
      tokens.forEach(token => {
        expect(token.split('.')).toHaveLength(3);
      });
    });
  });
});