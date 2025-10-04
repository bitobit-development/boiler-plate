'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Loader2, Phone, RefreshCw, Shield, AlertCircle, Clock } from 'lucide-react';
import { verifyCustomerOTP, initiateCustomerOTP } from '@/app/actions/pos-customer';
import { Subscriber } from '@/lib/db/schema';
import { toast } from 'sonner';

interface OTPActivationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Subscriber | null;
  onSuccess: (customer: Subscriber) => void;
  onOverride: () => void;
}

export function OTPActivationDialog({
  open,
  onOpenChange,
  customer,
  onSuccess,
  onOverride
}: OTPActivationDialogProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [canResendIn, setCanResendIn] = useState(0);
  const [expiresIn, setExpiresIn] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Send OTP when dialog opens
  useEffect(() => {
    if (open && customer) {
      sendOTP();
    }
  }, [open, customer?.id]);

  // Countdown timer for resend
  useEffect(() => {
    if (canResendIn > 0) {
      const timer = setTimeout(() => setCanResendIn(canResendIn - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [canResendIn]);

  // Countdown timer for expiry
  useEffect(() => {
    if (expiresIn > 0) {
      const timer = setTimeout(() => setExpiresIn(expiresIn - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [expiresIn]);

  const sendOTP = async () => {
    if (!customer) return;

    setIsSending(true);
    setError('');

    try {
      const result = await initiateCustomerOTP(customer.id);

      if (result.success) {
        toast.success(result.message);
        setCanResendIn(result.canResendAfter || 60);
        setExpiresIn(result.expiresIn || 600);
      } else {
        setError(result.message);
        if (result.canResendAfter) {
          setCanResendIn(result.canResendAfter);
        }
      }
    } catch (error) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const digits = pastedData.replace(/\D/g, '').split('');

    const newOtp = [...otp];
    digits.forEach((digit, index) => {
      if (index < 6) {
        newOtp[index] = digit;
      }
    });
    setOtp(newOtp);

    // Focus last filled input or last input
    const lastFilledIndex = Math.min(digits.length - 1, 5);
    inputRefs.current[lastFilledIndex]?.focus();
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6 || !customer) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const result = await verifyCustomerOTP(customer.id, otpCode);

      if (result.success && result.customer) {
        toast.success(result.message);
        onSuccess(result.customer);
        onOpenChange(false);
        setOtp(['', '', '', '', '', '']);
      } else {
        setError(result.message);
        if (result.attemptsRemaining === 0) {
          // Reset OTP inputs if no attempts remaining
          setOtp(['', '', '', '', '', '']);
        }
      }
    } catch (error) {
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-green-400" />
            OTP Verification
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {customer && (
              <>
                We've sent a 6-digit code to{' '}
                <span className="font-medium text-slate-300">{customer.mobile}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* OTP Input Fields */}
          <div className="flex justify-center gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={cn(
                  'pos-otp-input',
                  'w-12 h-14 text-center text-xl font-bold',
                  'bg-slate-800 border-2 border-slate-600 text-white',
                  'focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/20',
                  'transition-all duration-200'
                )}
                autoFocus={index === 0}
              />
            ))}
          </div>

          {/* Timer */}
          {expiresIn > 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <Clock className="w-4 h-4" />
              <span>Code expires in {formatTime(expiresIn)}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <Alert className="bg-red-950/50 border-red-900 text-red-400">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Resend Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={sendOTP}
              disabled={isSending || canResendIn > 0}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : canResendIn > 0 ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend in {canResendIn}s
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend OTP
                </>
              )}
            </Button>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onOverride}
            className="flex-1 border-yellow-800 text-yellow-400 hover:bg-yellow-950/50"
          >
            <Shield className="w-4 h-4 mr-2" />
            Override OTP
          </Button>
          <Button
            onClick={handleVerify}
            disabled={isVerifying || otp.some(d => !d)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Code'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}