/**
 * Test utility for SMS service during development
 * This file provides test functions to verify SMS/OTP functionality
 */

import { sendSMS, sendOTPSMS, validateMobileFormat } from './sms';

/**
 * Test sending a basic SMS
 */
export async function testBasicSMS() {
  console.log('\n=== Testing Basic SMS ===');

  const testNumber = '+27823292438'; // Clickatell test number
  const testMessage = 'Test SMS from Bigg Buzz verification system';

  console.log('Sending to:', testNumber);
  console.log('Message:', testMessage);

  const result = await sendSMS({
    to: testNumber,
    message: testMessage,
    channel: 'sms'
  });

  if (result.success) {
    console.log('✅ SMS sent successfully');
    console.log('   Message ID:', result.messageId);
    console.log('   Channel:', result.channel);
  } else {
    console.error('❌ SMS failed:', result.error);
  }

  return result;
}

/**
 * Test sending OTP SMS
 */
export async function testOTPSMS() {
  console.log('\n=== Testing OTP SMS ===');

  const testNumber = '+27823292438'; // Clickatell test number
  const testOTP = '123456';

  console.log('Sending OTP to:', testNumber);
  console.log('OTP Code:', testOTP);

  const result = await sendOTPSMS(testNumber, testOTP);

  if (result.success) {
    console.log('✅ OTP SMS sent successfully');
    console.log('   Message ID:', result.messageId);
    console.log('   Channel:', result.channel);
  } else {
    console.error('❌ OTP SMS failed:', result.error);
  }

  return result;
}

/**
 * Test WhatsApp message sending
 */
export async function testWhatsApp() {
  console.log('\n=== Testing WhatsApp ===');

  const testNumber = '+27823292438'; // Clickatell test number
  const testMessage = 'Test WhatsApp message from Bigg Buzz';

  console.log('Sending to:', testNumber);
  console.log('Message:', testMessage);

  const result = await sendSMS({
    to: testNumber,
    message: testMessage,
    channel: 'whatsapp'
  });

  if (result.success) {
    console.log('✅ WhatsApp sent successfully');
    console.log('   Message ID:', result.messageId);
    console.log('   Channel:', result.channel);
  } else {
    console.error('❌ WhatsApp failed:', result.error);
  }

  return result;
}

/**
 * Test mobile number validation
 */
export function testMobileValidation() {
  console.log('\n=== Testing Mobile Number Validation ===');

  const testNumbers = [
    '+27823292438',     // Valid SA number
    '+27821234567',     // Valid SA number
    '+1234567890',      // Valid international
    '0823292438',       // Missing country code
    '+27',              // Too short
    '+2782329243812345', // Too long
    'not-a-number',     // Invalid format
  ];

  testNumbers.forEach(number => {
    const validated = validateMobileFormat(number);
    const isValid = validated !== null;
    console.log(`${isValid ? '✅' : '❌'} ${number.padEnd(20)} => ${validated || 'INVALID'}`);
  });
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('🧪 SMS Service Test Suite');
  console.log('=========================\n');

  // Test mobile validation
  testMobileValidation();

  // Test basic SMS
  await testBasicSMS();

  // Test OTP SMS
  await testOTPSMS();

  // Test WhatsApp
  await testWhatsApp();

  console.log('\n=========================');
  console.log('✅ All tests completed');
}

// Export for use in test scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testBasicSMS,
    testOTPSMS,
    testWhatsApp,
    testMobileValidation,
    runAllTests
  };
}