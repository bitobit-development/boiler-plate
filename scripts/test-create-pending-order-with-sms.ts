/**
 * Integration test for createPendingOrder with SMS notification
 * Tests the complete flow from cart to order with SMS confirmation
 */

import dotenv from "dotenv";
import { db } from "@/lib/db";
import { carts, products, subscribers, orders, orderItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createPendingOrder } from "@/app/actions/cart";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function setupTestData() {
  console.log("\n📦 Setting up test data...\n");

  // Find an active subscriber with verified mobile
  const [subscriber] = await db
    .select()
    .from(subscribers)
    .where(
      and(
        eq(subscribers.status, "active"),
        eq(subscribers.mobileVerified, true)
      )
    )
    .limit(1);

  if (!subscriber) {
    throw new Error("No active subscribers with verified mobile found");
  }

  console.log(`✅ Using subscriber: ${subscriber.name} ${subscriber.surname}`);
  console.log(`   Mobile: ${subscriber.mobile}`);
  console.log(`   ID: ${subscriber.id}\n`);

  // Find some active products
  const testProducts = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.status, "active"),
        eq(products.isVisible, true)
      )
    )
    .limit(3);

  if (testProducts.length === 0) {
    throw new Error("No active products found");
  }

  console.log(`✅ Found ${testProducts.length} test products\n`);

  // Create a test cart
  const cartItems = testProducts.map((product) => ({
    productId: product.id,
    productName: product.name,
    productSku: product.sku || undefined,
    quantity: 2,
    price: product.price,
    subtotal: product.price * 2,
    addedAt: new Date().toISOString(),
  }));

  // Delete existing cart if any
  await db.delete(carts).where(eq(carts.subscriberId, subscriber.id));

  // Create new cart
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48);

  const [cart] = await db
    .insert(carts)
    .values({
      subscriberId: subscriber.id,
      items: cartItems as any,
      expiresAt,
    })
    .returning();

  console.log(`✅ Created test cart with ${cartItems.length} items`);
  console.log(`   Cart ID: ${cart.id}\n`);

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const total = Math.round(subtotal * 1.15); // Include 15% VAT

  console.log(`📊 Cart Summary:`);
  console.log(`   Items: ${cartItems.length}`);
  console.log(`   Subtotal: R${(subtotal / 100).toFixed(2)}`);
  console.log(`   Total (inc VAT): R${(total / 100).toFixed(2)}\n`);

  return { subscriber, cart, cartItems };
}

async function testCreatePendingOrder() {
  console.log("\n" + "=".repeat(70));
  console.log("🧪 Integration Test: Create Pending Order with SMS");
  console.log("=".repeat(70) + "\n");

  try {
    // Setup test data
    const { subscriber, cart } = await setupTestData();

    console.log("📝 Creating pending order...\n");

    // Call the createPendingOrder action
    const result = await createPendingOrder(subscriber.id);

    console.log("=".repeat(70));
    console.log("📋 Result:");
    console.log("=".repeat(70) + "\n");

    if (result.success) {
      console.log("✅ Order Created Successfully!\n");
      console.log(`Order Number: ${result.orderNumber}`);
      console.log(`Order ID: ${result.order?.id}`);
      console.log(`Status: ${result.order?.status}`);
      console.log(`Total: R${(result.order?.total / 100).toFixed(2)}`);
      console.log(`\nMessage: ${result.message}`);

      // Check SMS status
      console.log(`\n📱 SMS Status: ${result.smsStatus}`);
      if (result.smsStatus === "sent") {
        console.log(`✅ SMS sent successfully to ${subscriber.mobile}`);
      } else if (result.smsStatus === "failed") {
        console.log(`⚠️  SMS failed: ${result.smsMessage}`);
        console.log("   (Order still created successfully)");
      } else {
        console.log(`⚠️  SMS skipped`);
      }

      // Verify order in database
      console.log(`\n🔍 Verifying order in database...`);
      const [dbOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, result.order.id))
        .limit(1);

      if (dbOrder) {
        console.log(`✅ Order found in database`);

        // Check order items
        const dbOrderItems = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, dbOrder.id));

        console.log(`✅ Order has ${dbOrderItems.length} items`);

        // Check cart was cleared
        const [remainingCart] = await db
          .select()
          .from(carts)
          .where(eq(carts.subscriberId, subscriber.id))
          .limit(1);

        if (!remainingCart) {
          console.log(`✅ Cart cleared successfully`);
        } else {
          console.log(`⚠️  Cart still exists (should be cleared)`);
        }
      }

      console.log(`\n${"=".repeat(70)}`);
      console.log("✅ Integration Test PASSED");
      console.log(`${"=".repeat(70)}\n`);
    } else {
      console.log(`❌ Order Creation Failed`);
      console.log(`Error: ${result.error}`);
      console.log(`Message: ${result.message}`);

      console.log(`\n${"=".repeat(70)}`);
      console.log("❌ Integration Test FAILED");
      console.log(`${"=".repeat(70)}\n`);
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Test failed with exception:", error);
    console.log(`\n${"=".repeat(70)}`);
    console.log("❌ Integration Test FAILED");
    console.log(`${"=".repeat(70)}\n`);
    process.exit(1);
  }
}

async function main() {
  console.log("\n🚀 Starting Integration Test\n");

  // Check environment
  if (!process.env.CLICKATELL_API_KEY) {
    console.error("❌ CLICKATELL_API_KEY not configured");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not configured");
    process.exit(1);
  }

  console.log("✅ Environment configured");
  console.log(`   Database: Connected`);
  console.log(`   SMS Service: Clickatell`);
  console.log(`   Shop Address: ${process.env.SHOP_ADDRESS || "Using default"}`);
  console.log(`   Shop Phone: ${process.env.SHOP_PHONE || "Using default"}\n`);

  await testCreatePendingOrder();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
