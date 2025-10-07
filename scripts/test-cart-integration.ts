import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function testCartIntegration() {
  try {
    console.log("🔍 Testing Cart Integration on Specials Page\n");

    // Find a test subscriber
    const [testSubscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.phoneNumber, "+27123456789"))
      .limit(1);

    if (!testSubscriber) {
      console.log("❌ No test subscriber found");
      console.log("💡 Creating test subscriber...");

      const [newSubscriber] = await db
        .insert(subscribers)
        .values({
          phoneNumber: "+27123456789",
          name: "Test Cart User",
          isActive: true,
        })
        .returning();

      console.log("✅ Test subscriber created:", newSubscriber.id);
      console.log("\n📝 Login Instructions:");
      console.log("1. Navigate to http://localhost:3000/login");
      console.log("2. Enter phone number: +27123456789");
      console.log("3. Check database for OTP code:");
      console.log(`   SELECT * FROM subscriber_auth_sessions WHERE subscriber_id = '${newSubscriber.id}' ORDER BY created_at DESC LIMIT 1;`);
      console.log("\n4. After login, visit http://localhost:3000/specials");
      console.log("5. Click 'Add to Cart' on any product");
      console.log("6. Click the cart button (bottom right)");
      console.log("7. Verify cart sidebar opens with product");
    } else {
      console.log("✅ Test subscriber found:", testSubscriber.id);
      console.log("\n📝 Login Instructions:");
      console.log("1. Navigate to http://localhost:3000/login");
      console.log("2. Enter phone number: +27123456789");
      console.log("3. Check database for OTP code:");
      console.log(`   SELECT * FROM subscriber_auth_sessions WHERE subscriber_id = '${testSubscriber.id}' ORDER BY created_at DESC LIMIT 1;`);
      console.log("\n4. After login, visit http://localhost:3000/specials");
      console.log("5. Click 'Add to Cart' on any product");
      console.log("6. Click the cart button (bottom right)");
      console.log("7. Verify cart sidebar opens with product");
    }

    console.log("\n🎯 Expected Behavior:");
    console.log("- Cart button should show item count badge");
    console.log("- Toast notification: 'Added to cart'");
    console.log("- Cart sidebar opens showing product");
    console.log("- Can update quantity, remove item, or checkout");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

testCartIntegration();
