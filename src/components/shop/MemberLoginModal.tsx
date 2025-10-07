"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import {
  User,
  UserPlus,
  Lock,
  Smartphone,
  CheckCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { sendLoginOTP, verifyLoginOTP } from "@/app/actions/member-login";

// ============================================================================
// Types
// ============================================================================

type LoginStep = "choice" | "mobile" | "otp" | "success";

interface MemberLoginModalProps {
  open: boolean;
  onClose: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function MemberLoginModal({ open, onClose }: MemberLoginModalProps) {
  const router = useRouter();

  // State
  const [step, setStep] = useState<LoginStep>("choice");
  const [mobile, setMobile] = useState(""); // Full E.164 format from PhoneInput
  const [otp, setOtp] = useState("");
  const [subscriberId, setSubscriberId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | undefined>();

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleClose = () => {
    // Reset state when closing
    setStep("choice");
    setMobile("");
    setOtp("");
    setSubscriberId("");
    setError("");
    setAttemptsRemaining(undefined);
    onClose();
  };

  const handleSendOTP = async () => {
    if (!mobile) {
      setError("Please enter your mobile number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // PhoneInput already returns E.164 format (e.g., +27821234567)
      const result = await sendLoginOTP(mobile);

      if (result.success) {
        setSubscriberId(result.subscriberId);
        setStep("otp");
        toast.success(result.message);
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    } catch (err) {
      const errorMessage = "An error occurred. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await verifyLoginOTP(subscriberId, otp);

      if (result.success) {
        setStep("success");
        toast.success("Login successful!");

        // Reload page after 1 second to show updated prices
        setTimeout(() => {
          router.refresh();
          handleClose();
        }, 1000);
      } else {
        setError(result.error);
        setAttemptsRemaining(result.attemptsRemaining);
        toast.error(result.error);
      }
    } catch (err) {
      const errorMessage = "Verification failed. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribeRedirect = () => {
    router.push("/subscribe");
    handleClose();
  };

  const handleBack = () => {
    if (step === "otp") {
      setStep("mobile");
      setOtp("");
      setError("");
    } else if (step === "mobile") {
      setStep("choice");
      setMobile("");
      setError("");
    }
  };

  // ============================================================================
  // Render Steps
  // ============================================================================

  // Step 1: Choice (Login or Subscribe)
  if (step === "choice") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Lock className="h-5 w-5 text-amber-500" />
              Access Member Pricing
            </DialogTitle>
            <DialogDescription>
              Login to see exclusive member prices or subscribe to join
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {/* Login Button */}
            <Button
              onClick={() => setStep("mobile")}
              className="w-full h-12 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500"
              size="lg"
            >
              <User className="mr-2 h-5 w-5" />
              Already a Member? Login
            </Button>

            {/* Subscribe Button */}
            <Button
              onClick={handleSubscribeRedirect}
              variant="outline"
              className="w-full h-12 border-amber-500/30 hover:bg-amber-500/10"
              size="lg"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              New Here? Subscribe Now
            </Button>
          </div>

          {/* Benefits Teaser */}
          <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
            <p className="text-sm text-zinc-300 text-center">
              Members save <span className="text-amber-400 font-bold">20%</span> on all products
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 2: Mobile Number Input
  if (step === "mobile") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Smartphone className="h-5 w-5 text-emerald-500" />
              Enter Your Mobile Number
            </DialogTitle>
            <DialogDescription>
              We'll send you a verification code
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Phone Input */}
            <PhoneInput
              value={mobile}
              onChange={setMobile}
              defaultCountry="ZA"
              placeholder="Enter phone number"
            />

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleBack}
                variant="outline"
                className="w-24"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleSendOTP}
                disabled={loading || !mobile}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Code"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 3: OTP Verification
  if (step === "otp") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Lock className="h-5 w-5 text-emerald-500" />
              Enter Verification Code
            </DialogTitle>
            <DialogDescription>
              Code sent to {mobile}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* OTP Input */}
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => {
                  setOtp(value);
                  setError("");
                }}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-sm text-red-400">{error}</p>
                {attemptsRemaining !== undefined && attemptsRemaining > 0 && (
                  <p className="text-xs text-red-300 mt-1">
                    {attemptsRemaining} {attemptsRemaining === 1 ? "attempt" : "attempts"} remaining
                  </p>
                )}
              </div>
            )}

            {/* Resend Link */}
            <div className="text-center">
              <button
                onClick={handleSendOTP}
                disabled={loading}
                className="text-sm text-emerald-400 hover:text-emerald-300 underline"
              >
                Didn't receive code? Resend
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleBack}
                variant="outline"
                className="w-24"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleVerifyOTP}
                disabled={loading || otp.length !== 6}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Login"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 4: Success
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <div className="text-center space-y-6 py-8">
          <div className="flex justify-center">
            <div className="relative">
              <CheckCircle className="h-20 w-20 text-emerald-500" />
              <div className="absolute inset-0 animate-ping">
                <CheckCircle className="h-20 w-20 text-emerald-500 opacity-20" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <DialogTitle className="text-2xl">Login Successful!</DialogTitle>
            <DialogDescription className="text-base">
              Redirecting to member pricing...
            </DialogDescription>
          </div>

          <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-500" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
