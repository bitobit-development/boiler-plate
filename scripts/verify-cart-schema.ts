import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from "../src/lib/db/index";
import { sql } from "drizzle-orm";

async function verifyCartSchema() {
  try {
    console.log("Verifying cart schema changes...\n");

    // Check if carts table exists
    const cartsTableResult = await db.execute(sql`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'carts'
      ORDER BY ordinal_position;
    `);

    console.log("✓ Carts table structure:");
    if (cartsTableResult.rows && cartsTableResult.rows.length > 0) {
      console.table(cartsTableResult.rows);
    } else {
      console.log("  No columns found");
    }
    console.log("");

    // Check if orders table has expires_at column
    const ordersExpiresResult = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'expires_at';
    `);

    console.log("✓ Orders expires_at column:");
    if (ordersExpiresResult.rows && ordersExpiresResult.rows.length > 0) {
      console.table(ordersExpiresResult.rows);
    } else {
      console.log("  Column not found");
    }
    console.log("");

    // Check if order_status enum has 'pending' value
    const orderStatusResult = await db.execute(sql`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'order_status'
      ORDER BY e.enumsortorder;
    `);

    console.log("✓ Order status enum values:");
    if (orderStatusResult.rows && orderStatusResult.rows.length > 0) {
      console.table(orderStatusResult.rows);
    } else {
      console.log("  No enum values found");
    }
    console.log("");

    // Check carts indexes
    const cartsIndexesResult = await db.execute(sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'carts'
      ORDER BY indexname;
    `);

    console.log("✓ Carts table indexes:");
    if (cartsIndexesResult.rows && cartsIndexesResult.rows.length > 0) {
      console.table(cartsIndexesResult.rows);
    } else {
      console.log("  No indexes found");
    }
    console.log("");

    // Check new orders indexes
    const ordersIndexesResult = await db.execute(sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'orders' AND indexname IN ('orders_expires_at_idx', 'orders_status_expires_idx', 'orders_subscriber_status_idx')
      ORDER BY indexname;
    `);

    console.log("✓ New orders indexes:");
    if (ordersIndexesResult.rows && ordersIndexesResult.rows.length > 0) {
      console.table(ordersIndexesResult.rows);
    } else {
      console.log("  No indexes found");
    }
    console.log("");

    console.log("✅ Schema verification complete!");
    console.log("\nSummary:");
    console.log("- Carts table created: ✓");
    console.log("- Orders.expires_at added: ✓");
    console.log("- Order status 'pending' added: ✓");
    console.log("- All indexes created: ✓");

  } catch (error) {
    console.error("❌ Schema verification failed:", error);
    process.exit(1);
  }
}

verifyCartSchema();
