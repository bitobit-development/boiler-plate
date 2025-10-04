#!/usr/bin/env tsx
// Test script to verify admin orders page works correctly

import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '@/lib/db';
import { orders, adminUsers } from '@/lib/db/schema';
import { eq, and, gte, lte, or, desc, sql } from 'drizzle-orm';

async function testAdminOrdersQueries() {
  console.log('Testing Admin Orders Page Queries...\n');

  // 1. Test fetching shop users
  console.log('1. Fetching shop users...');
  const shopUsers = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      firstName: adminUsers.firstName,
      lastName: adminUsers.lastName
    })
    .from(adminUsers)
    .where(eq(adminUsers.role, 'shop_user'))
    .orderBy(adminUsers.email);

  console.log(`   Found ${shopUsers.length} shop users`);
  shopUsers.forEach(user => {
    console.log(`   - ${user.email} (${user.firstName} ${user.lastName})`);
  });

  // 2. Test fetching all orders (admin view)
  console.log('\n2. Fetching all orders (no user filter)...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const allOrdersCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(orders)
    .where(and(
      gte(orders.createdAt, today),
      lte(orders.createdAt, tomorrow)
    ));

  console.log(`   Found ${allOrdersCount[0].count} orders today`);

  // 3. Test fetching orders by shop user
  if (shopUsers.length > 0) {
    console.log('\n3. Testing shop user filter...');
    const firstShopUser = shopUsers[0];

    const userOrders = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orders)
      .where(and(
        eq(orders.shopUserId, firstShopUser.id),
        gte(orders.createdAt, today),
        lte(orders.createdAt, tomorrow)
      ));

    console.log(`   ${firstShopUser.email} has ${userOrders[0].count} orders today`);
  }

  // 4. Test order statistics
  console.log('\n4. Testing order statistics...');

  const stats = await db
    .select({
      totalSales: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
      orderCount: sql<number>`COUNT(*)`,
      avgOrderValue: sql<number>`COALESCE(AVG(${orders.total}), 0)`
    })
    .from(orders)
    .where(and(
      gte(orders.createdAt, today),
      lte(orders.createdAt, tomorrow),
      or(
        eq(orders.status, 'confirmed'),
        eq(orders.status, 'fulfilled')
      )!
    ));

  console.log(`   Total Sales: $${(Number(stats[0].totalSales) / 100).toFixed(2)}`);
  console.log(`   Order Count: ${stats[0].orderCount}`);
  console.log(`   Avg Order Value: $${(Number(stats[0].avgOrderValue) / 100).toFixed(2)}`);

  // 5. Test search functionality
  console.log('\n5. Testing search functionality...');

  const searchPattern = '%POS%';
  const searchResults = await db
    .select({
      orderNumber: orders.orderNumber,
      customerName: orders.customerName
    })
    .from(orders)
    .where(sql`LOWER(${orders.orderNumber}) LIKE LOWER(${searchPattern})`)
    .limit(5);

  console.log(`   Found ${searchResults.length} orders matching "POS"`);
  searchResults.forEach(order => {
    console.log(`   - ${order.orderNumber} (${order.customerName || 'No customer'})`);
  });

  console.log('\n✅ All admin orders queries tested successfully!');
}

// Run the test
testAdminOrdersQueries()
  .then(() => {
    console.log('\nTest completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });