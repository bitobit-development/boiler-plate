"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateOTP, hashOTP, verifyOTP, isOTPExpired, getOTPExpiration } from "@/lib/otp";
import { sendOTPSMS } from "@/lib/services/sms";
import { z } from "zod";

// ============================================================================
// Type Definitions
// ============================================================================

export type SendLoginOTPResult =
  | {
      success: true;
      subscriberId: string;
      message: string;
    }
  | {
      success: false;
      error: string;
    };

export type VerifyLoginOTPResult =
  | {
      success: true;
      subscriber: {
        id: string;
        name: string;
        email: string;
      };
    }
  | {
      success: false;
      error: string;
      attemptsRemaining?: number;
    };

// ============================================================================
// Validation Schemas
// ============================================================================

const loginMobileSchema = z.object({
  mobile: z.string()
    .min(10, "Mobile number too short")
    .max(20, "Mobile number too long")
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid mobile format"),
});

const otpVerificationSchema = z.object({
  subscriberId: z.string().uuid("Invalid subscriber ID"),
  otpCode: z.string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must be numeric"),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize mobile number to E.164 format
 * Ensures consistent format for database lookup
 */
function normalizeMobile(mobile: string): string {
  // Remove any whitespace or special characters except +
  let cleaned = mobile.trim().replace(/[^\d+]/g, '');

  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    cleaned = `+${cleaned}`;
  }

  return cleaned;
}

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Send OTP to existing member's mobile for login
 *
 * Flow:
 * 1. Validate mobile number format
 * 2. Check if mobile exists in subscribers table
 * 3. Verify subscriber is active (mobileVerified = true)
 * 4. Generate OTP and store hashed version
 * 5. Send OTP via SMS
 *
 * @param mobile - Mobile number (any format, will be normalized)
 * @returns SendLoginOTPResult with subscriberId on success
 */
export async function sendLoginOTP(mobile: string): Promise<SendLoginOTPResult> {
  try {
    // 1. Validate input
    const validatedData = loginMobileSchema.parse({ mobile });
    const normalizedMobile = normalizeMobile(validatedData.mobile);

    console.log(`[Member Login] OTP request for: ${normalizedMobile}`);

    // 2. Check if mobile exists in subscribers
    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.mobile, normalizedMobile))
      .limit(1);

    if (!subscriber) {
      console.log(`[Member Login] Mobile not found: ${normalizedMobile}`);
      return {
        success: false,
        error: "Mobile number not found. Please subscribe first.",
      };
    }

    // 3. Check if account is active
    if (!subscriber.mobileVerified || subscriber.status !== 'active') {
      console.log(`[Member Login] Inactive account: ${subscriber.email}`);
      return {
        success: false,
        error: "Account not active. Please complete subscription first.",
      };
    }

    // 4. Generate OTP
    const otpCode = generateOTP();
    const hashedOTP = hashOTP(otpCode);
    const expiresAt = getOTPExpiration();

    // 5. Store OTP in database
    await db
      .update(subscribers)
      .set({
        otpCode: hashedOTP,
        otpExpiresAt: expiresAt,
        otpAttempts: 0, // Reset attempts
        updatedAt: new Date(),
      })
      .where(eq(subscribers.id, subscriber.id));

    console.log(`[Member Login] OTP generated for ${subscriber.email}, expires at ${expiresAt.toISOString()}`);

    // 6. Send SMS
    const smsResult = await sendOTPSMS(normalizedMobile, otpCode);

    if (!smsResult.success) {
      console.error(`[Member Login] SMS failed for ${normalizedMobile}:`, smsResult.error);
      return {
        success: false,
        error: "Failed to send verification code. Please try again.",
      };
    }

    console.log(`[Member Login] OTP sent successfully to ${normalizedMobile} via ${smsResult.channel}`);

    return {
      success: true,
      subscriberId: subscriber.id,
      message: "Verification code sent to your mobile",
    };
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return {
        success: false,
        error: firstError.message,
      };
    }

    console.error("[Member Login] Send OTP error:", error);
    return {
      success: false,
      error: "Failed to send verification code. Please try again.",
    };
  }
}

/**
 * Verify OTP and log in member
 *
 * Flow:
 * 1. Validate subscriberId and OTP code
 * 2. Check OTP attempts limit (max 3)
 * 3. Check OTP expiration
 * 4. Verify OTP code
 * 5. Set authentication cookies (same as subscription flow)
 * 6. Clear OTP data
 *
 * @param subscriberId - Subscriber UUID
 * @param otpCode - 6-digit OTP code
 * @returns VerifyLoginOTPResult with subscriber info on success
 */
export async function verifyLoginOTP(
  subscriberId: string,
  otpCode: string
): Promise<VerifyLoginOTPResult> {
  try {
    // 1. Validate input
    const validatedData = otpVerificationSchema.parse({
      subscriberId,
      otpCode,
    });

    console.log(`[Member Login] OTP verification for subscriber: ${subscriberId}`);

    // 2. Find subscriber
    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.id, validatedData.subscriberId))
      .limit(1);

    if (!subscriber) {
      console.log(`[Member Login] Subscriber not found: ${subscriberId}`);
      return {
        success: false,
        error: "Invalid session. Please start over.",
      };
    }

    // 3. Check attempts limit
    const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS || '3');
    if (subscriber.otpAttempts >= maxAttempts) {
      console.log(`[Member Login] Max attempts exceeded for ${subscriber.email}`);
      return {
        success: false,
        error: "Too many failed attempts. Please request a new code.",
        attemptsRemaining: 0,
      };
    }

    // 4. Check expiration
    if (!subscriber.otpExpiresAt || isOTPExpired(subscriber.otpExpiresAt)) {
      console.log(`[Member Login] OTP expired for ${subscriber.email}`);
      return {
        success: false,
        error: "Code expired. Please request a new code.",
      };
    }

    // 5. Verify OTP
    if (!subscriber.otpCode || !verifyOTP(validatedData.otpCode, subscriber.otpCode)) {
      // Increment attempt counter
      const newAttempts = subscriber.otpAttempts + 1;
      await db
        .update(subscribers)
        .set({
          otpAttempts: newAttempts,
          updatedAt: new Date(),
        })
        .where(eq(subscribers.id, validatedData.subscriberId));

      const remaining = maxAttempts - newAttempts;

      console.log(`[Member Login] Invalid OTP for ${subscriber.email}. Attempts: ${newAttempts}/${maxAttempts}`);

      return {
        success: false,
        error: remaining > 0
          ? "Invalid code. Please try again."
          : "Too many failed attempts. Please request a new code.",
        attemptsRemaining: remaining,
      };
    }

    // 6. SUCCESS: Clear OTP data
    await db
      .update(subscribers)
      .set({
        otpCode: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        updatedAt: new Date(),
      })
      .where(eq(subscribers.id, validatedData.subscriberId));

    console.log(`[Member Login] OTP verified successfully for ${subscriber.email}`);

    // 7. Set authentication cookies (SAME as subscription flow in verify-otp.ts)
    const cookieStore = await cookies();

    // Set subscriber_id cookie (30 days) - this is what makes isMember = true
    cookieStore.set('subscriber_id', subscriber.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    console.log(`[Member Login] Cookies set for subscriber: ${subscriber.id}`);

    return {
      success: true,
      subscriber: {
        id: subscriber.id,
        name: subscriber.name,
        email: subscriber.email,
      },
    };
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return {
        success: false,
        error: firstError.message,
      };
    }

    console.error("[Member Login] Verify OTP error:", error);
    return {
      success: false,
      error: "Verification failed. Please try again.",
    };
  }
}
