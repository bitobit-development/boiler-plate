#!/usr/bin/env tsx

/**
 * Test script to verify the orders page data fetching
 * Run with: npx tsx scripts/test-orders-page.ts
 */

import 'dotenv/config';
import { db } from '../src/lib/db';
import { orders, subscribers, adminUsers } from '../src/lib/db/schema';
import { desc, eq, and, gte, lte, or, sql } from 'drizzle-orm';

async function testOrdersPage() {
  console.log('Testing Orders Page Data Fetching...\n');

  try {
    // Test 1: Get today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('📊 Fetching today\'s orders...');
    const todayOrders = await db
      .select({
        order: orders,
        subscriber: subscribers,
        shopUser: adminUsers
      })
      .from(orders)
      .leftJoin(subscribers, eq(orders.subscriberId, subscribers.id))
      .leftJoin(adminUsers, eq(orders.shopUserId, adminUsers.id))
      .where(
        and(
          gte(orders.createdAt, today),
          lte(orders.createdAt, tomorrow)
        )
      )
      .orderBy(desc(orders.createdAt))
      .limit(10);

    console.log(`Found ${todayOrders.length} orders for today`);
    if (todayOrders.length > 0) {
      console.log('\nSample order:', {
        orderNumber: todayOrders[0].order.orderNumber,
        customer: todayOrders[0].order.customerName,
        total: `R${(todayOrders[0].order.total / 100).toFixed(2)}`,
        status: todayOrders[0].order.status,
        items: todayOrders[0].order.items.length
      });
    }

    // Test 2: Get order statistics
    console.log('\n📈 Calculating order statistics...');
    const [stats] = await db
      .select({
        totalSales: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
        orderCount: sql<number>`COUNT(*)`,
        avgOrderValue: sql<number>`COALESCE(AVG(${orders.total}), 0)`
      })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, today),
          lte(orders.createdAt, tomorrow),
          or(
            eq(orders.status, 'confirmed'),
            eq(orders.status, 'fulfilled')
          )!
        )
      );

    console.log('Today\'s Statistics:');
    console.log(`- Total Sales: R${(Number(stats.totalSales) / 100).toFixed(2)}`);
    console.log(`- Number of Orders: ${stats.orderCount}`);
    console.log(`- Average Order Value: R${(Number(stats.avgOrderValue) / 100).toFixed(2)}`);

    // Test 3: Search functionality
    console.log('\n🔍 Testing search functionality...');
    const searchPattern = '%test%';
    const searchResults = await db
      .select()
      .from(orders)
      .where(
        or(
          sql`LOWER(${orders.orderNumber}) LIKE ${searchPattern}`,
          sql`LOWER(${orders.customerName}) LIKE ${searchPattern}`
        )!
      )
      .limit(5);

    console.log(`Found ${searchResults.length} orders matching "test"`);

    // Test 4: Get all orders (for debugging)
    console.log('\n📋 Getting all recent orders...');
    const allOrders = await db
      .select({
        orderNumber: orders.orderNumber,
        customerName: orders.customerName,
        total: orders.total,
        status: orders.status,
        createdAt: orders.createdAt
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(5);

    if (allOrders.length === 0) {
      console.log('No orders found in the database.');
      console.log('\nTo create test orders:');
      console.log('1. Go to http://localhost:3000/pos');
      console.log('2. Login with: foodtruck@biggbuzz.com / Tsitsi2025!!');
      console.log('3. Process some test orders');
    } else {
      console.log('\nRecent orders:');
      allOrders.forEach(order => {
        console.log(`- ${order.orderNumber}: ${order.customerName || 'Guest'} - R${(order.total / 100).toFixed(2)} (${order.status}) - ${order.createdAt.toLocaleString()}`);
      });
    }

    console.log('\n✅ Orders page data fetching tests completed successfully!');
    console.log('\n📍 Access the orders page at: http://localhost:3000/pos/orders');

  } catch (error) {
    console.error('❌ Error testing orders page:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the test
testOrdersPage();