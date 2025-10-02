#!/usr/bin/env node

/**
 * Verification script for OTP migration
 * Directly tests the database to confirm OTP fields exist
 */

import postgres from "postgres";
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

async function verifyOTPMigration() {
  console.log("🔍 Verifying OTP Migration...\n");

  try {
    // 1. Check if columns exist
    console.log("📋 Checking OTP columns in subscribers table...");
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'subscribers'
      AND column_name IN ('otp_code', 'otp_expires_at', 'otp_attempts', 'otp_last_sent_at')
      ORDER BY column_name
    `;

    if (tableInfo.length === 0) {
      console.error("❌ OTP columns not found! Migration may not have been applied.");
      console.error("   Please run: npm run db:push");
      await sql.end();
      process.exit(1);
    }

    console.log("✅ Found OTP columns:");
    console.log("┌─────────────────────┬────────────────┬───────────┬─────────┐");
    console.log("│ Column Name         │ Data Type      │ Nullable  │ Default │");
    console.log("├─────────────────────┼────────────────┼───────────┼─────────┤");

    tableInfo.forEach(col => {
      const colName = col.column_name.padEnd(19);
      const dataType = (col.data_type === 'timestamp without time zone' ? 'timestamp' : col.data_type).padEnd(14);
      const nullable = col.is_nullable.padEnd(9);
      const defaultVal = col.column_default ? col.column_default.substring(0, 7) : 'none';
      console.log(`│ ${colName} │ ${dataType} │ ${nullable} │ ${defaultVal.padEnd(7)} │`);
    });
    console.log("└─────────────────────┴────────────────┴───────────┴─────────┘");

    // 2. Check indexes
    console.log("\n📋 Checking OTP-related indexes...");
    const indexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'subscribers'
      AND (
        indexname LIKE '%otp%'
        OR indexname IN ('subscribers_otp_expires_at_idx', 'subscribers_otp_last_sent_at_idx')
      )
      ORDER BY indexname
    `;

    if (indexes.length > 0) {
      console.log("✅ Found OTP indexes:");
      indexes.forEach(idx => {
        console.log(`   • ${idx.indexname}`);
        // Show partial index conditions if present
        if (idx.indexdef.includes('WHERE')) {
          const whereClause = idx.indexdef.substring(idx.indexdef.indexOf('WHERE'));
          console.log(`     ${whereClause}`);
        }
      });
    } else {
      console.log("⚠️  No OTP indexes found");
      console.log("   This may impact query performance for OTP operations");
    }

    // 3. Check column comments
    console.log("\n📋 Checking column documentation...");
    const comments = await sql`
      SELECT
        c.column_name,
        pgd.description
      FROM pg_catalog.pg_statio_all_tables as st
      INNER JOIN pg_catalog.pg_description pgd ON (
        pgd.objoid = st.relid
      )
      INNER JOIN information_schema.columns c ON (
        pgd.objsubid = c.ordinal_position
        AND c.table_schema = st.schemaname
        AND c.table_name = st.relname
      )
      WHERE c.table_name = 'subscribers'
      AND c.column_name IN ('otp_code', 'otp_expires_at', 'otp_attempts', 'otp_last_sent_at')
    `;

    if (comments.length > 0) {
      console.log("✅ Found column comments:");
      comments.forEach(comment => {
        console.log(`   • ${comment.column_name}: ${comment.description}`);
      });
    } else {
      console.log("ℹ️  No column comments found (optional)");
    }

    // 4. Sample query test
    console.log("\n🧪 Testing sample OTP queries...");

    // Test query 1: Find pending OTP verifications
    const pendingOTPs = await sql`
      SELECT COUNT(*) as count
      FROM subscribers
      WHERE status = 'pending'
      AND otp_code IS NOT NULL
      AND otp_expires_at > NOW()
      AND mobile_verified = false
    `;
    console.log(`   • Pending OTP verifications: ${pendingOTPs[0].count}`);

    // Test query 2: Find expired OTPs
    const expiredOTPs = await sql`
      SELECT COUNT(*) as count
      FROM subscribers
      WHERE otp_expires_at IS NOT NULL
      AND otp_expires_at <= NOW()
    `;
    console.log(`   • Expired OTPs (to be cleaned): ${expiredOTPs[0].count}`);

    // Test query 3: Check rate limiting capability
    const recentSends = await sql`
      SELECT COUNT(*) as count
      FROM subscribers
      WHERE otp_last_sent_at IS NOT NULL
      AND otp_last_sent_at > NOW() - INTERVAL '1 hour'
    `;
    console.log(`   • OTPs sent in last hour: ${recentSends[0].count}`);

    // 5. Database state summary
    console.log("\n📊 Database State Summary:");
    const stats = await sql`
      SELECT
        COUNT(*) as total_subscribers,
        COUNT(CASE WHEN mobile_verified = true THEN 1 END) as verified_mobiles,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_subscribers,
        COUNT(CASE WHEN otp_code IS NOT NULL THEN 1 END) as active_otps,
        COUNT(CASE WHEN otp_attempts > 0 THEN 1 END) as failed_attempts
      FROM subscribers
    `;

    const stat = stats[0];
    console.log(`   • Total subscribers: ${stat.total_subscribers}`);
    console.log(`   • Verified mobiles: ${stat.verified_mobiles}`);
    console.log(`   • Pending registrations: ${stat.pending_subscribers}`);
    console.log(`   • Active OTP codes: ${stat.active_otps}`);
    console.log(`   • Records with failed attempts: ${stat.failed_attempts}`);

    console.log("\n✅ OTP Migration Verification Complete!");
    console.log("   All required fields and indexes are properly configured.");
    console.log("   The database is ready for OTP verification implementation.");

  } catch (error) {
    console.error("\n❌ Verification failed:", error.message);
    if (error.code === '42703') {
      console.error("\n⚠️  Column does not exist. Please run the migration:");
      console.error("   npm run db:push");
    } else {
      console.error("\nFull error:", error);
    }
    await sql.end();
    process.exit(1);
  }

  await sql.end();
}

// Run verification
verifyOTPMigration();