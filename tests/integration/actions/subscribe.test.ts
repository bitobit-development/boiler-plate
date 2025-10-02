/**
 * Integration tests for subscribe Server Action
 * Tests OTP generation, SMS sending, and subscriber creation flow
 */

import { subscribeAction } from '@/app/actions/subscribe';
import * as db from '@/lib/db';
import * as otp from '@/lib/otp';
import * as sms from '@/lib/services/sms';
import * as cache from '@/lib/cache';

// Mock database
jest.mock('@/lib/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

// Mock OTP utilities
jest.mock('@/lib/otp', () => ({
  generateOTP: jest.fn(),
  hashOTP: jest.fn(),
  getOTPExpiration: jest.fn()
}));

// Mock SMS service
jest.mock('@/lib/services/sms', () => ({
  sendOTPSMS: jest.fn()
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

describe('Subscribe Action Integration', () => {
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
    otpExpiresAt: new Date(Date.now() + 600000),
    otpAttempts: 0,
    otpLastSentAt: new Date()
  };

  const validFormData = {
    name: 'John',
    surname: 'Doe',
    email: 'john@example.com',
    mobile: '+27821234567',
    ageVerified: true
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (otp.generateOTP as jest.Mock).mockReturnValue('123456');
    (otp.hashOTP as jest.Mock).mockReturnValue('hashed-otp');
    (otp.getOTPExpiration as jest.Mock).mockReturnValue(
      new Date(Date.now() + 600000)
    );
    (sms.sendOTPSMS as jest.Mock).mockResolvedValue({
      success: true,
      messageId: 'msg-123',
      channel: 'sms'
    });
    (cache.deletePattern as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Successful submission', () => {
    test('should generate OTP for valid submission', async () => {
      // Mock no existing records
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      // Mock successful insert
      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'sub-123' }])
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (db.db.insert as jest.Mock).mockImplementation(mockInsert);

      const result = await subscribeAction(validFormData);

      expect(otp.generateOTP).toHaveBeenCalled();
      expect(otp.hashOTP).toHaveBeenCalledWith('123456');
      expect(otp.getOTPExpiration).toHaveBeenCalled();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.subscriberId).toBe('sub-123');
      }
    });

    test('should send SMS successfully', async () => {
      // Mock no existing records
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      // Mock successful insert
      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'sub-123' }])
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (db.db.insert as jest.Mock).mockImplementation(mockInsert);

      const result = await subscribeAction(validFormData);

      expect(sms.sendOTPSMS).toHaveBeenCalledWith('+27821234567', '123456');
      expect(result.success).toBe(true);
    });

    test('should save subscriber with pending status', async () => {
      // Mock no existing records
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      let savedValues: any;
      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn((values: any) => {
          savedValues = values;
          return {
            returning: jest.fn().mockResolvedValue([{ id: 'sub-123' }])
          };
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (db.db.insert as jest.Mock).mockImplementation(mockInsert);

      const result = await subscribeAction(validFormData);

      expect(mockInsert).toHaveBeenCalled();
      expect(savedValues).toMatchObject({
        name: 'John',
        surname: 'Doe',
        email: 'john@example.com',
        mobile: '+27821234567',
        ageVerified: true,
        status: 'pending',
        mobileVerified: false,
        otpCode: 'hashed-otp',
        otpAttempts: 0
      });
      expect(savedValues.otpExpiresAt).toBeInstanceOf(Date);
      expect(savedValues.otpLastSentAt).toBeInstanceOf(Date);
    });

    test('should return subscriberId on success', async () => {
      // Mock no existing records
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      // Mock successful insert
      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'sub-unique-id' }])
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (db.db.insert as jest.Mock).mockImplementation(mockInsert);

      const result = await subscribeAction(validFormData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.subscriberId).toBe('sub-unique-id');
        expect(result.maskedPhone).toBeDefined();
      }
    });

    test('should mask phone number in response', async () => {
      // Mock no existing records
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      // Mock successful insert
      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'sub-123' }])
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (db.db.insert as jest.Mock).mockImplementation(mockInsert);

      const result = await subscribeAction({
        ...validFormData,
        mobile: '+27821234567'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.maskedPhone).toBe('+27***4567');
      }
    });

    test('should invalidate cache after insert', async () => {
      // Mock no existing records
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      // Mock successful insert
      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'sub-123' }])
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (db.db.insert as jest.Mock).mockImplementation(mockInsert);

      await subscribeAction(validFormData);

      expect(cache.deletePattern).toHaveBeenCalledWith('registrations:*');
      expect(cache.deletePattern).toHaveBeenCalledWith('stats:*');
      expect(cache.deletePattern).toHaveBeenCalledWith('dashboard:*');
    });
  });

  describe('Duplicate prevention', () => {
    test('should reject duplicate email', async () => {
      // Mock existing email
      const mockSelectEmail = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockSubscriber])
          })
        })
      });

      (db.db.select as jest.Mock).mockImplementationOnce(mockSelectEmail);

      const result = await subscribeAction(validFormData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('email is already subscribed');
        expect(result.field).toBe('email');
      }

      expect(db.db.insert).not.toHaveBeenCalled();
      expect(sms.sendOTPSMS).not.toHaveBeenCalled();
    });

    test('should reject duplicate mobile', async () => {
      // First query returns no email match
      const mockSelectEmail = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      // Second query returns mobile match
      const mockSelectMobile = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockSubscriber])
          })
        })
      });

      (db.db.select as jest.Mock)
        .mockImplementationOnce(mockSelectEmail)
        .mockImplementationOnce(mockSelectMobile);

      const result = await subscribeAction(validFormData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('mobile number is already subscribed');
        expect(result.field).toBe('mobile');
      }

      expect(db.db.insert).not.toHaveBeenCalled();
      expect(sms.sendOTPSMS).not.toHaveBeenCalled();
    });
  });

  describe('SMS failure handling', () => {
    test('should handle SMS failure gracefully', async () => {
      // Mock no existing records
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);

      // Mock SMS failure
      (sms.sendOTPSMS as jest.Mock).mockResolvedValue({
        success: false,
        error: 'SMS gateway error'
      });

      const result = await subscribeAction(validFormData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Failed to send verification code');
        expect(result.field).toBe('mobile');
      }

      expect(db.db.insert).not.toHaveBeenCalled();
    });

    test('should log SMS errors', async () => {
      // Mock no existing records
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);

      // Mock SMS failure
      (sms.sendOTPSMS as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Gateway timeout'
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await subscribeAction(validFormData);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send OTP SMS:',
        'Gateway timeout'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Validation errors', () => {
    test('should handle invalid email', async () => {
      const invalidData = {
        ...validFormData,
        email: 'invalid-email'
      };

      const result = await subscribeAction(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('email');
        expect(result.field).toBe('email');
      }
    });

    test('should handle missing required fields', async () => {
      const incompleteData = {
        name: 'John',
        // missing surname, email, mobile
        ageVerified: true
      };

      const result = await subscribeAction(incompleteData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    test('should handle invalid mobile format', async () => {
      const invalidData = {
        ...validFormData,
        mobile: '0821234567' // Missing country code
      };

      const result = await subscribeAction(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('mobile');
        expect(result.field).toBe('mobile');
      }
    });

    test('should require age verification', async () => {
      const invalidData = {
        ...validFormData,
        ageVerified: false
      };

      const result = await subscribeAction(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('age');
        expect(result.field).toBe('ageVerified');
      }
    });
  });

  describe('Database error handling', () => {
    test('should handle database connection errors', async () => {
      const mockSelect = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await subscribeAction(validFormData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Something went wrong. Please try again later.');
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'Database error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('should handle insert failures', async () => {
      // Mock no existing records
      const mockSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      // Mock insert failure
      const mockInsert = jest.fn().mockImplementation(() => {
        throw new Error('Insert failed');
      });

      (db.db.select as jest.Mock).mockImplementation(mockSelect);
      (db.db.insert as jest.Mock).mockImplementation(mockInsert);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await subscribeAction(validFormData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Something went wrong. Please try again later.');
      }

      consoleSpy.mockRestore();
    });
  });
});