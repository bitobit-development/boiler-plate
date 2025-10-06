import { config } from "dotenv";
import path from "path";

// Load environment variables
config({ path: path.resolve(process.cwd(), ".env.local") });

import { db } from "../src/lib/db";
import { subscribers } from "../src/lib/db/schema";
import { like } from "drizzle-orm";

async function delete972Subscriber() {
  try {
    console.log("🗑️  Deleting subscribers with +972 phone numbers...");

    // Delete any subscriber with a +972 phone number
    const result = await db
      .delete(subscribers)
      .where(like(subscribers.mobile, "+972%"))
      .returning();

    if (result.length > 0) {
      console.log(`✅ Successfully deleted ${result.length} subscriber(s):`);
      result.forEach((sub) => {
        console.log({
          id: sub.id,
          name: sub.name,
          surname: sub.surname,
          email: sub.email,
          mobile: sub.mobile,
        });
      });
    } else {
      console.log("ℹ️  No subscribers found with +972 phone numbers");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error deleting subscribers:", error);
    process.exit(1);
  }
}

delete972Subscriber();