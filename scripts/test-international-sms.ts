#!/usr/bin/env npx tsx
/**
 * Test script for sending SMS to international numbers via Clickatell API
 * Usage: npx tsx scripts/test-international-sms.ts [phone_number] [message]
 * Example: npx tsx scripts/test-international-sms.ts +972505489909 "Test message"
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { sendSMS } from '../src/lib/services/sms';

async function testInternationalSMS() {
  // Get phone number and message from command line args or use defaults
  const phoneNumber = process.argv[2] || '+972505489909'; // Israeli number
  const message = process.argv[3] || `Test SMS from Bigg Buzz at ${new Date().toLocaleString()}`;

  console.log('====================================');
  console.log('International SMS Test');
  console.log('====================================');
  console.log(`Target Number: ${phoneNumber}`);
  console.log(`Message: ${message}`);
  console.log('------------------------------------');

  try {
    console.log('Sending SMS via Clickatell API...');

    const result = await sendSMS({
      to: phoneNumber,
      message: message,
      channel: 'sms'
    });

    if (result.success) {
      console.log('\n✅ SMS sent successfully!');
      console.log(`Message ID: ${result.messageId}`);
      console.log(`Channel: ${result.channel}`);
      console.log('\nThe message has been queued for delivery.');
    } else {
      console.error('\n❌ Failed to send SMS');
      console.error(`Error: ${result.error}`);
    }

    // Return result for testing purposes
    return result;
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the test
testInternationalSMS()
  .then((result) => {
    console.log('\n====================================');
    console.log('Test completed');
    console.log('====================================');
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });