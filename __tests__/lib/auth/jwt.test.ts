import { SESSION_CONFIG } from '@/lib/auth/jwt';
import jwt from 'jsonwebtoken';

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

describe('JWT Session Configuration', () => {
  describe('SESSION_CONFIG', () => {
    it('should have correct timeout values', () => {
      expect(SESSION_CONFIG.ACCESS_TOKEN_EXPIRY).toBe('60m');
      expect(SESSION_CONFIG.REFRESH_TOKEN_EXPIRY).toBe('7d');
      expect(SESSION_CONFIG.SESSION_TIMEOUT_MS).toBe(60 * 60 * 1000); // 60 minutes in ms
      expect(SESSION_CONFIG.WARNING_THRESHOLD_MS).toBe(5 * 60 * 1000); // 5 minutes in ms
      expect(SESSION_CONFIG.AUTO_EXTEND_THRESHOLD_MS).toBe(10 * 60 * 1000); // 10 minutes in ms
      expect(SESSION_CONFIG.INACTIVITY_THRESHOLD_MS).toBe(30 * 60 * 1000); // 30 minutes in ms
    });

    it('should have consistent cookie configuration', () => {
      expect(SESSION_CONFIG.COOKIE_MAX_AGE).toBe(60 * 60 * 1000); // Should match SESSION_TIMEOUT_MS
      expect(SESSION_CONFIG.COOKIE_MAX_AGE).toBe(SESSION_CONFIG.SESSION_TIMEOUT_MS);
    });

    it('should have proper threshold relationships', () => {
      // Warning should be less than auto-extend
      expect(SESSION_CONFIG.WARNING_THRESHOLD_MS).toBeLessThan(SESSION_CONFIG.AUTO_EXTEND_THRESHOLD_MS);

      // Auto-extend should be less than inactivity
      expect(SESSION_CONFIG.AUTO_EXTEND_THRESHOLD_MS).toBeLessThan(SESSION_CONFIG.INACTIVITY_THRESHOLD_MS);

      // Inactivity should be less than total timeout
      expect(SESSION_CONFIG.INACTIVITY_THRESHOLD_MS).toBeLessThan(SESSION_CONFIG.SESSION_TIMEOUT_MS);
    });
  });

  describe('Token Generation with Expiry', () => {
    const mockPayload = {
      userId: 'admin-123',
      email: 'admin@test.com',
      role: 'admin'
    };

    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-03T10:00:00Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should generate access token with 60-minute expiry', () => {
      const token = jwt.sign(mockPayload, process.env.JWT_SECRET!, {
        expiresIn: SESSION_CONFIG.ACCESS_TOKEN_EXPIRY
      });

      const decoded = jwt.decode(token) as jwt.JwtPayload;

      expect(decoded).toBeDefined();
      expect(decoded.exp).toBeDefined();

      // Check expiry is 60 minutes from now
      const now = Math.floor(Date.now() / 1000);
      const expectedExpiry = now + (60 * 60); // 60 minutes in seconds

      expect(decoded.exp).toBe(expectedExpiry);
    });

    it('should generate refresh token with 7-day expiry', () => {
      const token = jwt.sign(mockPayload, process.env.JWT_REFRESH_SECRET!, {
        expiresIn: SESSION_CONFIG.REFRESH_TOKEN_EXPIRY
      });

      const decoded = jwt.decode(token) as jwt.JwtPayload;

      expect(decoded).toBeDefined();
      expect(decoded.exp).toBeDefined();

      // Check expiry is 7 days from now
      const now = Math.floor(Date.now() / 1000);
      const expectedExpiry = now + (7 * 24 * 60 * 60); // 7 days in seconds

      expect(decoded.exp).toBe(expectedExpiry);
    });

    it('should verify token is valid within 60 minutes', () => {
      const token = jwt.sign(mockPayload, process.env.JWT_SECRET!, {
        expiresIn: SESSION_CONFIG.ACCESS_TOKEN_EXPIRY
      });

      // Advance time by 30 minutes (should still be valid)
      jest.advanceTimersByTime(30 * 60 * 1000);

      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET!);
      }).not.toThrow();

      // Advance time by another 29 minutes (59 total, should still be valid)
      jest.advanceTimersByTime(29 * 60 * 1000);

      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET!);
      }).not.toThrow();
    });

    it('should reject token after 60 minutes', () => {
      const token = jwt.sign(mockPayload, process.env.JWT_SECRET!, {
        expiresIn: SESSION_CONFIG.ACCESS_TOKEN_EXPIRY
      });

      // Advance time by 61 minutes (should be expired)
      jest.advanceTimersByTime(61 * 60 * 1000);

      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET!);
      }).toThrow(jwt.TokenExpiredError);
    });

    it('should calculate correct remaining time from token', () => {
      const token = jwt.sign(mockPayload, process.env.JWT_SECRET!, {
        expiresIn: SESSION_CONFIG.ACCESS_TOKEN_EXPIRY
      });

      const decoded = jwt.decode(token) as jwt.JwtPayload;
      const now = Math.floor(Date.now() / 1000);
      const remainingSeconds = decoded.exp! - now;

      expect(remainingSeconds).toBe(60 * 60); // Should be exactly 60 minutes

      // Advance time by 10 minutes
      jest.advanceTimersByTime(10 * 60 * 1000);

      const nowAfter = Math.floor(Date.now() / 1000);
      const remainingAfter = decoded.exp! - nowAfter;

      expect(remainingAfter).toBe(50 * 60); // Should be 50 minutes remaining
    });
  });

  describe('Time Calculation Helpers', () => {
    it('should correctly identify when to show warning', () => {
      const timeRemaining = 4 * 60 * 1000; // 4 minutes
      const shouldWarn = timeRemaining <= SESSION_CONFIG.WARNING_THRESHOLD_MS;
      expect(shouldWarn).toBe(true);
    });

    it('should correctly identify when to auto-extend', () => {
      const timeRemaining = 9 * 60 * 1000; // 9 minutes
      const shouldExtend = timeRemaining <= SESSION_CONFIG.AUTO_EXTEND_THRESHOLD_MS;
      expect(shouldExtend).toBe(true);
    });

    it('should correctly identify inactivity', () => {
      const lastActivity = Date.now() - (31 * 60 * 1000); // 31 minutes ago
      const isInactive = (Date.now() - lastActivity) >= SESSION_CONFIG.INACTIVITY_THRESHOLD_MS;
      expect(isInactive).toBe(true);
    });
  });
});