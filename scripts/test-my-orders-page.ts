/**
 * Integration test for My Orders page
 * Tests the order UI components and functionality
 */

import { db } from "@/lib/db";
import { subscribers, orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSubscriberPendingOrders, cancelPendingOrder } from "@/app/actions/orders";

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function logResult(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} ${name}: ${message}`);
}

async function runTests() {
  console.log("🧪 Testing My Orders Page Components\n");
  console.log("=" .repeat(60));

  try {
    // Test 1: Find a test subscriber
    console.log("\n1️⃣ Finding test subscriber...");
    const [testSubscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.status, "active"))
      .limit(1);

    if (!testSubscriber) {
      logResult("Find Subscriber", false, "No active subscribers found");
      return;
    }

    logResult(
      "Find Subscriber",
      true,
      `Found subscriber: ${testSubscriber.name} (${testSubscriber.email})`
    );

    // Test 2: Fetch pending orders
    console.log("\n2️⃣ Fetching pending orders...");
    const ordersResult = await getSubscriberPendingOrders(testSubscriber.id);

    logResult(
      "Fetch Orders",
      ordersResult.success,
      ordersResult.success
        ? `Found ${ordersResult.orders.length} pending orders`
        : ordersResult.message || "Failed to fetch orders"
    );

    // Test 3: Create a test order if none exist
    if (ordersResult.success && ordersResult.orders.length === 0) {
      console.log("\n3️⃣ Creating test order...");

      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
      const orderNumber = `ORD-TEST-${Date.now()}`;

      const [testOrder] = await db
        .insert(orders)
        .values({
          orderNumber,
          subscriberId: testSubscriber.id,
          items: [
            {
              productId: "test-product-1",
              productName: "Test Product",
              quantity: 2,
              price: 10000, // R100.00
              subtotal: 20000, // R200.00
            },
          ],
          subtotal: 20000, // R200.00
          tax: 3000, // R30.00 (15%)
          total: 23000, // R230.00
          status: "pending",
          expiresAt,
          customerName: testSubscriber.name,
          customerMobile: testSubscriber.mobile,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      logResult(
        "Create Test Order",
        !!testOrder,
        testOrder ? `Created order: ${testOrder.orderNumber}` : "Failed"
      );

      if (testOrder) {
        // Fetch orders again
        const updatedResult = await getSubscriberPendingOrders(testSubscriber.id);
        logResult(
          "Fetch Updated Orders",
          updatedResult.success && updatedResult.orders.length > 0,
          `Now showing ${updatedResult.orders.length} orders`
        );

        // Test 4: Test order cancellation
        console.log("\n4️⃣ Testing order cancellation...");
        const cancelResult = await cancelPendingOrder(
          testOrder.id,
          testSubscriber.id
        );

        logResult(
          "Cancel Order",
          cancelResult.success,
          cancelResult.message
        );

        // Verify order was cancelled
        if (cancelResult.success) {
          const [cancelledOrder] = await db
            .select()
            .from(orders)
            .where(eq(orders.id, testOrder.id))
            .limit(1);

          logResult(
            "Verify Cancellation",
            cancelledOrder?.status === "cancelled",
            cancelledOrder?.status === "cancelled"
              ? "Order status is 'cancelled'"
              : `Unexpected status: ${cancelledOrder?.status}`
          );
        }
      }
    } else if (ordersResult.success && ordersResult.orders.length > 0) {
      console.log("\n3️⃣ Testing with existing orders...");
      const firstOrder = ordersResult.orders[0];

      logResult(
        "Order Data Structure",
        !!(
          firstOrder.id &&
          firstOrder.orderNumber &&
          firstOrder.items &&
          firstOrder.expiresAt
        ),
        "Order has all required fields"
      );

      // Check expiration calculation
      const now = new Date();
      const expiresAt = new Date(firstOrder.expiresAt);
      const hoursRemaining = Math.floor(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)
      );

      logResult(
        "Expiration Timer",
        hoursRemaining > 0 && hoursRemaining <= 48,
        `${hoursRemaining} hours remaining (valid range)`
      );
    }

    // Test 5: Test unauthorized access
    console.log("\n5️⃣ Testing security...");
    const fakeSubscriberId = "00000000-0000-0000-0000-000000000000";
    const unauthorizedResult = await getSubscriberPendingOrders(
      fakeSubscriberId
    );

    logResult(
      "Unauthorized Access",
      !unauthorizedResult.success,
      unauthorizedResult.success
        ? "SECURITY ISSUE: Accessed invalid subscriber"
        : "Correctly blocked invalid subscriber"
    );
  } catch (error) {
    console.error("\n❌ Test Error:", error);
    logResult("Test Execution", false, (error as Error).message);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("\n📊 Test Summary\n");
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(1);

  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed} (${percentage}%)`);
  console.log(`Failed: ${total - passed}`);

  if (passed === total) {
    console.log("\n✨ All tests passed! My Orders page is ready.");
  } else {
    console.log("\n⚠️  Some tests failed. Review the errors above.");
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n🌐 Access the page at:");
  console.log("   http://localhost:3000/my-orders");
  console.log("\n📝 Note: You need to be logged in as a subscriber to view orders.");
  console.log("   Use the Member Login modal on the shop page first.\n");
}

// Run tests
runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
