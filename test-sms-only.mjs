#!/usr/bin/env node

/**
 * Direct SMS test using Clickatell API
 * Usage: node test-sms-only.mjs
 */

const CLICKATELL_API_KEY = 'kGvdfOdLShuu9BZJ5U_Lvg==';
const CLICKATELL_API_URL = 'https://platform.clickatell.com/v1/message';
const TEST_NUMBER = '27823292438'; // Without + prefix for Clickatell

async function testSMS() {
  console.log('🧪 Testing Clickatell SMS API directly');
  console.log('=======================================\n');

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const message = `Your Bigg Buzz verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.`;

  console.log('📱 Sending to:', TEST_NUMBER);
  console.log('📝 OTP Code:', otpCode);
  console.log('💬 Message:', message);
  console.log('\n');

  try {
    // Test SMS channel
    console.log('1. Testing SMS channel...');
    const smsResponse = await fetch(CLICKATELL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': CLICKATELL_API_KEY,
      },
      body: JSON.stringify({
        messages: [{
          channel: 'sms',
          to: TEST_NUMBER,
          content: message
        }]
      }),
    });

    const smsData = await smsResponse.json();
    console.log('SMS Response:', JSON.stringify(smsData, null, 2));

    if (smsData.messages?.[0]?.accepted) {
      console.log('✅ SMS sent successfully!');
      console.log('   Message ID:', smsData.messages[0].apiMessageId);
    } else {
      console.log('❌ SMS failed:', smsData.messages?.[0]?.error || smsData.error);
    }

    // Test WhatsApp channel
    console.log('\n2. Testing WhatsApp channel...');
    const whatsappResponse = await fetch(CLICKATELL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': CLICKATELL_API_KEY,
      },
      body: JSON.stringify({
        messages: [{
          channel: 'whatsapp',
          to: TEST_NUMBER,
          content: message
        }]
      }),
    });

    const whatsappData = await whatsappResponse.json();
    console.log('WhatsApp Response:', JSON.stringify(whatsappData, null, 2));

    if (whatsappData.messages?.[0]?.accepted) {
      console.log('✅ WhatsApp sent successfully!');
      console.log('   Message ID:', whatsappData.messages[0].apiMessageId);
    } else {
      console.log('❌ WhatsApp failed:', whatsappData.messages?.[0]?.error || whatsappData.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n=======================================');
  console.log('📊 Test completed');
}

// Run test
testSMS().then(() => process.exit(0)).catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});