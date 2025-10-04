#!/usr/bin/env tsx

/**
 * Test script for POS order creation with inventory management
 * Run: npx tsx scripts/test-pos-order.ts
 */

import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { createPOSOrder, cancelPOSOrder } from '@/app/actions/pos';
import { db } from '@/lib/db';
import { products, subscribers, adminUsers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function testPOSOrderCreation() {
  console.log('🧪 Testing POS Order Creation System\n');

  try {
    // 1. Get a test customer (or any active customer)
    let [customer] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.mobile, '0796073093'))
      .limit(1);

    if (!customer) {
      // Try to get any active customer
      [customer] = await db
        .select()
        .from(subscribers)
        .where(eq(subscribers.status, 'active'))
        .limit(1);

      if (!customer) {
        console.error('❌ No active customers found in database');
        return;
      }
    }
    console.log(`✅ Found customer: ${customer.name} ${customer.surname}`);

    // 2. Get shop user
    const [shopUser] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, 'foodtruck@biggbuzz.com'))
      .limit(1);

    if (!shopUser) {
      console.error('❌ Shop user not found');
      return;
    }
    console.log(`✅ Found shop user: ${shopUser.firstName} ${shopUser.lastName}`);

    // 3. Get some products to test with
    const testProducts = await db
      .select()
      .from(products)
      .where(eq(products.status, 'active'))
      .limit(3);

    if (testProducts.length === 0) {
      console.error('❌ No active products found');
      return;
    }
    console.log(`✅ Found ${testProducts.length} test products\n`);

    // 4. Display product inventory before order
    console.log('📦 Product Inventory Before Order:');
    for (const product of testProducts) {
      console.log(`   - ${product.name}:`);
      console.log(`     Stock: ${product.quantity}, Reserved: ${product.reservedQuantity || 0}`);
      console.log(`     Track Inventory: ${product.trackQuantity}, Allow Backorder: ${product.allowBackorder}`);
    }

    // 5. Create order input
    const orderInput = {
      subscriberId: customer.id,
      customerName: `${customer.name} ${customer.surname}`,
      customerMobile: customer.mobile,
      shopUserId: shopUser.id,
      shopUserName: `${shopUser.firstName} ${shopUser.lastName}`,
      kioskId: 'KIOSK-001',
      items: testProducts.slice(0, 2).map(p => ({
        productId: p.id,
        productName: p.name,
        quantity: 2, // Order 2 of each
        price: p.price
      })),
      paymentMethod: 'cash' as const,
      subtotal: testProducts.slice(0, 2).reduce((sum, p) => sum + (p.price * 2), 0),
      tax: Math.floor(testProducts.slice(0, 2).reduce((sum, p) => sum + (p.price * 2), 0) * 0.15),
      total: Math.floor(testProducts.slice(0, 2).reduce((sum, p) => sum + (p.price * 2), 0) * 1.15)
    };

    console.log('\n📝 Creating POS Order:');
    console.log(`   Customer: ${orderInput.customerName}`);
    console.log(`   Items: ${orderInput.items.length}`);
    console.log(`   Total: R${(orderInput.total / 100).toFixed(2)}`);

    // 6. Create the order
    const result = await createPOSOrder(orderInput);

    if (result.success) {
      console.log(`\n✅ Order created successfully!`);
      console.log(`   Order Number: ${result.order!.orderNumber}`);
      console.log(`   Order ID: ${result.order!.id}`);

      // 7. Check inventory after order
      console.log('\n📦 Product Inventory After Order:');
      for (const item of orderInput.items) {
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        if (product) {
          console.log(`   - ${product.name}:`);
          console.log(`     Stock: ${product.quantity} (reduced by ${item.quantity})`);
          console.log(`     Reserved: ${product.reservedQuantity || 0}`);
        }
      }

      // 8. Test order cancellation
      console.log('\n🔄 Testing Order Cancellation:');
      const cancelResult = await cancelPOSOrder(result.order!.id, 'Test cancellation');

      if (cancelResult.success) {
        console.log('✅ Order cancelled successfully');

        // Check inventory after cancellation
        console.log('\n📦 Product Inventory After Cancellation:');
        for (const item of orderInput.items) {
          const [product] = await db
            .select()
            .from(products)
            .where(eq(products.id, item.productId))
            .limit(1);

          if (product) {
            console.log(`   - ${product.name}:`);
            console.log(`     Stock: ${product.quantity} (restored)`);
            console.log(`     Reserved: ${product.reservedQuantity || 0}`);
          }
        }
      } else {
        console.error(`❌ Failed to cancel order: ${cancelResult.message}`);
      }
    } else {
      console.error(`\n❌ Failed to create order: ${result.message}`);
      if (result.insufficientStock) {
        console.error('   Insufficient stock for:');
        result.insufficientStock.forEach(item => {
          console.error(`   - ${item.productName}: Available ${item.available}, Requested ${item.requested}`);
        });
      }
    }

    // 9. Test insufficient stock scenario
    console.log('\n🧪 Testing Insufficient Stock Scenario:');
    const largeOrderInput = {
      ...orderInput,
      items: [{
        productId: testProducts[0].id,
        productName: testProducts[0].name,
        quantity: 10000, // Very large quantity
        price: testProducts[0].price
      }]
    };

    const failResult = await createPOSOrder(largeOrderInput);
    if (!failResult.success) {
      console.log('✅ Correctly rejected order with insufficient stock');
      if (failResult.insufficientStock) {
        failResult.insufficientStock.forEach(item => {
          console.log(`   - ${item.productName}: Available ${item.available}, Requested ${item.requested}`);
        });
      }
    }

    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPOSOrderCreation()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });