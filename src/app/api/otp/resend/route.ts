import { NextRequest, NextResponse } from "next/server";
import { resendOtpAction } from "@/app/actions/resend-otp";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriberId } = body;

    if (!subscriberId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing subscriber ID"
        },
        { status: 400 }
      );
    }

    const result = await resendOtpAction(subscriberId);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    }

    // Handle cooldown with 429 status (Too Many Requests)
    const statusCode = result.cooldownSeconds ? 429 : 400;
    return NextResponse.json(result, { status: statusCode });
  } catch (error) {
    console.error("Resend OTP API error:", error);

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