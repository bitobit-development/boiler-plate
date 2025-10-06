"use server";

import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { subscriptionSchema } from "@/lib/validations/subscription";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";
import { deletePattern, CacheKeys } from "@/lib/cache";
import { generateOTP, hashOTP, getOTPExpiration } from "@/lib/otp";
import { sendOTPSMS } from "@/lib/services/sms";
import { validateAndFormatPhone } from "@/lib/utils/phone-validation";

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

    // 2. Validate and format phone number to E.164 (additional validation layer)
    // This ensures the phone number is in the correct format regardless of input
    // The mobile field from validatedData is already in E.164 format (e.g., "+972505489909")
    // We extract the country code and validate with libphonenumber-js
    const mobileWithCountryCode = validatedData.mobile;

    // Extract country code from the E.164 number
    const countryCodeMatch = mobileWithCountryCode.match(/^(\+\d{1,3})/);
    if (!countryCodeMatch) {
      return {
        success: false,
        error: "Invalid phone number format. Please select a country code and enter your number.",
        field: "mobile",
      };
    }

    const countryCode = countryCodeMatch[1];
    const phoneWithoutCountryCode = mobileWithCountryCode.substring(countryCode.length);

    // Validate using libphonenumber-js to ensure correct E.164 format
    const phoneValidation = validateAndFormatPhone(phoneWithoutCountryCode, countryCode);

    if (!phoneValidation.isValid) {
      return {
        success: false,
        error: phoneValidation.error || "Please enter a valid phone number for the selected country",
        field: "mobile",
      };
    }

    // Use the validated E.164 format from libphonenumber-js
    const validatedMobile = phoneValidation.e164!;

    console.log(`Phone validation: Input="${mobileWithCountryCode}" → E.164="${validatedMobile}"`);

    // 3. Check for duplicate email
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

    // 4. Check for duplicate mobile
    const existingMobile = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.mobile, validatedMobile))
      .limit(1);

    if (existingMobile.length > 0) {
      return {
        success: false,
        error: "This mobile number is already subscribed to Bigg Buzz",
        field: "mobile",
      };
    }

    // 5. Generate OTP for mobile verification
    const otpCode = generateOTP();
    const hashedOTP = hashOTP(otpCode);
    const otpExpiration = getOTPExpiration();

    console.log(`Generated OTP for ${validatedMobile}: ${otpCode}`);

    // 6. Send OTP via SMS (using validated E.164 format)
    const smsResult = await sendOTPSMS(validatedMobile, otpCode);

    if (!smsResult.success) {
      console.error('Failed to send OTP SMS:', smsResult.error);
      return {
        success: false,
        error: "Failed to send verification code. Please check your mobile number and try again.",
        field: "mobile",
      };
    }

    console.log(`OTP SMS sent successfully via ${smsResult.channel}: ${smsResult.messageId}`);

    // 7. Insert new subscriber with PENDING status and OTP data (using validated E.164 format)
    const [newSubscriber] = await db
      .insert(subscribers)
      .values({
        name: validatedData.name,
        surname: validatedData.surname,
        email: validatedData.email,
        mobile: validatedMobile, // Use validated E.164 format
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

    // 8. Invalidate caches - new registration affects all cached data
    await Promise.all([
      deletePattern(CacheKeys.patterns.allRegistrations()),
      deletePattern(CacheKeys.patterns.allStats()),
      deletePattern(CacheKeys.patterns.allDashboard()),
    ]);
    console.log('[Cache INVALIDATE] New registration - cleared all caches');

    // 9. Return success with subscriber ID for OTP verification
    return {
      success: true,
      subscriberId: newSubscriber.id,
      maskedPhone: maskPhoneNumber(validatedMobile), // Use validated format for display
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