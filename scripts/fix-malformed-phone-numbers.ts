/**
 * Database Cleanup Script - Fix Malformed Phone Numbers
 *
 * This script finds and fixes phone numbers in the database that are not
 * properly formatted in E.164 standard.
 *
 * Common issues fixed:
 * - Extra zero after country code: +9720505489909 → +972505489909
 * - Missing country code: 505489909 → +972505489909 (if country detected)
 * - Invalid E.164 format
 *
 * Usage:
 * - Dry run (preview changes): npm run tsx scripts/fix-malformed-phone-numbers.ts
 * - Apply changes: npm run tsx scripts/fix-malformed-phone-numbers.ts --apply
 */

import { db } from "../src/lib/db";
import { subscribers } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { isMalformedE164, fixMalformedE164 } from "../src/lib/utils/phone-validation";

interface MalformedRecord {
  id: string;
  name: string;
  surname: string;
  email: string;
  mobile: string;
  status: string;
  fixedMobile: string | null;
}

async function findMalformedNumbers(): Promise<MalformedRecord[]> {
  console.log("🔍 Scanning database for malformed phone numbers...\n");

  // Get all subscribers
  const allSubscribers = await db
    .select({
      id: subscribers.id,
      name: subscribers.name,
      surname: subscribers.surname,
      email: subscribers.email,
      mobile: subscribers.mobile,
      status: subscribers.status,
    })
    .from(subscribers);

  console.log(`📊 Total subscribers in database: ${allSubscribers.length}`);

  // Find malformed numbers and attempt to fix them
  const malformed: MalformedRecord[] = [];

  for (const sub of allSubscribers) {
    if (!sub.mobile) {
      console.log(`⚠️  Skipping ${sub.email} - no mobile number`);
      continue;
    }

    if (isMalformedE164(sub.mobile)) {
      const fixed = fixMalformedE164(sub.mobile);
      malformed.push({
        id: sub.id,
        name: sub.name,
        surname: sub.surname,
        email: sub.email,
        mobile: sub.mobile,
        status: sub.status,
        fixedMobile: fixed,
      });
    }
  }

  return malformed;
}

async function fixMalformedNumbers(dryRun: boolean = true): Promise<void> {
  const malformed = await findMalformedNumbers();

  console.log(`\n❌ Found ${malformed.length} malformed phone number(s)\n`);

  if (malformed.length === 0) {
    console.log("✅ All phone numbers are properly formatted!");
    return;
  }

  // Display malformed numbers
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  malformed.forEach((record, index) => {
    console.log(`\n${index + 1}. ${record.name} ${record.surname} (${record.email})`);
    console.log(`   Status: ${record.status}`);
    console.log(`   Current:  ${record.mobile}`);

    if (record.fixedMobile) {
      console.log(`   Fixed:    ${record.fixedMobile} ✓`);
    } else {
      console.log(`   Fixed:    [CANNOT AUTO-FIX] ⚠️`);
      console.log(`   Action:   Manual review required`);
    }
  });
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Count fixable vs unfixable
  const fixable = malformed.filter((r) => r.fixedMobile !== null);
  const unfixable = malformed.filter((r) => r.fixedMobile === null);

  console.log(`📊 Summary:`);
  console.log(`   - Fixable: ${fixable.length}`);
  console.log(`   - Unfixable: ${unfixable.length} (manual review required)`);

  if (dryRun) {
    console.log(`\n💡 This is a DRY RUN - no changes have been made`);
    console.log(`   To apply these fixes, run:`);
    console.log(`   npx tsx scripts/fix-malformed-phone-numbers.ts --apply\n`);
    return;
  }

  // Apply fixes
  if (fixable.length === 0) {
    console.log(`\n⚠️  No fixable numbers found. Manual review required.\n`);
    return;
  }

  console.log(`\n🔧 Applying fixes to ${fixable.length} record(s)...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const record of fixable) {
    try {
      await db
        .update(subscribers)
        .set({ mobile: record.fixedMobile! })
        .where(eq(subscribers.id, record.id));

      console.log(`✅ Fixed: ${record.mobile} → ${record.fixedMobile}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error fixing ${record.email}:`, error);
      errorCount++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n📊 Results:`);
  console.log(`   ✅ Successfully fixed: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);

  if (unfixable.length > 0) {
    console.log(`   ⚠️  Manual review required: ${unfixable.length}`);
    console.log(`\n   Records requiring manual review:`);
    unfixable.forEach((record) => {
      console.log(`   - ${record.email}: ${record.mobile}`);
    });
  }

  console.log("\n✅ Database cleanup completed!\n");
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const applyChanges = args.includes("--apply");

  try {
    if (applyChanges) {
      console.log("🚀 Running in APPLY mode - changes WILL be made to the database\n");
    } else {
      console.log("🔍 Running in DRY RUN mode - no changes will be made\n");
    }

    await fixMalformedNumbers(!applyChanges);
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

main();
