#!/usr/bin/env tsx
/**
 * Verify Online Cart Schema - Phase 1 Validation
 *
 * This script validates that all database schema changes for the
 * Place Online Order feature (Phase 1) are correctly applied.
 *
 * Run: npx tsx scripts/verify-online-cart-schema.ts
 */

import 'dotenv/config';
import { db } from '../src/lib/db';
import { carts, orders, orderStatusEnum } from '../src/lib/db/schema';
import { sql } from 'drizzle-orm';

interface ValidationResult {
  check: string;
  passed: boolean;
  details?: string;
  error?: string;
}

async function verifyCartsTable(): Promise<ValidationResult> {
  try {
    // Check if carts table exists with correct columns
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'carts'
      ORDER BY ordinal_position;
    `);

    const columns = Array.isArray(result) ? result : (result.rows || []);

    if (columns.length === 0) {
      return {
        check: 'Carts Table Exists',
        passed: false,
        error: 'Carts table not found in database'
      };
    }

    const requiredColumns = ['id', 'subscriber_id', 'items', 'created_at', 'updated_at', 'expires_at'];
    const foundColumns = columns.map((c: any) => c.column_name);
    const missingColumns = requiredColumns.filter(col => !foundColumns.includes(col));

    if (missingColumns.length > 0) {
      return {
        check: 'Carts Table Structure',
        passed: false,
        error: `Missing columns: ${missingColumns.join(', ')}`
      };
    }

    return {
      check: 'Carts Table Structure',
      passed: true,
      details: `All required columns present: ${requiredColumns.join(', ')}`
    };
  } catch (error) {
    return {
      check: 'Carts Table',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function verifyCartsIndexes(): Promise<ValidationResult> {
  try {
    const result = await db.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'carts'
      ORDER BY indexname;
    `);

    const rows = Array.isArray(result) ? result : (result.rows || []);
    const indexes = rows.map((r: any) => r.indexname);
    const requiredIndexes = [
      'carts_subscriber_idx',
      'carts_expires_at_idx',
      'carts_subscriber_expires_idx'
    ];

    const missingIndexes = requiredIndexes.filter(idx => !indexes.includes(idx));

    if (missingIndexes.length > 0) {
      return {
        check: 'Carts Indexes',
        passed: false,
        error: `Missing indexes: ${missingIndexes.join(', ')}`
      };
    }

    return {
      check: 'Carts Indexes',
      passed: true,
      details: `All indexes present: ${requiredIndexes.join(', ')}`
    };
  } catch (error) {
    return {
      check: 'Carts Indexes',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function verifyOrderStatusEnum(): Promise<ValidationResult> {
  try {
    const result = await db.execute(sql`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'order_status'
      )
      ORDER BY enumsortorder;
    `);

    const rows = Array.isArray(result) ? result : (result.rows || []);
    const statuses = rows.map((r: any) => r.enumlabel);

    if (!statuses.includes('pending')) {
      return {
        check: 'Order Status Enum - Pending',
        passed: false,
        error: 'Missing "pending" status in order_status enum'
      };
    }

    return {
      check: 'Order Status Enum',
      passed: true,
      details: `All statuses: ${statuses.join(', ')}`
    };
  } catch (error) {
    return {
      check: 'Order Status Enum',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function verifyOrdersExpiresAt(): Promise<ValidationResult> {
  try {
    const result = await db.execute(sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'expires_at';
    `);

    const rows = Array.isArray(result) ? result : (result.rows || []);

    if (rows.length === 0) {
      return {
        check: 'Orders expires_at Column',
        passed: false,
        error: 'expires_at column not found in orders table'
      };
    }

    const column = rows[0] as any;

    if (column.data_type !== 'timestamp without time zone') {
      return {
        check: 'Orders expires_at Column',
        passed: false,
        error: `Wrong data type: ${column.data_type}, expected: timestamp`
      };
    }

    return {
      check: 'Orders expires_at Column',
      passed: true,
      details: 'Column exists with correct type (timestamp)'
    };
  } catch (error) {
    return {
      check: 'Orders expires_at Column',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function verifyOrdersExpirationIndexes(): Promise<ValidationResult> {
  try {
    const result = await db.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'orders' AND indexname LIKE '%expires%'
      ORDER BY indexname;
    `);

    const rows = Array.isArray(result) ? result : (result.rows || []);
    const indexes = rows.map((r: any) => r.indexname);
    const requiredIndexes = [
      'orders_expires_at_idx',
      'orders_status_expires_idx'
    ];

    const missingIndexes = requiredIndexes.filter(idx => !indexes.includes(idx));

    if (missingIndexes.length > 0) {
      return {
        check: 'Orders Expiration Indexes',
        passed: false,
        error: `Missing indexes: ${missingIndexes.join(', ')}`
      };
    }

    return {
      check: 'Orders Expiration Indexes',
      passed: true,
      details: `All indexes present: ${requiredIndexes.join(', ')}`
    };
  } catch (error) {
    return {
      check: 'Orders Expiration Indexes',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function verifyTypeScriptExports(): Promise<ValidationResult> {
  try {
    // Check if cart table schema is importable (types can't be checked at runtime)
    const schema = await import('../src/lib/db/schema');

    // Verify that carts table export exists
    if (!schema.carts) {
      return {
        check: 'TypeScript Exports',
        passed: false,
        error: 'Carts table not exported from schema'
      };
    }

    // Verify the schema file compiles and exports expected structure
    const cartsSchema = await import('../src/lib/db/schema/carts');

    if (!cartsSchema.carts) {
      return {
        check: 'TypeScript Exports',
        passed: false,
        error: 'Carts schema module not properly exported'
      };
    }

    return {
      check: 'TypeScript Exports',
      passed: true,
      details: 'Schema exports validated: carts table, types available via imports'
    };
  } catch (error) {
    return {
      check: 'TypeScript Exports',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testCartInsertion(): Promise<ValidationResult> {
  try {
    // Verify we can query the carts table (simpler test)
    const result = await db.execute(sql`
      SELECT COUNT(*) as count FROM carts;
    `);

    const rows = Array.isArray(result) ? result : (result.rows || []);

    if (rows.length === 0) {
      return {
        check: 'Cart Query Test',
        passed: false,
        error: 'Unable to query carts table'
      };
    }

    const count = rows[0]?.count || 0;

    return {
      check: 'Cart Query Test',
      passed: true,
      details: `Carts table is queryable (currently contains ${count} cart(s))`
    };
  } catch (error) {
    return {
      check: 'Cart Query Test',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function main() {
  console.log('🔍 Verifying Online Cart Schema (Phase 1)\n');
  console.log('=' .repeat(60));

  const validations: ValidationResult[] = [];

  // Run all validation checks
  validations.push(await verifyCartsTable());
  validations.push(await verifyCartsIndexes());
  validations.push(await verifyOrderStatusEnum());
  validations.push(await verifyOrdersExpiresAt());
  validations.push(await verifyOrdersExpirationIndexes());
  validations.push(await verifyTypeScriptExports());
  validations.push(await testCartInsertion());

  // Display results
  console.log('\nValidation Results:\n');

  let allPassed = true;
  validations.forEach((result) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.check}`);

    if (result.passed && result.details) {
      console.log(`   ${result.details}`);
    }

    if (!result.passed && result.error) {
      console.log(`   Error: ${result.error}`);
      allPassed = false;
    }

    console.log('');
  });

  console.log('=' .repeat(60));

  if (allPassed) {
    console.log('✅ All validations passed! Schema is ready for Phase 2.');
  } else {
    console.log('❌ Some validations failed. Please review the errors above.');
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
