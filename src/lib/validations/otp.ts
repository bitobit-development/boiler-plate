import { z } from "zod";

/**
 * Schema for OTP verification request
 */
export const otpVerificationSchema = z.object({
  subscriberId: z.string().uuid("Invalid verification session"),
  otpCode: z
    .string()
    .length(6, "Verification code must be exactly 6 digits")
    .regex(/^\d{6}$/, "Verification code must contain only numbers"),
});

/**
 * Schema for resend OTP request
 */
export const resendOTPSchema = z.object({
  subscriberId: z.string().uuid("Invalid verification session"),
});

/**
 * Type definitions
 */
export type OTPVerificationData = z.infer<typeof otpVerificationSchema>;
export type ResendOTPData = z.infer<typeof resendOTPSchema>;