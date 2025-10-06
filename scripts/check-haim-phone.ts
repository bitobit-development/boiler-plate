import { config } from "dotenv";
import path from "path";

// Load environment variables
config({ path: path.resolve(process.cwd(), ".env.local") });

import { db } from "../src/lib/db";
import { subscribers } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function checkHaimPhone() {
  try {
    console.log("🔍 Checking Haim Derazon's phone number format in database...\n");

    const result = await db
      .select({
        id: subscribers.id,
        name: subscribers.name,
        surname: subscribers.surname,
        email: subscribers.email,
        mobile: subscribers.mobile,
        mobileVerified: subscribers.mobileVerified,
        status: subscribers.status,
        createdAt: subscribers.createdAt
      })
      .from(subscribers)
      .where(eq(subscribers.email, "haim.derazon@gmail.com"));

    if (result.length > 0) {
      const sub = result[0];
      console.log("✅ Found subscriber:");
      console.log("================================");
      console.log(`Name: ${sub.name} ${sub.surname}`);
      console.log(`Email: ${sub.email}`);
      console.log(`Mobile: ${sub.mobile}`);
      console.log(`Mobile Verified: ${sub.mobileVerified}`);
      console.log(`Status: ${sub.status}`);
      console.log(`Created At: ${sub.createdAt}`);
      console.log("================================\n");

      // Check the phone format
      if (sub.mobile) {
        console.log("📱 Phone Number Analysis:");
        console.log(`- Raw value: "${sub.mobile}"`);
        console.log(`- Length: ${sub.mobile.length} characters`);
        console.log(`- Starts with +972: ${sub.mobile.startsWith('+972')}`);
        console.log(`- E.164 format: ${/^\+\d{10,15}$/.test(sub.mobile)}`);

        if (sub.mobile === "+972505489909") {
          console.log("\n✅ PERFECT! Phone number is correctly stored as +972505489909");
          console.log("The leading zero from input (0505489909) was properly removed!");
        } else if (sub.mobile === "+9720505489909") {
          console.log("\n⚠️ Issue: Phone has an extra zero: +9720505489909");
          console.log("The leading zero was NOT removed properly.");
        } else {
          console.log(`\n🤔 Unexpected format: ${sub.mobile}`);
        }
      }
    } else {
      console.log("❌ No subscriber found with email 'haim.derazon@gmail.com'");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error checking subscriber:", error);
    process.exit(1);
  }
}

checkHaimPhone();