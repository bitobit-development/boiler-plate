/**
 * Integration tests for resend-otp Server Action
 * Tests OTP regeneration, cooldown periods, and SMS resending
 */

import { resendOtpAction } from '@/app/actions/resend-otp';
import * as db from '@/lib/db';
import * as otp from '@/lib/otp';
import * as sms from '@/lib/services/sms';

// Mock database
jest.mock('@/lib/db', () => ({
  db: {
    select: jest.fn(),
    update: jest.fn()
  }
}));

// Mock OTP utilities
jest.mock('@/lib/otp', () => ({
  generateOTP: jest.fn(),
  hashOTP: jest.fn(),
  getOTPExpiration: jest.fn(),
  canResendOTP: jest.fn()
}));

// Mock SMS service
jest.mock('@/lib/services/sms', () => ({
  sendOTPSMS: jest.fn()
}));

describe('Resend OTP Action Integration', () => {
  const mockSubscriber = {
    id: 'sub-123',
    name: 'John',
    surname: 'Doe',
    email: 'john@example.com',
    mobile: '+27821234567',
    ageVerified: true,
    status: 'pending',
    mobileVerified: false,
    otpCode: 'old-hashed-otp',
    otpExpiresAt: new Date(Date.now() + 300000), // 5 minutes future
    otpAttempts: 2, // Had 2 failed attempts
    otpLastSentAt: new Date(Date.now() - 120000), // Sent 2 minutes ago
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup environment
    process.env.OTP_RESEND_COOLDOWN_SECONDS = '60';

    // Setup default mocks
    (otp.generateOTP as jest.Mock).mockReturnValue('654321');
    (otp.hashOTP as jest.Mock).mockReturnValue('new-hashed-otp');
    (otp.getOTPExpiration as jest.Mock).mockReturnValue(
      new Date(Date.now() + 600000)
    );
    (sms.sendOTPSMS as jest.Mock).mockResolvedValue({
      success: true,
      messageId: 'msg-resend-123',
      channel: 'sms'
    });
  });

  describe('Successful resend', () => {
    test('should generate new OTP code', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockSubscriber])
          })
        })
      });

      const mockUpdate = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (db.db.update as jest.Mock).mockImplementation(mockUpdate);
      (otp.canResendOTP as jest.Mock).mockReturnValue({ canSend: true });

      const result = await resendOtpAction('sub-123');

      expect(result.success).toBe(true);
      expect(otp.generateOTP).toHaveBeenCalled();
      expect(otp.hashOTP).toHaveBeenCalledWith('654321');
    });

    test('should send new SMS successfully', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockSubscriber])
          })
        })
      });

      const mockUpdate = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (db.db.update as jest.Mock).mockImplementation(mockUpdate);
      (otp.canResendOTP as jest.Mock).mockReturnValue({ canSend: true });

      const result = await resendOtpAction('sub-123');

      expect(sms.sendOTPSMS).toHaveBeenCalledWith('+27821234567', '654321');
      expect(result.success).toBe(true);
    });

    test('should update database with new OTP', async () => {
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
      (otp.canResendOTP as jest.Mock).mockReturnValue({ canSend: true });

      await resendOtpAction('sub-123');

      expect(updateData).toMatchObject({
        otpCode: 'new-hashed-otp',
        otpAttempts: 0 // Reset attempts
      });
      expect(updateData.otpExpiresAt).toBeInstanceOf(Date);
      expect(updateData.otpLastSentAt).toBeInstanceOf(Date);
      expect(updateData.updatedAt).toBeInstanceOf(Date);
    });

    test('should reset attempt counter', async () => {
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
      (otp.canResendOTP as jest.Mock).mockReturnValue({ canSend: true });

      await resendOtpAction('sub-123');

      expect(updateData.otpAttempts).toBe(0);
    });

    test('should log successful resend', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockSubscriber])
          })
        })
      });

      const mockUpdate = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (db.db.update as jest.Mock).mockImplementation(mockUpdate);
      (otp.canResendOTP as jest.Mock).mockReturnValue({ canSend: true });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await resendOtpAction('sub-123');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Generated new OTP')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('OTP resent successfully')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('attempts reset')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Cooldown enforcement', () => {
    test('should enforce cooldown period', async () => {
      const recentSubscriber = {
        ...mockSubscriber,
        otpLastSentAt: new Date(Date.now() - 30000) // 30 seconds ago
      };

      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([recentSubscriber])
          })
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (otp.canResendOTP as jest.Mock).mockReturnValue({
        canSend: false,
        remainingSeconds: 30
      });

      const result = await resendOtpAction('sub-123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Please wait');
        expect(result.cooldownSeconds).toBe(30);
      }

      // Should not generate new OTP or send SMS
      expect(otp.generateOTP).not.toHaveBeenCalled();
      expect(sms.sendOTPSMS).not.toHaveBeenCalled();
      expect(db.db.update).not.toHaveBeenCalled();
    });

    test('should allow resend after cooldown expires', async () => {
      const oldSentSubscriber = {
        ...mockSubscriber,
        otpLastSentAt: new Date(Date.now() - 70000) // 70 seconds ago
      };

      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([oldSentSubscriber])
          })
        })
      });

      const mockUpdate = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (db.db.update as jest.Mock).mockImplementation(mockUpdate);
      (otp.canResendOTP as jest.Mock).mockReturnValue({ canSend: true });

      const result = await resendOtpAction('sub-123');

      expect(result.success).toBe(true);
      expect(otp.generateOTP).toHaveBeenCalled();
      expect(sms.sendOTPSMS).toHaveBeenCalled();
    });

    test('should allow immediate resend if never sent before', async () => {
      const neverSentSubscriber = {
        ...mockSubscriber,
        otpLastSentAt: null
      };

      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([neverSentSubscriber])
          })
        })
      });

      const mockUpdate = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (db.db.update as jest.Mock).mockImplementation(mockUpdate);
      (otp.canResendOTP as jest.Mock).mockReturnValue({ canSend: true });

      const result = await resendOtpAction('sub-123');

      expect(result.success).toBe(true);
    });
  });

  describe('Already verified handling', () => {
    test('should reject resend for already verified number', async () => {
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

      const result = await resendOtpAction('sub-123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('already verified');
      }

      // Should not attempt to resend
      expect(otp.canResendOTP).not.toHaveBeenCalled();
      expect(otp.generateOTP).not.toHaveBeenCalled();
      expect(sms.sendOTPSMS).not.toHaveBeenCalled();
      expect(db.db.update).not.toHaveBeenCalled();
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

      const result = await resendOtpAction('invalid-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid verification session');
      }
    });
  });

  describe('SMS failure handling', () => {
    test('should handle SMS sending failure', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockSubscriber])
          })
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (otp.canResendOTP as jest.Mock).mockReturnValue({ canSend: true });
      (sms.sendOTPSMS as jest.Mock).mockResolvedValue({
        success: false,
        error: 'SMS gateway error'
      });

      const result = await resendOtpAction('sub-123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Failed to send verification code');
      }

      // Should not update database if SMS fails
      expect(db.db.update).not.toHaveBeenCalled();
    });

    test('should log SMS errors', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockSubscriber])
          })
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (otp.canResendOTP as jest.Mock).mockReturnValue({ canSend: true });
      (sms.sendOTPSMS as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Network timeout'
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await resendOtpAction('sub-123');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to resend OTP SMS:',
        'Network timeout'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Input validation', () => {
    test('should validate subscriber ID', async () => {
      const result = await resendOtpAction('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    test('should handle Zod validation errors', async () => {
      // Pass invalid data that will fail Zod validation
      const result = await resendOtpAction(null as any);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Error handling', () => {
    test('should handle database errors gracefully', async () => {
      const mockSelect = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await resendOtpAction('sub-123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Failed to resend code');
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'Resend OTP error:',
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
      (otp.canResendOTP as jest.Mock).mockReturnValue({ canSend: true });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await resendOtpAction('sub-123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Failed to resend code');
      }

      consoleSpy.mockRestore();
    });
  });
});