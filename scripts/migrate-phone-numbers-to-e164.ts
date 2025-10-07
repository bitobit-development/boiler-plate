#!/usr/bin/env tsx
/**
 * Migration Script: Normalize Phone Numbers to E.164 Format
 *
 * This script migrates all phone numbers in the subscribers table to E.164 format.
 *
 * E.164 format: +[country code][number] (e.g., +27821234567, +972505489909)
 *
 * Handles:
 * - Local numbers starting with 0 (assumes South Africa +27)
 * - Numbers with hyphens or spaces (cleans to E.164)
 * - Numbers already in E.164 format (skips)
 */

import { db } from "../src/lib/db";
import { subscribers } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

interface MigrationResult {
  total: number;
  migrated: number;
  alreadyE164: number;
  failed: number;
  changes: Array<{
    id: string;
    name: string;
    from: string;
    to: string;
  }>;
  errors: Array<{
    id: string;
    name: string;
    mobile: string;
    error: string;
  }>;
}

/**
 * Normalize a phone number to E.164 format
 */
function normalizeToE164(mobile: string): string | null {
  if (!mobile || typeof mobile !== 'string') {
    return null;
  }

  let cleaned = mobile.trim();

  // Already in proper E.164 format (starts with + and only contains digits after)
  if (/^\+[1-9]\d{1,14}$/.test(cleaned)) {
    return cleaned;
  }

  // Remove all non-digit characters except leading +
  const hasPlus = cleaned.startsWith('+');
  cleaned = cleaned.replace(/[^\d]/g, '');

  // If it had a + but also had hyphens/spaces, restore the + and validate
  if (hasPlus && cleaned.length >= 10 && cleaned.length <= 15) {
    return `+${cleaned}`;
  }

  // Handle local numbers starting with 0 (assume South Africa +27)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    // Remove leading 0 and add +27
    return `+27${cleaned.slice(1)}`;
  }

  // If it's a number without country code (10 digits), assume South Africa
  if (cleaned.length === 10 && !cleaned.startsWith('0')) {
    return `+27${cleaned}`;
  }

  // If it's 9 digits, might be South African without leading 0
  if (cleaned.length === 9) {
    return `+27${cleaned}`;
  }

  // Already has country code but no +
  if (cleaned.length >= 11 && cleaned.length <= 15) {
    return `+${cleaned}`;
  }

  // Cannot normalize
  return null;
}

async function migratePhoneNumbers(): Promise<MigrationResult> {
  const result: MigrationResult = {
    total: 0,
    migrated: 0,
    alreadyE164: 0,
    failed: 0,
    changes: [],
    errors: [],
  };

  try {
    console.log('🔍 Fetching all subscribers...\n');

    // Fetch all subscribers
    const allSubscribers = await db.select().from(subscribers);
    result.total = allSubscribers.length;

    console.log(`📊 Found ${result.total} subscribers\n`);
    console.log('🔄 Processing phone numbers...\n');

    for (const subscriber of allSubscribers) {
      const originalMobile = subscriber.mobile;
      const normalized = normalizeToE164(originalMobile);

      if (!normalized) {
        // Failed to normalize
        result.failed++;
        result.errors.push({
          id: subscriber.id,
          name: `${subscriber.name} ${subscriber.surname || ''}`.trim(),
          mobile: originalMobile,
          error: 'Could not normalize to E.164 format',
        });
        console.log(`❌ FAILED: ${subscriber.name} - "${originalMobile}" (cannot normalize)`);
        continue;
      }

      if (originalMobile === normalized) {
        // Already in E.164 format
        result.alreadyE164++;
        console.log(`✅ SKIP: ${subscriber.name} - "${originalMobile}" (already E.164)`);
        continue;
      }

      // Update the database
      try {
        await db
          .update(subscribers)
          .set({ mobile: normalized })
          .where(eq(subscribers.id, subscriber.id));

        result.migrated++;
        result.changes.push({
          id: subscriber.id,
          name: `${subscriber.name} ${subscriber.surname || ''}`.trim(),
          from: originalMobile,
          to: normalized,
        });
        console.log(`🔄 UPDATED: ${subscriber.name} - "${originalMobile}" → "${normalized}"`);
      } catch (error) {
        result.failed++;
        result.errors.push({
          id: subscriber.id,
          name: `${subscriber.name} ${subscriber.surname || ''}`.trim(),
          mobile: originalMobile,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        console.log(`❌ ERROR: ${subscriber.name} - "${originalMobile}" (${error})`);
      }
    }

    return result;
  } catch (error) {
    console.error('💥 Fatal error during migration:', error);
    throw error;
  }
}

async function main() {
  console.log('📱 Phone Number E.164 Migration Script\n');
  console.log('=======================================\n');

  try {
    const result = await migratePhoneNumbers();

    console.log('\n=======================================');
    console.log('📊 Migration Summary\n');
    console.log(`Total Subscribers:    ${result.total}`);
    console.log(`✅ Already E.164:     ${result.alreadyE164}`);
    console.log(`🔄 Migrated:          ${result.migrated}`);
    console.log(`❌ Failed:            ${result.failed}`);
    console.log('=======================================\n');

    if (result.changes.length > 0) {
      console.log('📝 Changes Made:\n');
      result.changes.forEach((change, index) => {
        console.log(`${index + 1}. ${change.name}`);
        console.log(`   From: ${change.from}`);
        console.log(`   To:   ${change.to}\n`);
      });
    }

    if (result.errors.length > 0) {
      console.log('⚠️  Errors:\n');
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.name} (${error.mobile})`);
        console.log(`   Error: ${error.error}\n`);
      });
    }

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
main();
