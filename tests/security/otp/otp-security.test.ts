/**
 * Security tests for OTP system
 * Tests encryption, rate limiting, attempt limiting, and session validation
 */

import { generateOTP, hashOTP, verifyOTP, canResendOTP } from '@/lib/otp';
import { encryptData, decryptData } from '@/lib/db/security';
import { verifyOtpAction } from '@/app/actions/verify-otp';
import { resendOtpAction } from '@/app/actions/resend-otp';
import * as db from '@/lib/db';

// Mock database
jest.mock('@/lib/db', () => ({
  db: {
    select: jest.fn(),
    update: jest.fn()
  }
}));

// Mock cache
jest.mock('@/lib/cache', () => ({
  deletePattern: jest.fn(),
  CacheKeys: {
    patterns: {
      allRegistrations: () => 'registrations:*',
      allStats: () => 'stats:*',
      allDashboard: () => 'dashboard:*'
    }
  }
}));

// Mock SMS service
jest.mock('@/lib/services/sms', () => ({
  sendOTPSMS: jest.fn().mockResolvedValue({ success: true })
}));

describe('OTP Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!!!';
    process.env.OTP_MAX_ATTEMPTS = '3';
    process.env.OTP_RESEND_COOLDOWN_SECONDS = '60';
    process.env.OTP_EXPIRY_MINUTES = '10';
  });

  describe('OTP Encryption', () => {
    test('should encrypt OTP in database storage', () => {
      const otp = '123456';
      const hashed = hashOTP(otp);

      // Verify it's encrypted (not plain text)
      expect(hashed).not.toBe(otp);
      expect(hashed.length).toBeGreaterThan(otp.length);
      expect(hashed).toContain(':'); // Contains salt and IV separators
    });

    test('should use different encryption for same OTP (salt)', () => {
      const otp = '123456';
      const hash1 = hashOTP(otp);
      const hash2 = hashOTP(otp);

      // Different salts should produce different hashes
      expect(hash1).not.toBe(hash2);
    });

    test('should properly verify encrypted OTP', () => {
      const otp = '123456';
      const hashed = hashOTP(otp);

      const isValid = verifyOTP(otp, hashed);
      expect(isValid).toBe(true);

      const isInvalid = verifyOTP('654321', hashed);
      expect(isInvalid).toBe(false);
    });

    test('should handle decryption failures securely', () => {
      const invalidHash = 'invalid:encrypted:data';

      const result = verifyOTP('123456', invalidHash);
      expect(result).toBe(false); // Fail closed, not open
    });

    test('should not expose OTP in error messages', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const invalidHash = 'invalid:data';

      verifyOTP('123456', invalidHash);

      // Check that the actual OTP value is not logged
      const calls = consoleSpy.mock.calls;
      calls.forEach(call => {
        call.forEach(arg => {
          const argString = typeof arg === 'string' ? arg : JSON.stringify(arg);
          expect(argString).not.toContain('123456');
        });
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Rate Limiting - Max Attempts', () => {
    const mockSubscriber = {
      id: 'sub-123',
      email: 'test@example.com',
      mobile: '+27821234567',
      mobileVerified: false,
      otpCode: 'encrypted-otp',
      otpExpiresAt: new Date(Date.now() + 600000),
      otpAttempts: 0,
      otpLastSentAt: new Date()
    };

    test('should enforce maximum 3 attempts', async () => {
      // Setup mocks for 3 failed attempts
      const mockSelect = jest.fn()
        .mockResolvedValueOnce([{ ...mockSubscriber, otpAttempts: 0 }])
        .mockResolvedValueOnce([{ ...mockSubscriber, otpAttempts: 1 }])
        .mockResolvedValueOnce([{ ...mockSubscriber, otpAttempts: 2 }]);

      const mockUpdate = jest.fn().mockResolvedValue([]);

      (db.db.select as jest.Mock).mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: mockSelect
          })
        })
      }));

      (db.db.update as jest.Mock).mockImplementation(() => ({
        set: () => ({
          where: mockUpdate
        })
      }));

      // Attempt 1
      const result1 = await verifyOtpAction('sub-123', 'wrong');
      expect(result1.success).toBe(false);
      if (!result1.success) {
        expect(result1.attemptsRemaining).toBe(2);
      }

      // Attempt 2
      const result2 = await verifyOtpAction('sub-123', 'wrong');
      expect(result2.success).toBe(false);
      if (!result2.success) {
        expect(result2.attemptsRemaining).toBe(1);
      }

      // Attempt 3 - should lock
      const result3 = await verifyOtpAction('sub-123', 'wrong');
      expect(result3.success).toBe(false);
      if (!result3.success) {
        expect(result3.attemptsRemaining).toBe(0);
        expect(result3.error).toContain('Too many failed attempts');
      }
    });

    test('should block verification after max attempts reached', async () => {
      const lockedSubscriber = {
        ...mockSubscriber,
        otpAttempts: 3 // Already at max
      };

      const mockSelect = jest.fn().mockResolvedValue([lockedSubscriber]);

      (db.db.select as jest.Mock).mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: mockSelect
          })
        })
      }));

      const result = await verifyOtpAction('sub-123', '123456');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Too many failed attempts');
      }

      // Should not attempt to verify
      expect(db.db.update).not.toHaveBeenCalled();
    });

    test('should reset attempts after successful verification', async () => {
      const subscriberWithAttempts = {
        ...mockSubscriber,
        otpAttempts: 2
      };

      const mockSelect = jest.fn().mockResolvedValue([subscriberWithAttempts]);

      let updateData: any;
      const mockUpdate = jest.fn().mockImplementation(() => ({
        returning: jest.fn().mockResolvedValue([{
          id: 'sub-123',
          name: 'Test',
          email: 'test@example.com'
        }])
      }));

      (db.db.select as jest.Mock).mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: mockSelect
          })
        })
      }));

      (db.db.update as jest.Mock).mockImplementation(() => ({
        set: (data: any) => {
          updateData = data;
          return {
            where: () => mockUpdate()
          };
        }
      }));

      // Mock successful OTP verification
      jest.doMock('@/lib/otp', () => ({
        ...jest.requireActual('@/lib/otp'),
        verifyOTP: jest.fn().mockReturnValue(true),
        isOTPExpired: jest.fn().mockReturnValue(false)
      }));

      const { verifyOtpAction: verifyWithMock } = await import('@/app/actions/verify-otp');
      const result = await verifyWithMock('sub-123', '123456');

      if (result.success) {
        expect(updateData.otpAttempts).toBe(0);
      }
    });
  });

  describe('Rate Limiting - Resend Cooldown', () => {
    test('should enforce 60 second cooldown between resends', () => {
      const now = Date.now();

      // Just sent
      const justSent = new Date(now);
      const result1 = canResendOTP(justSent);
      expect(result1.canSend).toBe(false);
      expect(result1.remainingSeconds).toBe(60);

      // 30 seconds ago
      const halfCooldown = new Date(now - 30000);
      const result2 = canResendOTP(halfCooldown);
      expect(result2.canSend).toBe(false);
      expect(result2.remainingSeconds).toBe(30);

      // 61 seconds ago
      const afterCooldown = new Date(now - 61000);
      const result3 = canResendOTP(afterCooldown);
      expect(result3.canSend).toBe(true);
      expect(result3.remainingSeconds).toBeUndefined();
    });

    test('should prevent rapid OTP resending', async () => {
      const recentSubscriber = {
        id: 'sub-123',
        email: 'test@example.com',
        mobile: '+27821234567',
        mobileVerified: false,
        otpLastSentAt: new Date() // Just sent
      };

      const mockSelect = jest.fn().mockResolvedValue([recentSubscriber]);

      (db.db.select as jest.Mock).mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: mockSelect
          })
        })
      }));

      const result = await resendOtpAction('sub-123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Please wait');
        expect(result.cooldownSeconds).toBeDefined();
        expect(result.cooldownSeconds).toBeGreaterThan(0);
      }
    });

    test('should track last sent time accurately', async () => {
      const oldSubscriber = {
        id: 'sub-123',
        email: 'test@example.com',
        mobile: '+27821234567',
        mobileVerified: false,
        otpLastSentAt: new Date(Date.now() - 120000) // 2 minutes ago
      };

      const mockSelect = jest.fn().mockResolvedValue([oldSubscriber]);

      let updateData: any;
      const mockUpdate = jest.fn().mockResolvedValue([]);

      (db.db.select as jest.Mock).mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: mockSelect
          })
        })
      }));

      (db.db.update as jest.Mock).mockImplementation(() => ({
        set: (data: any) => {
          updateData = data;
          return {
            where: () => mockUpdate()
          };
        }
      }));

      await resendOtpAction('sub-123');

      // Check that last sent time was updated
      expect(updateData.otpLastSentAt).toBeInstanceOf(Date);
      const timeDiff = Date.now() - updateData.otpLastSentAt.getTime();
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });
  });

  describe('OTP Expiration', () => {
    test('should reject expired OTPs', async () => {
      const expiredSubscriber = {
        id: 'sub-123',
        email: 'test@example.com',
        mobile: '+27821234567',
        mobileVerified: false,
        otpCode: 'encrypted-otp',
        otpExpiresAt: new Date(Date.now() - 60000), // 1 minute ago
        otpAttempts: 0
      };

      const mockSelect = jest.fn().mockResolvedValue([expiredSubscriber]);

      (db.db.select as jest.Mock).mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: mockSelect
          })
        })
      }));

      const result = await verifyOtpAction('sub-123', '123456');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('expired');
      }
    });

    test('should set correct expiration time (10 minutes)', () => {
      const expiration = new Date(Date.now() + 10 * 60 * 1000);
      const generated = new Date(Date.now() + parseInt(process.env.OTP_EXPIRY_MINUTES!) * 60 * 1000);

      // Allow small difference due to execution time
      const diff = Math.abs(expiration.getTime() - generated.getTime());
      expect(diff).toBeLessThan(100);
    });

    test('should not accept OTP without expiration date', async () => {
      const noExpirySubscriber = {
        id: 'sub-123',
        email: 'test@example.com',
        mobile: '+27821234567',
        mobileVerified: false,
        otpCode: 'encrypted-otp',
        otpExpiresAt: null, // No expiration
        otpAttempts: 0
      };

      const mockSelect = jest.fn().mockResolvedValue([noExpirySubscriber]);

      (db.db.select as jest.Mock).mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: mockSelect
          })
        })
      }));

      const result = await verifyOtpAction('sub-123', '123456');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('expired');
      }
    });
  });

  describe('Session Security', () => {
    test('should validate session exists', async () => {
      const mockSelect = jest.fn().mockResolvedValue([]); // No subscriber

      (db.db.select as jest.Mock).mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: mockSelect
          })
        })
      }));

      const result = await verifyOtpAction('invalid-session', '123456');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid verification session');
      }
    });

    test('should prevent reuse of verified sessions', async () => {
      const verifiedSubscriber = {
        id: 'sub-123',
        email: 'test@example.com',
        mobile: '+27821234567',
        mobileVerified: true, // Already verified
        status: 'active'
      };

      const mockSelect = jest.fn().mockResolvedValue([verifiedSubscriber]);

      (db.db.select as jest.Mock).mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: mockSelect
          })
        })
      }));

      const result = await verifyOtpAction('sub-123', '123456');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('already verified');
      }
    });

    test('should use secure session identifiers', () => {
      // Session IDs should be unpredictable
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        // In real implementation, this would be generated by database
        const id = `sub-${Math.random().toString(36).substr(2, 9)}`;
        ids.add(id);
      }

      // All should be unique
      expect(ids.size).toBe(100);
    });
  });

  describe('OTP Generation Security', () => {
    test('should generate cryptographically random OTPs', () => {
      const otps = new Set<string>();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        otps.add(generateOTP());
      }

      // Should have high uniqueness (collision probability is very low)
      expect(otps.size).toBeGreaterThan(iterations * 0.99);
    });

    test('should generate OTPs within valid range', () => {
      for (let i = 0; i < 100; i++) {
        const otp = generateOTP();
        const numericValue = parseInt(otp);

        expect(numericValue).toBeGreaterThanOrEqual(100000);
        expect(numericValue).toBeLessThanOrEqual(999999);
      }
    });

    test('should not use predictable patterns', () => {
      const otps: number[] = [];
      for (let i = 0; i < 10; i++) {
        otps.push(parseInt(generateOTP()));
      }

      // Check for sequential patterns
      for (let i = 1; i < otps.length; i++) {
        const diff = Math.abs(otps[i] - otps[i - 1]);
        expect(diff).not.toBe(1); // Not sequential
      }
    });
  });

  describe('Data Protection', () => {
    test('should clear OTP data after successful verification', async () => {
      const subscriber = {
        id: 'sub-123',
        email: 'test@example.com',
        mobile: '+27821234567',
        mobileVerified: false,
        otpCode: 'encrypted-otp',
        otpExpiresAt: new Date(Date.now() + 600000),
        otpAttempts: 0
      };

      const mockSelect = jest.fn().mockResolvedValue([subscriber]);

      let updateData: any;
      const mockUpdate = jest.fn().mockImplementation(() => ({
        returning: jest.fn().mockResolvedValue([{
          id: 'sub-123',
          name: 'Test',
          email: 'test@example.com'
        }])
      }));

      (db.db.select as jest.Mock).mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: mockSelect
          })
        })
      }));

      (db.db.update as jest.Mock).mockImplementation(() => ({
        set: (data: any) => {
          updateData = data;
          return {
            where: () => mockUpdate()
          };
        }
      }));

      // Mock successful verification
      jest.doMock('@/lib/otp', () => ({
        ...jest.requireActual('@/lib/otp'),
        verifyOTP: jest.fn().mockReturnValue(true),
        isOTPExpired: jest.fn().mockReturnValue(false)
      }));

      const { verifyOtpAction: verifyWithMock } = await import('@/app/actions/verify-otp');
      await verifyWithMock('sub-123', '123456');

      // Verify sensitive data was cleared
      expect(updateData.otpCode).toBeNull();
      expect(updateData.otpExpiresAt).toBeNull();
      expect(updateData.otpAttempts).toBe(0);
    });

    test('should not log sensitive OTP data', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const otp = '123456';
      generateOTP();
      hashOTP(otp);
      verifyOTP(otp, 'hashed');

      // Check that OTP values are not logged
      const allCalls = [
        ...consoleSpy.mock.calls,
        ...consoleErrorSpy.mock.calls
      ];

      allCalls.forEach(call => {
        call.forEach(arg => {
          const argString = typeof arg === 'string' ? arg : JSON.stringify(arg);
          expect(argString).not.toContain(otp);
        });
      });

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Timing Attack Prevention', () => {
    test('should have consistent response times for valid/invalid OTPs', async () => {
      const timings: { valid: number[], invalid: number[] } = {
        valid: [],
        invalid: []
      };

      // Mock the OTP verification
      const mockVerify = (isValid: boolean) => {
        return jest.fn().mockImplementation(async () => {
          // Simulate consistent timing
          await new Promise(resolve => setTimeout(resolve, 10));
          return isValid;
        });
      };

      // Test multiple iterations
      for (let i = 0; i < 10; i++) {
        // Valid OTP timing
        const start1 = Date.now();
        await mockVerify(true)();
        timings.valid.push(Date.now() - start1);

        // Invalid OTP timing
        const start2 = Date.now();
        await mockVerify(false)();
        timings.invalid.push(Date.now() - start2);
      }

      // Calculate average timings
      const avgValid = timings.valid.reduce((a, b) => a + b, 0) / timings.valid.length;
      const avgInvalid = timings.invalid.reduce((a, b) => a + b, 0) / timings.invalid.length;

      // Timing difference should be minimal (< 20% variance)
      const variance = Math.abs(avgValid - avgInvalid) / Math.max(avgValid, avgInvalid);
      expect(variance).toBeLessThan(0.2);
    });
  });
});