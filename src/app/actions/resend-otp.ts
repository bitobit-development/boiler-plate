"use server";

import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateOTP, hashOTP, getOTPExpiration, canResendOTP } from "@/lib/otp";
import { sendOTPSMS } from "@/lib/services/sms";
import { resendOTPSchema } from "@/lib/validations/otp";
import { ZodError } from "zod";

export type ResendOTPResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
      cooldownSeconds?: number;
    };

export async function resendOtpAction(
  subscriberId: string
): Promise<ResendOTPResult> {
  try {
    // 1. Validate input
    const validatedData = resendOTPSchema.parse({ subscriberId });

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

    // 4. Check cooldown period
    const cooldownCheck = canResendOTP(subscriber.otpLastSentAt);
    if (!cooldownCheck.canSend) {
      return {
        success: false,
        error: `Please wait before requesting a new code.`,
        cooldownSeconds: cooldownCheck.remainingSeconds,
      };
    }

    // 5. Generate new OTP
    const otpCode = generateOTP();
    const hashedOTP = hashOTP(otpCode);
    const otpExpiration = getOTPExpiration();

    console.log(`Generated new OTP for ${subscriber.mobile}: ${otpCode}`);

    // 6. Send OTP via SMS
    const smsResult = await sendOTPSMS(subscriber.mobile, otpCode);

    if (!smsResult.success) {
      console.error('Failed to resend OTP SMS:', smsResult.error);
      return {
        success: false,
        error: "Failed to send verification code. Please try again later.",
      };
    }

    console.log(`OTP resent successfully via ${smsResult.channel}: ${smsResult.messageId}`);

    // 7. Update subscriber with new OTP
    await db
      .update(subscribers)
      .set({
        otpCode: hashedOTP,
        otpExpiresAt: otpExpiration,
        otpAttempts: 0, // Reset attempts
        otpLastSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscribers.id, validatedData.subscriberId));

    console.log(`OTP resent for ${subscriber.email}, attempts reset`);

    return {
      success: true,
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

    console.error("Resend OTP error:", error);
    return {
      success: false,
      error: "Failed to resend code. Please try again.",
    };
  }
}