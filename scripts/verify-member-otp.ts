#!/usr/bin/env tsx

import { verifyLoginOTP } from "../src/app/actions/member-login";

async function verifyMemberOTP() {
  console.log("🔐 Testing OTP Verification");
  console.log("=" .repeat(60));

  const subscriberId = "3eaaef2c-cdaf-4d3e-85b5-aa389c72e459";
  const otpCode = process.argv[2] || "364235";

  console.log(`\n📱 Verifying OTP for subscriber: ${subscriberId}`);
  console.log(`   OTP Code: ${otpCode}\n`);

  try {
    const result = await verifyLoginOTP(subscriberId, otpCode);

    if (result.success) {
      console.log("✅ SUCCESS - OTP Verified!");
      console.log(`   Subscriber: ${result.subscriber.name}`);
      console.log(`   Email: ${result.subscriber.email}`);
      console.log(`   ID: ${result.subscriber.id}`);
      console.log("\n🎉 Login successful! Cookies would be set in browser.");
    } else {
      console.log("❌ FAILED");
      console.log(`   Error: ${result.error}`);
      if (result.attemptsRemaining !== undefined) {
        console.log(`   Attempts remaining: ${result.attemptsRemaining}`);
      }
    }

  } catch (error) {
    console.error("\n❌ EXCEPTION occurred:");
    console.error(error);
  }

  console.log("\n" + "=".repeat(60));
}

verifyMemberOTP();
