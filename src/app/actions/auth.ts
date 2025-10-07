"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// ============================================================================
// Type Definitions
// ============================================================================

export type LogoutResult =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      error: string;
    };

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Logout member by clearing authentication cookies
 *
 * Flow:
 * 1. Clear subscriber_id cookie
 * 2. Clear any other auth-related cookies
 * 3. Return success
 *
 * @returns LogoutResult
 */
export async function logoutMember(): Promise<LogoutResult> {
  try {
    const cookieStore = await cookies();

    // Clear all authentication cookies
    cookieStore.delete("subscriber_id");
    cookieStore.delete("access_token");
    cookieStore.delete("just_subscribed");

    console.log("[Auth] Member logged out successfully");

    return {
      success: true,
      message: "Logged out successfully",
    };
  } catch (error) {
    console.error("[Auth] Logout error:", error);
    return {
      success: false,
      error: "Failed to logout. Please try again.",
    };
  }
}
