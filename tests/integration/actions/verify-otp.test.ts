/**
 * Integration tests for verify-otp Server Action
 * Tests OTP verification, attempt tracking, and status updates
 */

import { verifyOtpAction } from '@/app/actions/verify-otp';
import * as db from '@/lib/db';
import * as otp from '@/lib/otp';
import * as cache from '@/lib/cache';

// Mock database
jest.mock('@/lib/db', () => ({
  db: {
    select: jest.fn(),
    update: jest.fn()
  }
}));

// Mock OTP utilities
jest.mock('@/lib/otp', () => ({
  verifyOTP: jest.fn(),
  isOTPExpired: jest.fn()
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

describe('Verify OTP Action Integration', () => {
  const mockSubscriber = {
    id: 'sub-123',
    name: 'John',
    surname: 'Doe',
    email: 'john@example.com',
    mobile: '+27821234567',
    ageVerified: true,
    status: 'pending',
    mobileVerified: false,
    otpCode: 'hashed-otp',
    otpExpiresAt: new Date(Date.now() + 600000), // 10 minutes future
    otpAttempts: 0,
    otpLastSentAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    verifiedAt: null
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup environment
    process.env.OTP_MAX_ATTEMPTS = '3';

    // Setup default mocks
    (cache.deletePattern as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Successful verification', () => {
    test('should verify valid OTP and set mobileVerified to true', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockSubscriber])
          })
        })
      });

      const mockUpdate = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              id: 'sub-123',
              name: 'John',
              email: 'john@example.com'
            }])
          })
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (db.db.update as jest.Mock).mockImplementation(mockUpdate);
      (otp.verifyOTP as jest.Mock).mockReturnValue(true);
      (otp.isOTPExpired as jest.Mock).mockReturnValue(false);

      const result = await verifyOtpAction('sub-123', '123456');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.subscriber).toEqual({
          id: 'sub-123',
          name: 'John',
          email: 'john@example.com'
        });
      }

      // Verify update was called with correct data
      const updateCall = mockUpdate.mock.calls[0];
      expect(updateCall).toBeDefined();

      const setCall = mockUpdate().set.mock.calls[0];
      expect(setCall[0]).toMatchObject({
        mobileVerified: true,
        status: 'active',
        otpCode: null,
        otpExpiresAt: null,
        otpAttempts: 0
      });
      expect(setCall[0].verifiedAt).toBeInstanceOf(Date);
    });

    test('should set status to active after verification', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockSubscriber])
          })
        })
      });

      let updateData: any;
      const mockUpdate = jest.fn().mockReturnValue({
        set: jest.fn((data: any) => {
          updateData = data;
          return {
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([{
                id: 'sub-123',
                name: 'John',
                email: 'john@example.com'
              }])
            })
          };
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (db.db.update as jest.Mock).mockImplementation(mockUpdate);
      (otp.verifyOTP as jest.Mock).mockReturnValue(true);
      (otp.isOTPExpired as jest.Mock).mockReturnValue(false);

      await verifyOtpAction('sub-123', '123456');

      expect(updateData.status).toBe('active');
      expect(updateData.mobileVerified).toBe(true);
    });

    test('should clear OTP data after successful verification', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockSubscriber])
          })
        })
      });

      let updateData: any;
      const mockUpdate = jest.fn().mockReturnValue({
        set: jest.fn((data: any) => {
          updateData = data;
          return {
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([{
                id: 'sub-123',
                name: 'John',
                email: 'john@example.com'
              }])
            })
          };
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (db.db.update as jest.Mock).mockImplementation(mockUpdate);
      (otp.verifyOTP as jest.Mock).mockReturnValue(true);
      (otp.isOTPExpired as jest.Mock).mockReturnValue(false);

      await verifyOtpAction('sub-123', '123456');

      expect(updateData.otpCode).toBeNull();
      expect(updateData.otpExpiresAt).toBeNull();
      expect(updateData.otpAttempts).toBe(0);
    });

    test('should invalidate cache on success', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockSubscriber])
          })
        })
      });

      const mockUpdate = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              id: 'sub-123',
              name: 'John',
              email: 'john@example.com'
            }])
          })
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (db.db.update as jest.Mock).mockImplementation(mockUpdate);
      (otp.verifyOTP as jest.Mock).mockReturnValue(true);
      (otp.isOTPExpired as jest.Mock).mockReturnValue(false);

      await verifyOtpAction('sub-123', '123456');

      expect(cache.deletePattern).toHaveBeenCalledWith('registrations:*');
      expect(cache.deletePattern).toHaveBeenCalledWith('stats:*');
      expect(cache.deletePattern).toHaveBeenCalledWith('dashboard:*');
    });
  });

  describe('Invalid OTP handling', () => {
    test('should increment attempts for invalid OTP', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockSubscriber])
          })
        })
      });

      let updateData: any;
      const mockUpdate = jest.fn().mockReturnValue({
        set: jest.fn((data: any) => {
          updateData = data;
          return {
            where: jest.fn().mockResolvedValue(undefined)
          };
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (db.db.update as jest.Mock).mockImplementation(mockUpdate);
      (otp.verifyOTP as jest.Mock).mockReturnValue(false);
      (otp.isOTPExpired as jest.Mock).mockReturnValue(false);

      const result = await verifyOtpAction('sub-123', 'wrong-code');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid verification code');
        expect(result.attemptsRemaining).toBe(2);
      }

      expect(updateData.otpAttempts).toBe(1);
    });

    test('should lock after max attempts', async () => {
      const subscriberWithAttempts = {
        ...mockSubscriber,
        otpAttempts: 2 // One attempt away from max
      };

      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([subscriberWithAttempts])
          })
        })
      });

      let updateData: any;
      const mockUpdate = jest.fn().mockReturnValue({
        set: jest.fn((data: any) => {
          updateData = data;
          return {
            where: jest.fn().mockResolvedValue(undefined)
          };
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (db.db.update as jest.Mock).mockImplementation(mockUpdate);
      (otp.verifyOTP as jest.Mock).mockReturnValue(false);
      (otp.isOTPExpired as jest.Mock).mockReturnValue(false);

      const result = await verifyOtpAction('sub-123', 'wrong-code');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Too many failed attempts');
        expect(result.attemptsRemaining).toBe(0);
      }

      expect(updateData.otpAttempts).toBe(3);
    });

    test('should prevent verification when already at max attempts', async () => {
      const lockedSubscriber = {
        ...mockSubscriber,
        otpAttempts: 3 // Already at max
      };

      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([lockedSubscriber])
          })
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);

      const result = await verifyOtpAction('sub-123', '123456');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Too many failed attempts');
        expect(result.attemptsRemaining).toBe(0);
      }

      // Should not try to verify or update
      expect(otp.verifyOTP).not.toHaveBeenCalled();
      expect(db.db.update).not.toHaveBeenCalled();
    });
  });

  describe('Expired OTP handling', () => {
    test('should reject expired OTP', async () => {
      const expiredSubscriber = {
        ...mockSubscriber,
        otpExpiresAt: new Date(Date.now() - 60000) // 1 minute ago
      };

      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([expiredSubscriber])
          })
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (otp.isOTPExpired as jest.Mock).mockReturnValue(true);

      const result = await verifyOtpAction('sub-123', '123456');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('expired');
      }

      // Should not try to verify
      expect(otp.verifyOTP).not.toHaveBeenCalled();
      expect(db.db.update).not.toHaveBeenCalled();
    });

    test('should handle missing expiration date', async () => {
      const noExpirySubscriber = {
        ...mockSubscriber,
        otpExpiresAt: null
      };

      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([noExpirySubscriber])
          })
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);

      const result = await verifyOtpAction('sub-123', '123456');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('expired');
      }
    });
  });

  describe('Session validation', () => {
    test('should reject invalid session ID', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]) // No subscriber found
          })
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);

      const result = await verifyOtpAction('invalid-id', '123456');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid verification session');
      }
    });

    test('should reject already verified subscriber', async () => {
      const verifiedSubscriber = {
        ...mockSubscriber,
        mobileVerified: true,
        status: 'active'
      };

      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([verifiedSubscriber])
          })
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);

      const result = await verifyOtpAction('sub-123', '123456');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('already verified');
      }

      // Should not try to verify again
      expect(otp.verifyOTP).not.toHaveBeenCalled();
      expect(db.db.update).not.toHaveBeenCalled();
    });
  });

  describe('Input validation', () => {
    test('should validate subscriber ID format', async () => {
      const result = await verifyOtpAction('', '123456');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    test('should validate OTP code format', async () => {
      const result = await verifyOtpAction('sub-123', '12345'); // Too short

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('6 digits');
      }
    });

    test('should reject non-numeric OTP', async () => {
      const result = await verifyOtpAction('sub-123', 'abcdef');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('digits');
      }
    });

    test('should handle missing OTP code in database', async () => {
      const noOtpSubscriber = {
        ...mockSubscriber,
        otpCode: null
      };

      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([noOtpSubscriber])
          })
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (otp.isOTPExpired as jest.Mock).mockReturnValue(false);

      const result = await verifyOtpAction('sub-123', '123456');

      expect(result.success).toBe(false);
      // Even without stored OTP, it should increment attempts
      expect(db.db.update).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    test('should handle database errors gracefully', async () => {
      const mockSelect = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await verifyOtpAction('sub-123', '123456');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Verification failed');
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'OTP verification error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('should handle update failures', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockSubscriber])
          })
        })
      });

      const mockUpdate = jest.fn().mockImplementation(() => {
        throw new Error('Update failed');
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (db.db.update as jest.Mock).mockImplementation(mockUpdate);
      (otp.verifyOTP as jest.Mock).mockReturnValue(false);
      (otp.isOTPExpired as jest.Mock).mockReturnValue(false);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await verifyOtpAction('sub-123', 'wrong-code');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Verification failed');
      }

      consoleSpy.mockRestore();
    });

    test('should log successful verifications', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockSubscriber])
          })
        })
      });

      const mockUpdate = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              id: 'sub-123',
              name: 'John',
              email: 'john@example.com'
            }])
          })
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (db.db.update as jest.Mock).mockImplementation(mockUpdate);
      (otp.verifyOTP as jest.Mock).mockReturnValue(true);
      (otp.isOTPExpired as jest.Mock).mockReturnValue(false);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await verifyOtpAction('sub-123', '123456');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Mobile verified successfully')
      );

      consoleSpy.mockRestore();
    });
  });
});