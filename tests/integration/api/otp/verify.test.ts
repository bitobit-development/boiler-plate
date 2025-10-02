/**
 * API route tests for OTP verification endpoint
 * Tests HTTP request/response handling and status codes
 */

import { POST } from '@/app/api/otp/verify/route';
import { NextRequest } from 'next/server';
import * as verifyOtp from '@/app/actions/verify-otp';

// Mock the verify-otp action
jest.mock('@/app/actions/verify-otp', () => ({
  verifyOtpAction: jest.fn()
}));

describe('OTP Verify API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/otp/verify', () => {
    test('should verify valid OTP successfully', async () => {
      const mockResult = {
        success: true,
        subscriber: {
          id: 'sub-123',
          name: 'John',
          email: 'john@example.com'
        }
      };

      (verifyOtp.verifyOtpAction as jest.Mock).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          subscriberId: 'sub-123',
          otpCode: '123456'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResult);
      expect(verifyOtp.verifyOtpAction).toHaveBeenCalledWith('sub-123', '123456');
    });

    test('should return 400 for invalid OTP', async () => {
      const mockResult = {
        success: false,
        error: 'Invalid verification code',
        attemptsRemaining: 2
      };

      (verifyOtp.verifyOtpAction as jest.Mock).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          subscriberId: 'sub-123',
          otpCode: 'wrong-code'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual(mockResult);
    });

    test('should return 429 for max attempts exceeded', async () => {
      const mockResult = {
        success: false,
        error: 'Too many failed attempts',
        attemptsRemaining: 0
      };

      (verifyOtp.verifyOtpAction as jest.Mock).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          subscriberId: 'sub-123',
          otpCode: '123456'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429); // Rate limiting status
      expect(data).toEqual(mockResult);
    });

    test('should return 400 for missing subscriberId', async () => {
      const request = new NextRequest('http://localhost:3000/api/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          otpCode: '123456'
          // Missing subscriberId
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        success: false,
        error: 'Missing required fields'
      });
      expect(verifyOtp.verifyOtpAction).not.toHaveBeenCalled();
    });

    test('should return 400 for missing otpCode', async () => {
      const request = new NextRequest('http://localhost:3000/api/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          subscriberId: 'sub-123'
          // Missing otpCode
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        success: false,
        error: 'Missing required fields'
      });
      expect(verifyOtp.verifyOtpAction).not.toHaveBeenCalled();
    });

    test('should return 400 for empty request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/otp/verify', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        success: false,
        error: 'Missing required fields'
      });
    });

    test('should handle expired OTP', async () => {
      const mockResult = {
        success: false,
        error: 'Verification code has expired'
      };

      (verifyOtp.verifyOtpAction as jest.Mock).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          subscriberId: 'sub-123',
          otpCode: '123456'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual(mockResult);
    });

    test('should handle invalid session', async () => {
      const mockResult = {
        success: false,
        error: 'Invalid verification session'
      };

      (verifyOtp.verifyOtpAction as jest.Mock).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          subscriberId: 'invalid-id',
          otpCode: '123456'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual(mockResult);
    });

    test('should handle Zod validation errors', async () => {
      const zodError = new (jest.requireActual('zod').ZodError)([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['otpCode'],
          message: 'Expected string, received number'
        }
      ]);

      (verifyOtp.verifyOtpAction as jest.Mock).mockRejectedValue(zodError);

      const request = new NextRequest('http://localhost:3000/api/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          subscriberId: 'sub-123',
          otpCode: 123456 // Number instead of string
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
      (verifyOtp.verifyOtpAction as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          subscriberId: 'sub-123',
          otpCode: '123456'
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
        'OTP verification API error:',
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

    test('should pass through additional error details', async () => {
      const mockResult = {
        success: false,
        error: 'Invalid code',
        attemptsRemaining: 1,
        additionalInfo: 'Some extra context'
      };

      (verifyOtp.verifyOtpAction as jest.Mock).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          subscriberId: 'sub-123',
          otpCode: 'wrong'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual(mockResult);
    });
  });
});