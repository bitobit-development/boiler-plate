/**
 * Test script for pending order SMS notifications
 * Tests SMS sending with mock order data
 */

import dotenv from "dotenv";
import { sendSMS } from "@/lib/services/sms";

// Load environment variables
dotenv.config({ path: ".env.local" });

interface TestCase {
  name: string;
  mobile: string;
  orderNumber: string;
  itemCount: number;
  total: number; // in cents
}

const testCases: TestCase[] = [
  {
    name: "South African Number",
    mobile: "+27823291893", // Test number
    orderNumber: "WEB-1234567890-TEST1",
    itemCount: 3,
    total: 45000, // R450.00
  },
  {
    name: "International Number (Israel)",
    mobile: "+972543219876",
    orderNumber: "WEB-1234567891-TEST2",
    itemCount: 5,
    total: 120000, // R1200.00
  },
];

async function sendTestSMS(testCase: TestCase): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Test: ${testCase.name}`);
  console.log(`Mobile: ${testCase.mobile}`);
  console.log(`${"=".repeat(60)}\n`);

  // Get shop info
  const shopAddress = process.env.SHOP_ADDRESS || "123 Cannabis St, Cape Town";
  const shopPhone = process.env.SHOP_PHONE || "+27 21 123 4567";

  // Format total as Rands
  const totalRands = (testCase.total / 100).toFixed(0);

  // Build SMS message
  const message = `BIGG BUZZ - Order Confirmed!

Order #: ${testCase.orderNumber}
Items: ${testCase.itemCount} product(s)
Total: R${totalRands}

Please collect within 48 hours from our shop.

Location: ${shopAddress}

Questions? Call ${shopPhone}`;

  console.log("Message to send:");
  console.log(message);
  console.log(`\nCharacter count: ${message.length} characters`);
  console.log(`\nSending SMS...`);

  try {
    const result = await sendSMS({
      to: testCase.mobile,
      message,
      channel: "sms",
    });

    if (result.success) {
      console.log("✅ SMS sent successfully");
      console.log(`Message ID: ${result.messageId}`);
    } else {
      console.log("❌ SMS failed");
      console.log(`Error: ${result.error}`);
    }
  } catch (error) {
    console.error("❌ Exception occurred:", error);
  }
}

async function main() {
  console.log("\n📱 Testing Pending Order SMS Notifications\n");
  console.log("This script tests SMS sending for pending order confirmations.");
  console.log(`Testing ${testCases.length} scenarios...\n`);

  // Check environment variables
  if (!process.env.CLICKATELL_API_KEY) {
    console.error("❌ CLICKATELL_API_KEY not configured");
    process.exit(1);
  }

  if (!process.env.CLICKATELL_API_URL) {
    console.error("❌ CLICKATELL_API_URL not configured");
    process.exit(1);
  }

  console.log("✅ Clickatell API configured");
  console.log(`Shop Address: ${process.env.SHOP_ADDRESS || "Not configured (using default)"}`);
  console.log(`Shop Phone: ${process.env.SHOP_PHONE || "Not configured (using default)"}`);

  // Run all test cases
  for (const testCase of testCases) {
    await sendTestSMS(testCase);
    // Wait between tests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("✅ All tests completed");
  console.log(`${"=".repeat(60)}\n`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
