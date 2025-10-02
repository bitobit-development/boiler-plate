#!/usr/bin/env node

/**
 * Test script for OTP migration
 * Tests that the OTP fields are correctly added to the database
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema.ts";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in environment");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false
});
const db = drizzle(sql, { schema });

async function testOTPFields() {
  console.log("🧪 Testing OTP Migration...\n");

  try {
    // 1. Check if columns exist
    console.log("📋 Checking OTP columns...");
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'subscribers'
      AND column_name IN ('otp_code', 'otp_expires_at', 'otp_attempts', 'otp_last_sent_at')
      ORDER BY column_name
    `;

    if (tableInfo.length === 0) {
      console.error("❌ OTP columns not found! Please run migration first:");
      console.error("   npm run db:migrate");
      process.exit(1);
    }

    console.log("✅ Found OTP columns:");
    tableInfo.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
    });

    // 2. Check indexes
    console.log("\n📋 Checking OTP indexes...");
    const indexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'subscribers'
      AND (
        indexname LIKE '%otp%'
        OR indexname IN ('subscribers_otp_expires_at_idx', 'subscribers_otp_last_sent_at_idx')
      )
    `;

    if (indexes.length > 0) {
      console.log("✅ Found OTP indexes:");
      indexes.forEach(idx => {
        console.log(`   - ${idx.indexname}`);
      });
    } else {
      console.log("⚠️  No OTP indexes found (they may be created later)");
    }

    // 3. Test inserting a subscriber with OTP fields
    console.log("\n🧪 Testing OTP field insertion...");

    const testOTP = "123456";
    const testExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    const testLastSent = new Date();

    // Create a test subscriber
    const testEmail = `otp-test-${Date.now()}@example.com`;
    const testMobile = `+2782${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;

    const [newSubscriber] = await db.insert(schema.subscribers).values({
      name: "OTP",
      surname: "Test",
      email: testEmail,
      mobile: testMobile,
      ageVerified: true,
      status: "pending",
      mobileVerified: false,
      otpCode: testOTP, // In production, this would be encrypted
      otpExpiresAt: testExpiry,
      otpAttempts: 0,
      otpLastSentAt: testLastSent
    }).returning();

    console.log("✅ Successfully created subscriber with OTP fields:");
    console.log(`   - ID: ${newSubscriber.id}`);
    console.log(`   - Email: ${newSubscriber.email}`);
    console.log(`   - OTP Code: ${newSubscriber.otpCode ? '***' : 'null'}`);
    console.log(`   - OTP Attempts: ${newSubscriber.otpAttempts}`);
    console.log(`   - OTP Expires: ${newSubscriber.otpExpiresAt}`);

    // 4. Test updating OTP fields
    console.log("\n🧪 Testing OTP field updates...");

    const [updatedSubscriber] = await db
      .update(schema.subscribers)
      .set({
        otpAttempts: 1,
        updatedAt: new Date()
      })
      .where(eq(schema.subscribers.id, newSubscriber.id))
      .returning();

    console.log("✅ Successfully updated OTP attempts:");
    console.log(`   - New attempts: ${updatedSubscriber.otpAttempts}`);

    // 5. Test clearing OTP fields (simulating successful verification)
    console.log("\n🧪 Testing OTP field clearing (verification success)...");

    const [verifiedSubscriber] = await db
      .update(schema.subscribers)
      .set({
        mobileVerified: true,
        status: "active",
        verifiedAt: new Date(),
        otpCode: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        updatedAt: new Date()
      })
      .where(eq(schema.subscribers.id, newSubscriber.id))
      .returning();

    console.log("✅ Successfully cleared OTP fields after verification:");
    console.log(`   - Mobile Verified: ${verifiedSubscriber.mobileVerified}`);
    console.log(`   - Status: ${verifiedSubscriber.status}`);
    console.log(`   - OTP Code: ${verifiedSubscriber.otpCode || 'cleared'}`);
    console.log(`   - OTP Expires: ${verifiedSubscriber.otpExpiresAt || 'cleared'}`);

    // 6. Clean up test data
    console.log("\n🧹 Cleaning up test data...");
    await db.delete(schema.subscribers).where(eq(schema.subscribers.id, newSubscriber.id));
    console.log("✅ Test subscriber deleted");

    console.log("\n✅ All OTP migration tests passed successfully!");
    console.log("   The database is ready for OTP verification implementation.");

  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    if (error.code === '42703') {
      console.error("\n⚠️  Column does not exist. Please run the migration:");
      console.error("   npm run db:migrate");
    } else if (error.code === '23505') {
      console.error("\n⚠️  Duplicate key error. Test data may already exist.");
    } else {
      console.error("\nFull error:", error);
    }
    process.exit(1);
  }
}

// Run the test
testOTPFields()
  .then(async () => {
    await sql.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await sql.end();
    process.exit(1);
  });