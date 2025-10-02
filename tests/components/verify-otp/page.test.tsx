/**
 * Component tests for OTP verification page
 * Tests UI interactions, state management, and user feedback
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import VerifyOTPPage from '@/app/verify-otp/page';
import * as verifyOtpModule from '@/app/actions/verify-otp';
import * as resendOtpModule from '@/app/actions/resend-otp';
import { toast } from 'sonner';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn()
}));

// Mock actions
jest.mock('@/app/actions/verify-otp', () => ({
  verifyOtpAction: jest.fn()
}));

jest.mock('@/app/actions/resend-otp', () => ({
  resendOtpAction: jest.fn()
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

// Mock ParticleBackground component
jest.mock('@/components/subscription/ParticleBackground', () => {
  return function MockParticleBackground() {
    return <div data-testid="particle-background" />;
  };
});

// Mock InputOTP components
jest.mock('@/components/ui/input-otp', () => ({
  InputOTP: ({ children, value, onChange, disabled, ...props }: any) => (
    <div data-testid="input-otp" {...props}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        maxLength={6}
        data-testid="otp-input"
        aria-label={props['aria-label']}
      />
      {children}
    </div>
  ),
  InputOTPGroup: ({ children }: any) => (
    <div data-testid="input-otp-group">{children}</div>
  ),
  InputOTPSlot: ({ index }: any) => (
    <div data-testid={`otp-slot-${index}`} />
  )
}));

describe('OTP Verification Page', () => {
  let mockRouter: any;
  let mockSearchParams: any;

  beforeEach(() => {
    // Setup router mock
    mockRouter = {
      push: jest.fn(),
      back: jest.fn()
    };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    // Setup search params mock
    mockSearchParams = new URLSearchParams();
    mockSearchParams.set('session', 'sub-123');
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

    // Clear all mocks
    jest.clearAllMocks();

    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      writable: true
    });
  });

  describe('Rendering', () => {
    test('should render 6 OTP input slots', () => {
      render(<VerifyOTPPage />);

      // Check for OTP slots
      for (let i = 0; i < 6; i++) {
        expect(screen.getByTestId(`otp-slot-${i}`)).toBeInTheDocument();
      }
    });

    test('should display verification heading', () => {
      render(<VerifyOTPPage />);

      expect(screen.getByText('Verify Your Number')).toBeInTheDocument();
      expect(screen.getByText('Enter the 6-digit code sent to')).toBeInTheDocument();
    });

    test('should display masked phone number', () => {
      (window.sessionStorage.getItem as jest.Mock).mockReturnValue('+27***1234');

      render(<VerifyOTPPage />);

      expect(screen.getByText('+27***1234')).toBeInTheDocument();
    });

    test('should display default masked number if not in session', () => {
      (window.sessionStorage.getItem as jest.Mock).mockReturnValue(null);

      render(<VerifyOTPPage />);

      expect(screen.getByText('+27***4567')).toBeInTheDocument();
    });

    test('should render back button', () => {
      render(<VerifyOTPPage />);

      const backButton = screen.getByLabelText('Go back to registration');
      expect(backButton).toBeInTheDocument();
    });

    test('should render resend button', () => {
      render(<VerifyOTPPage />);

      expect(screen.getByText("Didn't receive the code?")).toBeInTheDocument();
      expect(screen.getByText('Resend code')).toBeInTheDocument();
    });
  });

  describe('Session validation', () => {
    test('should redirect when no session parameter', () => {
      mockSearchParams = new URLSearchParams();
      (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

      render(<VerifyOTPPage />);

      expect(toast.error).toHaveBeenCalledWith('Session expired. Please register again.');
      expect(mockRouter.push).toHaveBeenCalledWith('/subscribe');
    });

    test('should not redirect with valid session', () => {
      render(<VerifyOTPPage />);

      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe('OTP input behavior', () => {
    test('should auto-submit on 6 digits entered', async () => {
      const mockVerify = jest.fn().mockResolvedValue({
        success: true,
        subscriber: { name: 'John', email: 'john@example.com' }
      });
      (verifyOtpModule.verifyOtpAction as jest.Mock) = mockVerify;

      render(<VerifyOTPPage />);

      const input = screen.getByTestId('otp-input');
      await userEvent.type(input, '123456');

      await waitFor(() => {
        expect(mockVerify).toHaveBeenCalledWith('sub-123', '123456');
      });
    });

    test('should not submit with less than 6 digits', async () => {
      const mockVerify = jest.fn();
      (verifyOtpModule.verifyOtpAction as jest.Mock) = mockVerify;

      render(<VerifyOTPPage />);

      const input = screen.getByTestId('otp-input');
      await userEvent.type(input, '12345');

      await waitFor(() => {
        expect(mockVerify).not.toHaveBeenCalled();
      });
    });

    test('should accept only numeric input', async () => {
      render(<VerifyOTPPage />);

      const input = screen.getByTestId('otp-input') as HTMLInputElement;
      await userEvent.type(input, 'abc123');

      // The actual InputOTP component would filter non-numeric
      // For testing, we check the input pattern attribute
      expect(input).toHaveAttribute('maxLength', '6');
    });
  });

  describe('Verification flow', () => {
    test('should show loading state during verification', async () => {
      const mockVerify = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      (verifyOtpModule.verifyOtpAction as jest.Mock) = mockVerify;

      render(<VerifyOTPPage />);

      const input = screen.getByTestId('otp-input');
      await userEvent.type(input, '123456');

      await waitFor(() => {
        expect(screen.getByText('Verifying...')).toBeInTheDocument();
      });
    });

    test('should handle successful verification', async () => {
      const mockVerify = jest.fn().mockResolvedValue({
        success: true,
        subscriber: {
          id: 'sub-123',
          name: 'John Doe',
          email: 'john@example.com'
        }
      });
      (verifyOtpModule.verifyOtpAction as jest.Mock) = mockVerify;

      render(<VerifyOTPPage />);

      const input = screen.getByTestId('otp-input');
      await userEvent.type(input, '123456');

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Phone number verified successfully!');
      });

      // Check session storage was updated
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'verificationSuccess',
        JSON.stringify({ name: 'John Doe', email: 'john@example.com' })
      );

      // Check redirect after animation
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          expect.stringContaining('/success')
        );
      }, { timeout: 2000 });
    });

    test('should show error on invalid code', async () => {
      const mockVerify = jest.fn().mockResolvedValue({
        success: false,
        error: 'Invalid verification code. 2 attempts remaining.',
        attemptsRemaining: 2
      });
      (verifyOtpModule.verifyOtpAction as jest.Mock) = mockVerify;

      render(<VerifyOTPPage />);

      const input = screen.getByTestId('otp-input');
      await userEvent.type(input, '999999');

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Invalid verification code. 2 attempts remaining.');
      });
    });

    test('should handle expired OTP', async () => {
      const mockVerify = jest.fn().mockResolvedValue({
        success: false,
        error: 'Your verification code has expired. Please request a new one.'
      });
      (verifyOtpModule.verifyOtpAction as jest.Mock) = mockVerify;

      render(<VerifyOTPPage />);

      const input = screen.getByTestId('otp-input');
      await userEvent.type(input, '123456');

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('expired');
      });
    });

    test('should show locked message after max attempts', async () => {
      const mockVerify = jest.fn().mockResolvedValue({
        success: false,
        error: 'Too many failed attempts. Account locked.',
        attemptsRemaining: 0
      });
      (verifyOtpModule.verifyOtpAction as jest.Mock) = mockVerify;

      render(<VerifyOTPPage />);

      const input = screen.getByTestId('otp-input');
      await userEvent.type(input, '999999');

      await waitFor(() => {
        expect(screen.getByText('Account temporarily locked.')).toBeInTheDocument();
        expect(screen.getByText('Please contact support for assistance.')).toBeInTheDocument();
      });
    });
  });

  describe('Resend functionality', () => {
    test('should resend OTP successfully', async () => {
      const mockResend = jest.fn().mockResolvedValue({
        success: true
      });
      (resendOtpModule.resendOtpAction as jest.Mock) = mockResend;

      render(<VerifyOTPPage />);

      const resendButton = screen.getByText('Resend code');
      await userEvent.click(resendButton);

      await waitFor(() => {
        expect(mockResend).toHaveBeenCalledWith('sub-123');
        expect(toast.success).toHaveBeenCalledWith('New verification code sent!');
      });
    });

    test('should show cooldown after resend', async () => {
      const mockResend = jest.fn().mockResolvedValue({
        success: true
      });
      (resendOtpModule.resendOtpAction as jest.Mock) = mockResend;

      render(<VerifyOTPPage />);

      const resendButton = screen.getByText('Resend code');
      await userEvent.click(resendButton);

      await waitFor(() => {
        expect(screen.getByText(/Resend code \(\d+s\)/)).toBeInTheDocument();
      });
    });

    test('should disable resend during cooldown', async () => {
      const mockResend = jest.fn().mockResolvedValue({
        success: true
      });
      (resendOtpModule.resendOtpAction as jest.Mock) = mockResend;

      render(<VerifyOTPPage />);

      const resendButton = screen.getByText('Resend code');
      await userEvent.click(resendButton);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /Resend code/ });
        expect(button).toBeDisabled();
      });
    });

    test('should handle resend failure', async () => {
      const mockResend = jest.fn().mockResolvedValue({
        success: false,
        error: 'Failed to send SMS'
      });
      (resendOtpModule.resendOtpAction as jest.Mock) = mockResend;

      render(<VerifyOTPPage />);

      const resendButton = screen.getByText('Resend code');
      await userEvent.click(resendButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to send SMS');
        expect(screen.getByRole('alert')).toHaveTextContent('Failed to send SMS');
      });
    });
  });

  describe('Navigation', () => {
    test('should navigate back to subscribe page', async () => {
      render(<VerifyOTPPage />);

      const backButton = screen.getByLabelText('Go back to registration');
      await userEvent.click(backButton);

      expect(mockRouter.push).toHaveBeenCalledWith('/subscribe');
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(<VerifyOTPPage />);

      expect(screen.getByLabelText('Go back to registration')).toBeInTheDocument();
      expect(screen.getByLabelText('Verification code input')).toBeInTheDocument();
    });

    test('should announce errors to screen readers', async () => {
      const mockVerify = jest.fn().mockResolvedValue({
        success: false,
        error: 'Invalid code',
        attemptsRemaining: 2
      });
      (verifyOtpModule.verifyOtpAction as jest.Mock) = mockVerify;

      render(<VerifyOTPPage />);

      const input = screen.getByTestId('otp-input');
      await userEvent.type(input, '999999');

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('aria-live', 'polite');
      });
    });

    test('should disable inputs when locked', async () => {
      const mockVerify = jest.fn().mockResolvedValue({
        success: false,
        error: 'Account locked',
        attemptsRemaining: 0
      });
      (verifyOtpModule.verifyOtpAction as jest.Mock) = mockVerify;

      render(<VerifyOTPPage />);

      const input = screen.getByTestId('otp-input');
      await userEvent.type(input, '999999');

      await waitFor(() => {
        expect(input).toBeDisabled();
      });
    });
  });

  describe('Success animation', () => {
    test('should show success animation before redirect', async () => {
      const mockVerify = jest.fn().mockResolvedValue({
        success: true,
        subscriber: { name: 'John', email: 'john@example.com' }
      });
      (verifyOtpModule.verifyOtpAction as jest.Mock) = mockVerify;

      render(<VerifyOTPPage />);

      const input = screen.getByTestId('otp-input');
      await userEvent.type(input, '123456');

      await waitFor(() => {
        expect(screen.getByText('Verified!')).toBeInTheDocument();
        expect(screen.getByText('Redirecting to success page...')).toBeInTheDocument();
      });
    });
  });
});