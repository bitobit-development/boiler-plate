#!/usr/bin/env tsx

import { sendLoginOTP } from "../src/app/actions/member-login";

async function testMemberLogin() {
  console.log("🧪 Testing Member Login with Israeli Number");
  console.log("=" .repeat(60));

  const israeliNumber = "+972505489909";

  console.log(`\n📱 Testing login with: ${israeliNumber}`);
  console.log(`   (Haim Derazon - Israeli subscriber)\n`);

  try {
    const result = await sendLoginOTP(israeliNumber);

    if (result.success) {
      console.log("✅ SUCCESS - OTP Sent!");
      console.log(`   Subscriber ID: ${result.subscriberId}`);
      console.log(`   Message: ${result.message}`);
      console.log("\n📧 Check your phone for the OTP code");
      console.log("   The SMS should arrive within 1-2 minutes");
    } else {
      console.log("❌ FAILED");
      console.log(`   Error: ${result.error}`);
    }

  } catch (error) {
    console.error("\n❌ EXCEPTION occurred:");
    console.error(error);
  }

  console.log("\n" + "=".repeat(60));
}

testMemberLogin();
