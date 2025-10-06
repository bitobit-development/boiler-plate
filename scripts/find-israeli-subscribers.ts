import { db } from "../src/lib/db";
import { subscribers } from "../src/lib/db/schema";
import { like, or } from "drizzle-orm";

async function findIsraeliSubscribers() {
  try {
    console.log("🔍 Searching for Israeli subscribers...");

    const results = await db
      .select({
        id: subscribers.id,
        name: subscribers.name,
        surname: subscribers.surname,
        email: subscribers.email,
        mobile: subscribers.mobile,
        status: subscribers.status,
        mobileVerified: subscribers.mobileVerified,
      })
      .from(subscribers)
      .where(
        or(
          like(subscribers.mobile, "%972%"),
          like(subscribers.mobile, "%505489909%")
        )
      );

    console.log(`\nFound ${results.length} subscriber(s):\n`);
    results.forEach((sub) => {
      console.log({
        id: sub.id,
        name: sub.name,
        surname: sub.surname,
        email: sub.email,
        mobile: sub.mobile,
        status: sub.status,
        mobileVerified: sub.mobileVerified,
      });
      console.log("---");
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error searching subscribers:", error);
    process.exit(1);
  }
}

findIsraeliSubscribers();
