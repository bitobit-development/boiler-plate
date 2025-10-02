/**
 * API route tests for OTP resend endpoint
 * Tests HTTP request/response handling and status codes
 */

import { POST } from '@/app/api/otp/resend/route';
import { NextRequest } from 'next/server';
import * as resendOtp from '@/app/actions/resend-otp';

// Mock the resend-otp action
jest.mock('@/app/actions/resend-otp', () => ({
  resendOtpAction: jest.fn()
}));

describe('OTP Resend API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/otp/resend', () => {
    test('should resend OTP successfully', async () => {
      const mockResult = {
        success: true
      };

      (resendOtp.resendOtpAction as jest.Mock).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/otp/resend', {
        method: 'POST',
        body: JSON.stringify({
          subscriberId: 'sub-123'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResult);
      expect(resendOtp.resendOtpAction).toHaveBeenCalledWith('sub-123');
    });

    test('should return 429 when cooldown is active', async () => {
      const mockResult = {
        success: false,
        error: 'Please wait before requesting a new code',
        cooldownSeconds: 45
      };

      (resendOtp.resendOtpAction as jest.Mock).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/otp/resend', {
        method: 'POST',
        body: JSON.stringify({
          subscriberId: 'sub-123'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429); // Too Many Requests
      expect(data).toEqual(mockResult);
      expect(data.cooldownSeconds).toBe(45);
    });

    test('should return 400 for missing subscriberId', async () => {
      const request = new NextRequest('http://localhost:3000/api/otp/resend', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        success: false,
        error: 'Missing subscriber ID'
      });
      expect(resendOtp.resendOtpAction).not.toHaveBeenCalled();
    });

    test('should return 400 for invalid session', async () => {
      const mockResult = {
        success: false,
        error: 'Invalid verification session. Please start over.'
      };

      (resendOtp.resendOtpAction as jest.Mock).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/otp/resend', {
        method: 'POST',
        body: JSON.stringify({
          subscriberId: 'invalid-id'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual(mockResult);
    });

    test('should return 400 for already verified number', async () => {
      const mockResult = {
        success: false,
        error: 'Mobile number already verified.'
      };

      (resendOtp.resendOtpAction as jest.Mock).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/otp/resend', {
        method: 'POST',
        body: JSON.stringify({
          subscriberId: 'sub-123'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual(mockResult);
    });

    test('should return 400 for SMS failure', async () => {
      const mockResult = {
        success: false,
        error: 'Failed to send verification code. Please try again later.'
      };

      (resendOtp.resendOtpAction as jest.Mock).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/otp/resend', {
        method: 'POST',
        body: JSON.stringify({
          subscriberId: 'sub-123'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual(mockResult);
    });

    test('should handle null subscriberId', async () => {
      const request = new NextRequest('http://localhost:3000/api/otp/resend', {
        method: 'POST',
        body: JSON.stringify({
          subscriberId: null
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        success: false,
        error: 'Missing subscriber ID'
      });
    });

    test('should handle undefined subscriberId', async () => {
      const request = new NextRequest('http://localhost:3000/api/otp/resend', {
        method: 'POST',
        body: JSON.stringify({
          subscriberId: undefined
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        success: false,
        error: 'Missing subscriber ID'
      });
    });

    test('should handle Zod validation errors', async () => {
      const zodError = new (jest.requireActual('zod').ZodError)([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['subscriberId'],
          message: 'Expected string, received number'
        }
      ]);

      (resendOtp.resendOtpAction as jest.Mock).mockRejectedValue(zodError);

      const request = new NextRequest('http://localhost:3000/api/otp/resend', {
        method: 'POST',
        body: JSON.stringify({
          subscriberId: 123 // Number instead of string
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toBeDefined();
    });

    test('should handle server errors', async () => {
      (resendOtp.resendOtpAction as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/otp/resend', {
        method: 'POST',
        body: JSON.stringify({
          subscriberId: 'sub-123'
        })
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Internal server error'
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Resend OTP API error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('should handle invalid JSON in request body', async () => {
      const request = {
        json: async () => {
          throw new SyntaxError('Unexpected token');
        }
      } as NextRequest;

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Internal server error'
      });

      consoleSpy.mockRestore();
    });

    test('should pass through additional success data', async () => {
      const mockResult = {
        success: true,
        additionalInfo: 'OTP sent via WhatsApp'
      };

      (resendOtp.resendOtpAction as jest.Mock).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/otp/resend', {
        method: 'POST',
        body: JSON.stringify({
          subscriberId: 'sub-123'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResult);
    });

    test('should handle empty string subscriberId', async () => {
      const request = new NextRequest('http://localhost:3000/api/otp/resend', {
        method: 'POST',
        body: JSON.stringify({
          subscriberId: ''
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        success: false,
        error: 'Missing subscriber ID'
      });
    });

    test('should handle whitespace-only subscriberId', async () => {
      const request = new NextRequest('http://localhost:3000/api/otp/resend', {
        method: 'POST',
        body: JSON.stringify({
          subscriberId: '   '
        })
      });

      // Assuming the API trims whitespace
      const response = await POST(request);
      const data = await response.json();

      // This depends on implementation - it might call the action with trimmed value
      // or reject as invalid. Adjust based on actual behavior
      expect(response.status).toBe(400);
    });

    test('should differentiate between cooldown and other errors', async () => {
      // Test with cooldown
      const cooldownResult = {
        success: false,
        error: 'Please wait',
        cooldownSeconds: 30
      };

      (resendOtp.resendOtpAction as jest.Mock).mockResolvedValue(cooldownResult);

      const request1 = new NextRequest('http://localhost:3000/api/otp/resend', {
        method: 'POST',
        body: JSON.stringify({ subscriberId: 'sub-123' })
      });

      const response1 = await POST(request1);
      expect(response1.status).toBe(429);

      // Test without cooldown
      const otherErrorResult = {
        success: false,
        error: 'Some other error'
        // No cooldownSeconds
      };

      (resendOtp.resendOtpAction as jest.Mock).mockResolvedValue(otherErrorResult);

      const request2 = new NextRequest('http://localhost:3000/api/otp/resend', {
        method: 'POST',
        body: JSON.stringify({ subscriberId: 'sub-123' })
      });

      const response2 = await POST(request2);
      expect(response2.status).toBe(400);
    });
  });
});