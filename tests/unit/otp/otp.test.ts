/**
 * Unit tests for OTP utility functions
 * Tests OTP generation, hashing, verification, and expiration logic
 */

import {
  generateOTP,
  hashOTP,
  verifyOTP,
  isOTPExpired,
  getOTPExpiration,
  canResendOTP
} from '@/lib/otp';
import * as dbSecurity from '@/lib/db/security';

// Mock the security module
jest.mock('@/lib/db/security', () => ({
  encryptData: jest.fn(),
  decryptData: jest.fn()
}));

describe('OTP Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.OTP_EXPIRY_MINUTES;
    delete process.env.OTP_RESEND_COOLDOWN_SECONDS;
  });

  describe('generateOTP', () => {
    test('should generate a 6-digit numeric code', () => {
      const otp = generateOTP();

      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    test('should generate only numeric characters', () => {
      const otp = generateOTP();

      expect(/^\d+$/.test(otp)).toBe(true);
      expect(parseInt(otp)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(otp)).toBeLessThanOrEqual(999999);
    });

    test('should generate different codes on subsequent calls', () => {
      const codes = new Set();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        codes.add(generateOTP());
      }

      // While theoretically possible to get duplicates, it's highly unlikely
      // in 100 iterations with 900,000 possible values
      expect(codes.size).toBeGreaterThan(95);
    });
  });

  describe('hashOTP', () => {
    test('should return encrypted string', () => {
      const mockEncrypted = 'encrypted_otp_string';
      (dbSecurity.encryptData as jest.Mock).mockReturnValue(mockEncrypted);

      const result = hashOTP('123456');

      expect(dbSecurity.encryptData).toHaveBeenCalledWith('123456');
      expect(result).toBe(mockEncrypted);
    });

    test('should produce different hash for same code due to salt', () => {
      // Simulate different salts in encryption
      (dbSecurity.encryptData as jest.Mock)
        .mockReturnValueOnce('encrypted_1')
        .mockReturnValueOnce('encrypted_2');

      const hash1 = hashOTP('123456');
      const hash2 = hashOTP('123456');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyOTP', () => {
    test('should return true for valid code', () => {
      const code = '123456';
      const hashedCode = 'hashed_value';

      (dbSecurity.decryptData as jest.Mock).mockReturnValue(code);

      const result = verifyOTP(code, hashedCode);

      expect(dbSecurity.decryptData).toHaveBeenCalledWith(hashedCode);
      expect(result).toBe(true);
    });

    test('should return false for invalid code', () => {
      const hashedCode = 'hashed_value';

      (dbSecurity.decryptData as jest.Mock).mockReturnValue('654321');

      const result = verifyOTP('123456', hashedCode);

      expect(result).toBe(false);
    });

    test('should return false for wrong code', () => {
      const hashedCode = 'hashed_value';

      (dbSecurity.decryptData as jest.Mock).mockReturnValue('123456');

      const result = verifyOTP('999999', hashedCode);

      expect(result).toBe(false);
    });

    test('should handle decryption errors gracefully', () => {
      const hashedCode = 'hashed_value';

      (dbSecurity.decryptData as jest.Mock).mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = verifyOTP('123456', hashedCode);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'OTP verification error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('isOTPExpired', () => {
    test('should return false for future date', () => {
      const futureDate = new Date(Date.now() + 60000); // 1 minute in future

      const result = isOTPExpired(futureDate);

      expect(result).toBe(false);
    });

    test('should return true for past date', () => {
      const pastDate = new Date(Date.now() - 60000); // 1 minute ago

      const result = isOTPExpired(pastDate);

      expect(result).toBe(true);
    });

    test('should handle current time edge case', () => {
      const now = new Date();

      // Mock Date.now to return exact same time
      const originalNow = Date.now;
      jest.spyOn(Date, 'now').mockImplementation(() => now.getTime());

      const result = isOTPExpired(now);

      expect(result).toBe(false); // Exact match should not be expired

      Date.now = originalNow;
    });

    test('should handle millisecond precision', () => {
      const now = Date.now();
      const justExpired = new Date(now - 1); // 1ms ago
      const notExpired = new Date(now + 1); // 1ms future

      expect(isOTPExpired(justExpired)).toBe(true);
      expect(isOTPExpired(notExpired)).toBe(false);
    });
  });

  describe('getOTPExpiration', () => {
    test('should return date 10 minutes in future by default', () => {
      const now = Date.now();
      const expiration = getOTPExpiration();

      const expectedTime = now + (10 * 60 * 1000);
      const actualTime = expiration.getTime();

      // Allow small time difference due to execution time
      expect(Math.abs(actualTime - expectedTime)).toBeLessThan(100);
    });

    test('should use OTP_EXPIRY_MINUTES env var when set', () => {
      process.env.OTP_EXPIRY_MINUTES = '5';

      const now = Date.now();
      const expiration = getOTPExpiration();

      const expectedTime = now + (5 * 60 * 1000);
      const actualTime = expiration.getTime();

      expect(Math.abs(actualTime - expectedTime)).toBeLessThan(100);
    });

    test('should handle non-numeric env var gracefully', () => {
      process.env.OTP_EXPIRY_MINUTES = 'invalid';

      const expiration = getOTPExpiration();

      // Should default to NaN minutes, resulting in invalid date
      expect(expiration.getTime()).toBeNaN();
    });

    test('should handle zero expiry time', () => {
      process.env.OTP_EXPIRY_MINUTES = '0';

      const now = Date.now();
      const expiration = getOTPExpiration();

      // Should be approximately current time
      expect(Math.abs(expiration.getTime() - now)).toBeLessThan(100);
    });
  });

  describe('canResendOTP', () => {
    test('should allow resend when lastSentAt is null', () => {
      const result = canResendOTP(null);

      expect(result.canSend).toBe(true);
      expect(result.remainingSeconds).toBeUndefined();
    });

    test('should allow resend when cooldown period has passed', () => {
      process.env.OTP_RESEND_COOLDOWN_SECONDS = '60';

      const twoMinutesAgo = new Date(Date.now() - 120000);
      const result = canResendOTP(twoMinutesAgo);

      expect(result.canSend).toBe(true);
      expect(result.remainingSeconds).toBeUndefined();
    });

    test('should prevent resend during cooldown period', () => {
      process.env.OTP_RESEND_COOLDOWN_SECONDS = '60';

      const thirtySecondsAgo = new Date(Date.now() - 30000);
      const result = canResendOTP(thirtySecondsAgo);

      expect(result.canSend).toBe(false);
      expect(result.remainingSeconds).toBeDefined();
      expect(result.remainingSeconds).toBeGreaterThan(29);
      expect(result.remainingSeconds).toBeLessThanOrEqual(30);
    });

    test('should calculate remaining seconds correctly', () => {
      process.env.OTP_RESEND_COOLDOWN_SECONDS = '120';

      const oneMinuteAgo = new Date(Date.now() - 60000);
      const result = canResendOTP(oneMinuteAgo);

      expect(result.canSend).toBe(false);
      expect(result.remainingSeconds).toBe(60);
    });

    test('should use default 60 seconds when env var not set', () => {
      delete process.env.OTP_RESEND_COOLDOWN_SECONDS;

      const thirtySecondsAgo = new Date(Date.now() - 30000);
      const result = canResendOTP(thirtySecondsAgo);

      expect(result.canSend).toBe(false);
      expect(result.remainingSeconds).toBe(30);
    });

    test('should handle edge case at exact cooldown boundary', () => {
      process.env.OTP_RESEND_COOLDOWN_SECONDS = '60';

      const exactlyOneMinuteAgo = new Date(Date.now() - 60000);
      const result = canResendOTP(exactlyOneMinuteAgo);

      expect(result.canSend).toBe(true);
      expect(result.remainingSeconds).toBeUndefined();
    });

    test('should round up remaining seconds', () => {
      process.env.OTP_RESEND_COOLDOWN_SECONDS = '60';

      // 29.5 seconds ago
      const time = new Date(Date.now() - 29500);
      const result = canResendOTP(time);

      expect(result.canSend).toBe(false);
      expect(result.remainingSeconds).toBe(31); // Rounds up from 30.5
    });
  });
});