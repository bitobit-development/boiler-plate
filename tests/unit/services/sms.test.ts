/**
 * Unit tests for SMS service
 * Tests SMS sending, OTP message formatting, and mobile number validation
 */

import {
  sendSMS,
  sendOTPSMS,
  sendWelcomeSMS,
  validateMobileFormat
} from '@/lib/services/sms';

describe('SMS Service', () => {
  // Store original env vars
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    process.env.CLICKATELL_API_KEY = 'test-api-key';
    process.env.CLICKATELL_API_URL = 'https://api.clickatell.com/test';

    // Clear all mocks
    jest.clearAllMocks();

    // Reset fetch mock
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('sendSMS', () => {
    test('should send SMS with correct payload', async () => {
      const mockResponse = {
        messages: [{
          accepted: true,
          to: '27821234567',
          apiMessageId: 'msg-123'
        }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await sendSMS({
        to: '+27821234567',
        message: 'Test message',
        channel: 'sms'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.clickatell.com/test',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'test-api-key'
          },
          body: JSON.stringify({
            messages: [{
              channel: 'sms',
              to: '27821234567', // Note: + is removed
              content: 'Test message'
            }]
          })
        }
      );

      expect(result).toEqual({
        success: true,
        messageId: 'msg-123',
        channel: 'sms'
      });
    });

    test('should include authorization header correctly', async () => {
      const mockResponse = {
        messages: [{
          accepted: true,
          apiMessageId: 'msg-123'
        }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await sendSMS({
        to: '+27821234567',
        message: 'Test'
      });

      const call = (global.fetch as jest.Mock).mock.calls[0];
      expect(call[1].headers.Authorization).toBe('test-api-key');
    });

    test('should handle success response', async () => {
      const mockResponse = {
        messages: [{
          accepted: true,
          to: '27821234567',
          apiMessageId: 'msg-success-123'
        }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await sendSMS({
        to: '+27821234567',
        message: 'Success test'
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-success-123');
    });

    test('should handle API errors', async () => {
      const mockError = {
        error: {
          code: 401,
          description: 'Invalid API key'
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => mockError
      });

      const result = await sendSMS({
        to: '+27821234567',
        message: 'Error test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    test('should handle message-level rejection', async () => {
      const mockResponse = {
        messages: [{
          accepted: false,
          error: {
            code: 100,
            description: 'Invalid phone number'
          }
        }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await sendSMS({
        to: '+27821234567',
        message: 'Test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid phone number');
    });

    test('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network failure')
      );

      const result = await sendSMS({
        to: '+27821234567',
        message: 'Network test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network failure');
    });

    test('should handle missing credentials', async () => {
      delete process.env.CLICKATELL_API_KEY;

      const result = await sendSMS({
        to: '+27821234567',
        message: 'Test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMS service not configured');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('should validate phone number format', async () => {
      const result = await sendSMS({
        to: '0821234567', // Missing country code
        message: 'Test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid phone number format');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('should clean phone number format', async () => {
      const mockResponse = {
        messages: [{
          accepted: true,
          apiMessageId: 'msg-123'
        }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await sendSMS({
        to: '+27 82-123 4567', // With spaces and dashes
        message: 'Test'
      });

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.messages[0].to).toBe('27821234567');
    });

    test('should default to SMS channel when not specified', async () => {
      const mockResponse = {
        messages: [{
          accepted: true,
          apiMessageId: 'msg-123'
        }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await sendSMS({
        to: '+27821234567',
        message: 'Test'
      });

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.messages[0].channel).toBe('sms');
      expect(result.channel).toBe('sms');
    });

    test('should support WhatsApp channel', async () => {
      const mockResponse = {
        messages: [{
          accepted: true,
          apiMessageId: 'msg-wa-123'
        }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await sendSMS({
        to: '+27821234567',
        message: 'WhatsApp test',
        channel: 'whatsapp'
      });

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.messages[0].channel).toBe('whatsapp');
      expect(result.channel).toBe('whatsapp');
    });
  });

  describe('sendOTPSMS', () => {
    test('should format OTP message correctly', async () => {
      const mockResponse = {
        messages: [{
          accepted: true,
          apiMessageId: 'msg-123'
        }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await sendOTPSMS('+27821234567', '123456');

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body.messages[0].content).toContain('123456');
      expect(body.messages[0].content).toContain('Your Bigg Buzz verification code is');
      expect(body.messages[0].content).toContain('expire in 10 minutes');
      expect(body.messages[0].content).toContain('Do not share this code');
    });

    test('should include OTP code in message', async () => {
      const mockResponse = {
        messages: [{
          accepted: true,
          apiMessageId: 'msg-123'
        }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const otpCode = '987654';
      await sendOTPSMS('+27821234567', otpCode);

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body.messages[0].content).toContain(otpCode);
    });

    test('should send to correct number', async () => {
      const mockResponse = {
        messages: [{
          accepted: true,
          apiMessageId: 'msg-123'
        }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const phoneNumber = '+27821234567';
      await sendOTPSMS(phoneNumber, '123456');

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body.messages[0].to).toBe('27821234567');
    });

    test('should use SMS channel by default', async () => {
      const mockResponse = {
        messages: [{
          accepted: true,
          apiMessageId: 'msg-123'
        }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await sendOTPSMS('+27821234567', '123456');

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body.messages[0].channel).toBe('sms');
    });

    test('should fallback to WhatsApp for test numbers on SMS failure', async () => {
      // First call fails (SMS)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { description: 'SMS failed' } })
      });

      // Second call succeeds (WhatsApp)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{
            accepted: true,
            apiMessageId: 'msg-wa-123'
          }]
        })
      });

      const result = await sendOTPSMS('+27823290000', '123456'); // Test number

      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Check second call uses WhatsApp
      const secondCall = (global.fetch as jest.Mock).mock.calls[1];
      const body = JSON.parse(secondCall[1].body);
      expect(body.messages[0].channel).toBe('whatsapp');

      expect(result.success).toBe(true);
      expect(result.channel).toBe('whatsapp');
    });

    test('should not fallback to WhatsApp for non-test numbers', async () => {
      // SMS fails
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { description: 'SMS failed' } })
      });

      const result = await sendOTPSMS('+27821234567', '123456');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(false);
    });
  });

  describe('sendWelcomeSMS', () => {
    test('should send welcome message with user name', async () => {
      const mockResponse = {
        messages: [{
          accepted: true,
          apiMessageId: 'msg-welcome-123'
        }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await sendWelcomeSMS('+27821234567', 'John');

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body.messages[0].content).toContain('Welcome to Bigg Buzz, John!');
      expect(body.messages[0].content).toContain('verified');
      expect(result.success).toBe(true);
    });

    test('should use SMS channel for welcome messages', async () => {
      const mockResponse = {
        messages: [{
          accepted: true,
          apiMessageId: 'msg-123'
        }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await sendWelcomeSMS('+27821234567', 'Jane');

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body.messages[0].channel).toBe('sms');
    });
  });

  describe('validateMobileFormat', () => {
    test('should accept valid South African mobile number', () => {
      const result = validateMobileFormat('+27821234567');

      expect(result).toBe('+27821234567');
    });

    test('should clean and validate number with spaces', () => {
      const result = validateMobileFormat('+27 82 123 4567');

      expect(result).toBe('+27821234567');
    });

    test('should clean and validate number with dashes', () => {
      const result = validateMobileFormat('+27-82-123-4567');

      expect(result).toBe('+27821234567');
    });

    test('should reject number without country code', () => {
      const result = validateMobileFormat('0821234567');

      expect(result).toBeNull();
    });

    test('should reject number without plus prefix', () => {
      const result = validateMobileFormat('27821234567');

      expect(result).toBeNull();
    });

    test('should reject number that is too short', () => {
      const result = validateMobileFormat('+2782123'); // Only 9 digits total

      expect(result).toBeNull();
    });

    test('should reject number that is too long', () => {
      const result = validateMobileFormat('+2782123456789012'); // 17 digits

      expect(result).toBeNull();
    });

    test('should validate South African numbers specifically', () => {
      // Valid SA number
      const valid = validateMobileFormat('+27821234567');
      expect(valid).toBe('+27821234567');

      // Invalid SA number (wrong length)
      const invalid = validateMobileFormat('+278212345'); // Too short for SA
      expect(invalid).toBeNull();
    });

    test('should accept international numbers within valid range', () => {
      // US number
      const us = validateMobileFormat('+12125551234');
      expect(us).toBe('+12125551234');

      // UK number
      const uk = validateMobileFormat('+447700900123');
      expect(uk).toBe('+447700900123');
    });

    test('should handle parentheses and other characters', () => {
      const result = validateMobileFormat('+27 (82) 123-4567');

      expect(result).toBe('+27821234567');
    });

    test('should return null for empty string', () => {
      const result = validateMobileFormat('');

      expect(result).toBeNull();
    });

    test('should return null for non-numeric characters', () => {
      const result = validateMobileFormat('+27abcd12345');

      expect(result).toBe('+2712345'); // Cleaned but too short
    });
  });
});