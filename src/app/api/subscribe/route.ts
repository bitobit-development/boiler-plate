import { NextRequest, NextResponse } from "next/server";
import { subscribeAction } from "@/app/actions/subscribe";
import { ZodError } from "zod";

/**
 * API endpoint wrapper for the subscribe Server Action
 * This endpoint now triggers OTP sending for mobile verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Call the Server Action which handles OTP generation and sending
    const result = await subscribeAction(body);

    if (result.success) {
      // Return subscriberId for OTP verification step
      return NextResponse.json(result, { status: 201 }); // 201 Created
    }

    // Return error response with field-specific errors if available
    return NextResponse.json(result, { status: 400 });
  } catch (error) {
    console.error("Subscribe API error:", error);

    if (error instanceof ZodError) {
      const firstError = error.issues[0];
      return NextResponse.json(
        {
          success: false,
          error: firstError.message,
          field: firstError.path[0]?.toString(),
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error"
      },
      { status: 500 }
    );
  }
}