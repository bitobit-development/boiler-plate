"use server";

import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { subscriptionSchema } from "@/lib/validations/subscription";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";
import { deletePattern, CacheKeys } from "@/lib/cache";

export type SubscribeResult =
  | {
      success: true;
      subscriber: {
        name: string;
        email: string;
      };
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

    // 4. Insert new subscriber into database
    const [newSubscriber] = await db
      .insert(subscribers)
      .values({
        name: validatedData.name,
        surname: validatedData.surname,
        email: validatedData.email,
        mobile: validatedData.mobile,
        ageVerified: validatedData.ageVerified,
      })
      .returning({
        name: subscribers.name,
        email: subscribers.email,
      });

    // 5. Invalidate caches - new registration affects all cached data
    await Promise.all([
      deletePattern(CacheKeys.patterns.allRegistrations()),
      deletePattern(CacheKeys.patterns.allStats()),
      deletePattern(CacheKeys.patterns.allDashboard()),
    ]);
    console.log('[Cache INVALIDATE] New registration - cleared all caches');

    // 6. Return success with user data
    return {
      success: true,
      subscriber: newSubscriber,
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