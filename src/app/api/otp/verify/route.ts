import { NextRequest, NextResponse } from "next/server";
import { verifyOtpAction } from "@/app/actions/verify-otp";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriberId, otpCode } = body;

    if (!subscriberId || !otpCode) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields"
        },
        { status: 400 }
      );
    }

    const result = await verifyOtpAction(subscriberId, otpCode);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    }

    // Handle failed verification with appropriate status codes
    const statusCode = result.attemptsRemaining === 0 ? 429 : 400; // 429 for rate limiting
    return NextResponse.json(result, { status: statusCode });
  } catch (error) {
    console.error("OTP verification API error:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
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