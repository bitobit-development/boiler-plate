"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyOTP, isOTPExpired } from "@/lib/otp";
import { deletePattern, CacheKeys } from "@/lib/cache";
import { otpVerificationSchema } from "@/lib/validations/otp";
import { ZodError } from "zod";

export type VerifyOTPResult =
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

export async function verifyOtpAction(
  subscriberId: string,
  otpCode: string
): Promise<VerifyOTPResult> {
  try {
    // 1. Validate input
    const validatedData = otpVerificationSchema.parse({
      subscriberId,
      otpCode,
    });

    // 2. Find subscriber
    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.id, validatedData.subscriberId))
      .limit(1);

    if (!subscriber) {
      return {
        success: false,
        error: "Invalid verification session. Please start over.",
      };
    }

    // 3. Check if already verified
    if (subscriber.mobileVerified) {
      return {
        success: false,
        error: "Mobile number already verified.",
      };
    }

    // 4. Check attempts limit
    const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS || '3');
    if (subscriber.otpAttempts >= maxAttempts) {
      return {
        success: false,
        error: "Too many failed attempts. Please request a new verification code.",
        attemptsRemaining: 0,
      };
    }

    // 5. Check expiration
    if (!subscriber.otpExpiresAt || isOTPExpired(subscriber.otpExpiresAt)) {
      return {
        success: false,
        error: "Verification code has expired. Please request a new code.",
      };
    }

    // 6. Verify OTP
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

      console.log(`Invalid OTP attempt for ${subscriber.email}. Attempts: ${newAttempts}/${maxAttempts}`);

      return {
        success: false,
        error: remaining > 0
          ? "Invalid verification code. Please try again."
          : "Too many failed attempts. Please request a new code.",
        attemptsRemaining: remaining,
      };
    }

    // 7. SUCCESS: Update subscriber as verified
    const [updatedSubscriber] = await db
      .update(subscribers)
      .set({
        mobileVerified: true, // Mark as verified
        status: 'active', // Activate subscriber
        verifiedAt: new Date(), // Set verification timestamp
        otpCode: null, // Clear OTP data
        otpExpiresAt: null,
        otpAttempts: 0,
        updatedAt: new Date(),
      })
      .where(eq(subscribers.id, validatedData.subscriberId))
      .returning({
        id: subscribers.id,
        name: subscribers.name,
        email: subscribers.email,
      });

    console.log(`Mobile verified successfully for ${updatedSubscriber.email}`);

    // 8. Set cookies for authenticated session
    const cookieStore = await cookies();

    // Set subscriber_id cookie (30 days)
    cookieStore.set('subscriber_id', updatedSubscriber.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    // Set just_subscribed flag (10 minutes) for first-time notification
    cookieStore.set('just_subscribed', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    console.log(`Cookies set for subscriber: ${updatedSubscriber.id}`);

    // 9. Invalidate caches
    await Promise.all([
      deletePattern(CacheKeys.patterns.allRegistrations()),
      deletePattern(CacheKeys.patterns.allStats()),
      deletePattern(CacheKeys.patterns.allDashboard()),
    ]);
    console.log('[Cache INVALIDATE] Mobile verified - cleared all caches');

    return {
      success: true,
      subscriber: updatedSubscriber,
    };
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const firstError = error.issues[0];
      return {
        success: false,
        error: firstError.message,
      };
    }

    console.error("OTP verification error:", error);
    return {
      success: false,
      error: "Verification failed. Please try again.",
    };
  }
}