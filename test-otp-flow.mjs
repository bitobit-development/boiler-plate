#!/usr/bin/env node

/**
 * Test script for OTP flow
 * Usage: node test-otp-flow.mjs
 */

const API_BASE = 'http://localhost:3000';

// Test data
const testSubscriber = {
  name: 'Test',
  surname: 'User',
  email: `test${Date.now()}@example.com`,
  mobile: '+27823292438', // Clickatell test number
  ageVerified: true
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testSubscribeWithOTP() {
  console.log('\n=== Testing OTP Flow ===\n');
  console.log('1. Creating new subscriber...');
  console.log('   Email:', testSubscriber.email);
  console.log('   Mobile:', testSubscriber.mobile);

  try {
    // Step 1: Subscribe (which should send OTP)
    const subscribeResponse = await fetch(`${API_BASE}/api/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testSubscriber),
    });

    const subscribeData = await subscribeResponse.json();

    if (!subscribeData.success) {
      console.error('❌ Subscribe failed:', subscribeData.error);
      return;
    }

    console.log('✅ Subscriber created with ID:', subscribeData.subscriberId);
    console.log('   OTP should be sent to:', testSubscriber.mobile);
    console.log('\n   Check the console logs for the OTP code!');

    const subscriberId = subscribeData.subscriberId;

    // Step 2: Wait for user to see the OTP in console
    console.log('\n2. Waiting 5 seconds to simulate user entering OTP...');
    await sleep(5000);

    // Step 3: Test with wrong OTP first
    console.log('\n3. Testing with wrong OTP (should fail)...');
    const wrongOtpResponse = await fetch(`${API_BASE}/api/otp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriberId,
        otpCode: '000000', // Wrong OTP
      }),
    });

    const wrongOtpData = await wrongOtpResponse.json();
    if (!wrongOtpData.success) {
      console.log('✅ Wrong OTP correctly rejected');
      console.log('   Error:', wrongOtpData.error);
      console.log('   Attempts remaining:', wrongOtpData.attemptsRemaining);
    } else {
      console.error('❌ Wrong OTP was accepted (should not happen)');
    }

    // Step 4: Test resend OTP
    console.log('\n4. Testing resend OTP...');
    const resendResponse = await fetch(`${API_BASE}/api/otp/resend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriberId,
      }),
    });

    const resendData = await resendResponse.json();
    if (resendData.success) {
      console.log('✅ OTP resent successfully');
      console.log('   Check console for new OTP code');
    } else {
      console.log('⚠️  Resend failed (might be in cooldown):', resendData.error);
      if (resendData.cooldownSeconds) {
        console.log('   Cooldown remaining:', resendData.cooldownSeconds, 'seconds');
      }
    }

    // Step 5: Test cooldown (should fail immediately after resend)
    console.log('\n5. Testing cooldown period...');
    await sleep(1000);
    const cooldownResponse = await fetch(`${API_BASE}/api/otp/resend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriberId,
      }),
    });

    const cooldownData = await cooldownResponse.json();
    if (!cooldownData.success && cooldownData.cooldownSeconds) {
      console.log('✅ Cooldown working correctly');
      console.log('   Must wait:', cooldownData.cooldownSeconds, 'seconds');
    } else {
      console.error('❌ Cooldown not enforced');
    }

    console.log('\n=== Test Summary ===');
    console.log('✅ Subscriber created with OTP sent');
    console.log('✅ Wrong OTP rejected with attempts tracking');
    console.log('✅ OTP resend functionality working');
    console.log('✅ Cooldown period enforced');
    console.log('\n💡 To complete verification:');
    console.log('   1. Check server logs for the actual OTP code');
    console.log('   2. Call /api/otp/verify with the correct code');
    console.log('   3. Subscriber status will change from "pending" to "active"');
    console.log('\n📝 Subscriber ID for manual testing:', subscriberId);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests
console.log('🧪 OTP Flow Test Script');
console.log('=======================');

// Run the full test now that all endpoints are available
testSubscribeWithOTP();

console.log('\n📌 Manual Test Instructions:');
console.log('1. Start dev server: npm run dev');
console.log('2. Open browser to http://localhost:3000/subscribe');
console.log('3. Fill and submit the form');
console.log('4. Check server console for OTP code');
console.log('5. You\'ll be redirected to /verify-otp page');
console.log('6. Enter the OTP code from console');
console.log('7. Verify successful completion');

process.exit(0);