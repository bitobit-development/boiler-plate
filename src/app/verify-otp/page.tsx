'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import ParticleBackground from '@/components/subscription/ParticleBackground';
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { verifyOtpAction, type VerifyOTPResult } from '@/app/actions/verify-otp';
import { resendOtpAction, type ResendOTPResult } from '@/app/actions/resend-otp';

function OTPVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const [maskedPhone, setMaskedPhone] = useState<string>('');

  // Form states
  const [otpValue, setOtpValue] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successAnimation, setSuccessAnimation] = useState(false);

  // Timer reference
  const cooldownTimer = useRef<NodeJS.Timeout>();

  // Redirect if no session
  useEffect(() => {
    if (!sessionId) {
      toast.error('Session expired. Please register again.');
      router.push('/subscribe');
    } else {
      // Get masked phone from session storage or server
      const stored = sessionStorage.getItem('maskedPhone');
      if (stored) {
        setMaskedPhone(stored);
      }
    }
  }, [sessionId, router]);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldown > 0) {
      cooldownTimer.current = setTimeout(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (cooldownTimer.current) {
        clearTimeout(cooldownTimer.current);
      }
    };
  }, [cooldown]);

  // Auto-submit when 6 digits are entered
  useEffect(() => {
    if (otpValue.length === 6) {
      handleVerifyOTP();
    }
  }, [otpValue]);

  const handleVerifyOTP = async () => {
    if (!sessionId || otpValue.length !== 6) return;

    setIsVerifying(true);
    setErrorMessage('');

    try {
      const result = await verifyOtpAction(sessionId, otpValue);

      if (result.success) {
        setSuccessAnimation(true);
        toast.success('Phone number verified successfully!');

        // Store success data for the success page
        const { name, email } = result.subscriber;
        sessionStorage.setItem('verificationSuccess', JSON.stringify({ name, email }));

        // Animate then redirect
        setTimeout(() => {
          router.push(`/success?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`);
        }, 1000);
      } else {
        // Handle different error types
        if (result.error?.includes('expired')) {
          setErrorMessage('Your verification code has expired. Please request a new one.');
          setOtpValue('');
        } else if (result.error?.includes('locked')) {
          setErrorMessage('Too many failed attempts. Please contact support.');
          setAttemptsRemaining(0);
        } else {
          const remaining = result.attemptsRemaining || 0;
          setAttemptsRemaining(remaining);
          setErrorMessage(`Invalid verification code. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`);
          setOtpValue('');

          // Shake animation on error
          const input = document.querySelector('[data-otp-container]');
          if (input) {
            input.classList.add('animate-shake');
            setTimeout(() => input.classList.remove('animate-shake'), 500);
          }
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      setErrorMessage('An error occurred. Please try again.');
      toast.error('Failed to verify code');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    if (!sessionId || cooldown > 0) return;

    setIsResending(true);
    setErrorMessage('');

    try {
      const result = await resendOtpAction(sessionId);

      if (result.success) {
        toast.success('New verification code sent!');
        setCooldown(60); // Start 60 second cooldown
        setOtpValue('');
        setAttemptsRemaining(3); // Reset attempts
      } else {
        setErrorMessage(result.error || 'Failed to resend code');
        toast.error(result.error || 'Failed to resend verification code');
      }
    } catch (error) {
      console.error('Resend error:', error);
      setErrorMessage('Failed to resend code. Please try again.');
      toast.error('Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <ParticleBackground />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Back button */}
          <button
            onClick={() => router.push('/subscribe')}
            className="mb-6 text-gray-400 hover:text-white transition-colors flex items-center gap-2"
            aria-label="Go back to registration"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          {/* Main card */}
          <div className={cn(
            "bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-800",
            successAnimation && "animate-pulse"
          )}>
            {/* Success state */}
            {successAnimation ? (
              <div className="text-center space-y-4">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto animate-bounce" />
                <h1 className="text-2xl font-bold text-white">Verified!</h1>
                <p className="text-gray-400">Redirecting to success page...</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-white mb-2">
                    Verify Your Number
                  </h1>
                  <p className="text-gray-400">
                    Enter the 6-digit code sent to
                  </p>
                  <p className="text-orange-500 font-medium mt-1">
                    {maskedPhone || '+27***4567'}
                  </p>
                </div>

                {/* OTP Input */}
                <div className="space-y-6">
                  <div
                    className="flex justify-center"
                    data-otp-container
                  >
                    <InputOTP
                      maxLength={6}
                      value={otpValue}
                      onChange={setOtpValue}
                      disabled={isVerifying || attemptsRemaining === 0}
                      autoFocus
                      inputMode="numeric"
                      pattern="[0-9]*"
                      aria-label="Verification code input"
                      className="gap-2"
                    >
                      <InputOTPGroup className="gap-2">
                        {[0, 1, 2, 3, 4, 5].map(index => (
                          <InputOTPSlot
                            key={index}
                            index={index}
                            className={cn(
                              "w-12 h-14 text-lg border-gray-700",
                              "bg-gray-800/50 text-white",
                              "focus:border-orange-500 focus:ring-orange-500",
                              "transition-all duration-200",
                              otpValue.length > index && "border-orange-500/50"
                            )}
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  {/* Loading state */}
                  {isVerifying && (
                    <div className="flex items-center justify-center gap-2 text-orange-500">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Verifying...</span>
                    </div>
                  )}

                  {/* Error message */}
                  {errorMessage && !isVerifying && (
                    <div
                      role="alert"
                      aria-live="polite"
                      className="flex items-start gap-2 text-red-500 bg-red-500/10 p-3 rounded-lg"
                    >
                      {attemptsRemaining === 0 ? (
                        <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      )}
                      <span className="text-sm">{errorMessage}</span>
                    </div>
                  )}

                  {/* Manual verify button (shown when not auto-verifying) */}
                  {otpValue.length === 6 && !isVerifying && !successAnimation && (
                    <Button
                      onClick={handleVerifyOTP}
                      disabled={attemptsRemaining === 0}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      Verify Code
                    </Button>
                  )}

                  {/* Resend section */}
                  <div className="text-center pt-4 border-t border-gray-800">
                    <p className="text-gray-400 mb-3">
                      Didn't receive the code?
                    </p>
                    <Button
                      onClick={handleResendOTP}
                      disabled={cooldown > 0 || isResending || attemptsRemaining === 0}
                      variant="outline"
                      className={cn(
                        "border-gray-700 text-gray-300",
                        "hover:bg-gray-800 hover:text-white",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-all duration-200"
                      )}
                      aria-label={cooldown > 0 ? `Resend code in ${cooldown} seconds` : 'Resend verification code'}
                    >
                      {isResending ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {cooldown > 0
                        ? `Resend code (${cooldown}s)`
                        : 'Resend code'
                      }
                    </Button>
                  </div>

                  {/* Support message for locked accounts */}
                  {attemptsRemaining === 0 && (
                    <div className="text-center text-sm text-gray-500 mt-4">
                      <p>Account temporarily locked.</p>
                      <p>Please contact support for assistance.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Helper text */}
          {!successAnimation && attemptsRemaining > 0 && (
            <p className="text-center text-gray-500 text-xs mt-4">
              By verifying, you agree to our Terms and Privacy Policy
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <OTPVerificationContent />
    </Suspense>
  );
}