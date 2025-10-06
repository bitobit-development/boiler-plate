import { config } from "dotenv";
import path from "path";

// Load environment variables
config({ path: path.resolve(process.cwd(), ".env.local") });

import { db } from "../src/lib/db";
import { subscribers } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function deleteHaimSubscriber() {
  try {
    console.log("🔄  Updating Haim Derazon subscriber email to allow re-registration...");

    // Update the email to a backup one to allow re-registration with the original
    const result = await db
      .update(subscribers)
      .set({
        email: "haim.derazon.old@gmail.com"
      })
      .where(eq(subscribers.email, "haim.derazon@gmail.com"))
      .returning();

    if (result.length > 0) {
      console.log("✅ Successfully updated subscriber email:");
      console.log({
        id: result[0].id,
        name: result[0].name,
        surname: result[0].surname,
        oldEmail: "haim.derazon@gmail.com",
        newEmail: result[0].email,
        mobile: result[0].mobile,
      });
      console.log("\n✅ You can now test the subscription flow again with haim.derazon@gmail.com!");
    } else {
      console.log("ℹ️  No subscriber found with email 'haim.derazon@gmail.com'");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating subscriber:", error);
    process.exit(1);
  }
}

deleteHaimSubscriber();
