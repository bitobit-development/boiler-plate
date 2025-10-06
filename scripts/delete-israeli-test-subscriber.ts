import { db } from "../src/lib/db";
import { subscribers } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function deleteIsraeliTestSubscriber() {
  try {
    console.log("🗑️  Deleting Israeli test subscriber...");

    // The number is stored with an extra 0: +9720505489909
    const result = await db
      .delete(subscribers)
      .where(eq(subscribers.mobile, "+9720505489909"))
      .returning();

    if (result.length > 0) {
      console.log("✅ Successfully deleted subscriber:");
      console.log({
        id: result[0].id,
        name: result[0].name,
        surname: result[0].surname,
        email: result[0].email,
        mobile: result[0].mobile,
      });
    } else {
      console.log("ℹ️  No subscriber found");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error deleting subscriber:", error);
    process.exit(1);
  }
}

deleteIsraeliTestSubscriber();
