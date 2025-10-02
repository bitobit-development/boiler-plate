"use server";

import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { subscriptionSchema } from "@/lib/validations/subscription";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";
import { deletePattern, CacheKeys } from "@/lib/cache";
import { generateOTP, hashOTP, getOTPExpiration } from "@/lib/otp";
import { sendOTPSMS } from "@/lib/services/sms";

// Helper to mask phone number for display
function maskPhoneNumber(phone: string): string {
  // Keep first 3 and last 4 digits, mask the rest
  if (phone.length <= 7) return phone;
  const firstPart = phone.substring(0, 3);
  const lastPart = phone.substring(phone.length - 4);
  return `${firstPart}***${lastPart}`;
}

export type SubscribeResult =
  | {
      success: true;
      subscriberId: string; // Changed: return ID for OTP verification
      maskedPhone?: string; // Masked phone for display
    }
  | {
      success: false;
      error: string;
      field?: string;
    };

export async function subscribeAction(
  formData: unknown
): Promise<SubscribeResult> {
  try {
    // 1. Validate input data with Zod
    const validatedData = subscriptionSchema.parse(formData);

    // 2. Check for duplicate email
    const existingEmail = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, validatedData.email))
      .limit(1);

    if (existingEmail.length > 0) {
      return {
        success: false,
        error: "This email is already subscribed to Bigg Buzz",
        field: "email",
      };
    }

    // 3. Check for duplicate mobile
    const existingMobile = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.mobile, validatedData.mobile))
      .limit(1);

    if (existingMobile.length > 0) {
      return {
        success: false,
        error: "This mobile number is already subscribed to Bigg Buzz",
        field: "mobile",
      };
    }

    // 4. Generate OTP for mobile verification
    const otpCode = generateOTP();
    const hashedOTP = hashOTP(otpCode);
    const otpExpiration = getOTPExpiration();

    console.log(`Generated OTP for ${validatedData.mobile}: ${otpCode}`);

    // 5. Send OTP via SMS
    const smsResult = await sendOTPSMS(validatedData.mobile, otpCode);

    if (!smsResult.success) {
      console.error('Failed to send OTP SMS:', smsResult.error);
      return {
        success: false,
        error: "Failed to send verification code. Please check your mobile number and try again.",
        field: "mobile",
      };
    }

    console.log(`OTP SMS sent successfully via ${smsResult.channel}: ${smsResult.messageId}`);

    // 6. Insert new subscriber with PENDING status and OTP data
    const [newSubscriber] = await db
      .insert(subscribers)
      .values({
        name: validatedData.name,
        surname: validatedData.surname,
        email: validatedData.email,
        mobile: validatedData.mobile,
        ageVerified: validatedData.ageVerified,
        status: 'pending', // Wait for OTP verification
        mobileVerified: false, // Not verified yet
        otpCode: hashedOTP,
        otpExpiresAt: otpExpiration,
        otpAttempts: 0,
        otpLastSentAt: new Date(),
      })
      .returning({
        id: subscribers.id,
      });

    // 7. Invalidate caches - new registration affects all cached data
    await Promise.all([
      deletePattern(CacheKeys.patterns.allRegistrations()),
      deletePattern(CacheKeys.patterns.allStats()),
      deletePattern(CacheKeys.patterns.allDashboard()),
    ]);
    console.log('[Cache INVALIDATE] New registration - cleared all caches');

    // 8. Return success with subscriber ID for OTP verification
    return {
      success: true,
      subscriberId: newSubscriber.id,
      maskedPhone: maskPhoneNumber(validatedData.mobile),
    };
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const issues = error.issues;
      if (issues && issues.length > 0) {
        const firstError = issues[0];
        return {
          success: false,
          error: firstError.message,
          field: firstError.path[0]?.toString(),
        };
      }
    }

    // Handle database errors (connection issues, etc.)
    console.error("Database error:", error);
    return {
      success: false,
      error: "Something went wrong. Please try again later.",
    };
  }
}