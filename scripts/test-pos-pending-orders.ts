/**
 * Test POS Pending Orders Lookup Workflow
 *
 * This script tests the complete POS pending orders integration:
 * 1. Creates a test pending order
 * 2. Fetches pending orders for subscriber
 * 3. Converts pending order to POS
 * 4. Verifies order status update
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '../src/lib/db';
import { orders, subscribers, products, adminUsers } from '../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  getPendingOrdersBySubscriber,
  convertPendingOrderToPOS
} from '../src/app/actions/pos';

async function testPOSPendingOrdersWorkflow() {
  console.log('🧪 Starting POS Pending Orders Integration Test\n');

  try {
    // Step 0: Find a test admin/shop user
    console.log('👤 Step 0: Finding test admin/shop user...');
    const [testAdminUser] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.isActive, true))
      .limit(1);

    if (!testAdminUser) {
      throw new Error('No active admin users found for testing');
    }

    console.log('✅ Found admin user:', {
      id: testAdminUser.id,
      username: testAdminUser.username,
      role: testAdminUser.role
    });
    console.log('');

    // Step 1: Find a test subscriber
    console.log('📋 Step 1: Finding test subscriber...');
    const [testSubscriber] = await db
      .select()
      .from(subscribers)
      .where(
        and(
          eq(subscribers.status, 'active'),
          eq(subscribers.mobileVerified, true)
        )
      )
      .limit(1);

    if (!testSubscriber) {
      throw new Error('No active verified subscribers found for testing');
    }

    console.log('✅ Found subscriber:', {
      id: testSubscriber.id,
      name: `${testSubscriber.name} ${testSubscriber.surname}`,
      mobile: testSubscriber.mobile
    });
    console.log('');

    // Step 2: Find test products
    console.log('📦 Step 2: Finding test products...');
    const testProducts = await db
      .select()
      .from(products)
      .where(eq(products.status, 'active'))
      .limit(2);

    if (testProducts.length === 0) {
      throw new Error('No active products found for testing');
    }

    console.log(`✅ Found ${testProducts.length} products`);
    testProducts.forEach(p => {
      console.log(`   - ${p.name} (R${(p.price / 100).toFixed(2)})`);
    });
    console.log('');

    // Step 3: Create a test pending order
    console.log('🛒 Step 3: Creating test pending order...');
    const orderItems = testProducts.map((product, index) => ({
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      quantity: index + 1,
      price: product.memberPrice || product.price,
      subtotal: (index + 1) * (product.memberPrice || product.price)
    }));

    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = Math.round(subtotal * 0.15);
    const total = subtotal + tax;

    const orderNumber = `WEB-TEST-${Date.now()}`;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    const [createdOrder] = await db.insert(orders).values({
      orderNumber,
      orderType: 'online',
      subscriberId: testSubscriber.id,
      customerName: `${testSubscriber.name} ${testSubscriber.surname}`,
      customerMobile: testSubscriber.mobile,
      shopUserId: testAdminUser.id, // Use admin user ID
      shopUserName: testAdminUser.username,
      items: orderItems,
      subtotal,
      tax,
      total,
      status: 'pending',
      paymentStatus: 'pending',
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    console.log('✅ Created pending order:', {
      orderNumber: createdOrder.orderNumber,
      orderId: createdOrder.id,
      items: createdOrder.items.length,
      total: `R${(createdOrder.total / 100).toFixed(2)}`,
      status: createdOrder.status,
      expiresAt: createdOrder.expiresAt?.toISOString()
    });
    console.log('');

    // Step 4: Test getPendingOrdersBySubscriber
    console.log('🔍 Step 4: Fetching pending orders for subscriber...');
    const pendingOrdersResult = await getPendingOrdersBySubscriber(testSubscriber.id);

    if (!pendingOrdersResult.success) {
      throw new Error(`Failed to fetch pending orders: ${pendingOrdersResult.message}`);
    }

    console.log('✅ Pending orders retrieved:', {
      count: pendingOrdersResult.orders.length,
      message: pendingOrdersResult.message
    });

    if (pendingOrdersResult.orders.length > 0) {
      console.log('   Orders:');
      pendingOrdersResult.orders.forEach(order => {
        console.log(`   - ${order.orderNumber}: ${order.items.length} items, R${(order.total / 100).toFixed(2)}`);
      });
    }
    console.log('');

    // Step 5: Test convertPendingOrderToPOS
    console.log('🔄 Step 5: Converting pending order to POS...');
    const conversionResult = await convertPendingOrderToPOS(
      createdOrder.id,
      testAdminUser.id // Use admin user ID
    );

    if (!conversionResult.success) {
      throw new Error(`Failed to convert order: ${conversionResult.message}`);
    }

    console.log('✅ Order converted successfully:', {
      message: conversionResult.message,
      cartItems: conversionResult.cartItems?.length || 0,
      orderStatus: conversionResult.order?.status
    });

    if (conversionResult.cartItems) {
      console.log('   Cart items loaded:');
      conversionResult.cartItems.forEach(item => {
        console.log(`   - ${item.productName}: x${item.quantity} @ R${(item.price / 100).toFixed(2)}`);
      });
    }
    console.log('');

    // Step 6: Verify order status update
    console.log('✔️  Step 6: Verifying order status update...');
    const [verifiedOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, createdOrder.id))
      .limit(1);

    if (!verifiedOrder) {
      throw new Error('Order not found after conversion');
    }

    if (verifiedOrder.status !== 'confirmed') {
      throw new Error(`Expected status 'confirmed', got '${verifiedOrder.status}'`);
    }

    console.log('✅ Order status verified:', {
      orderNumber: verifiedOrder.orderNumber,
      previousStatus: 'pending',
      currentStatus: verifiedOrder.status,
      updatedAt: verifiedOrder.updatedAt.toISOString()
    });
    console.log('');

    // Step 7: Test error handling - try to convert already converted order
    console.log('⚠️  Step 7: Testing error handling (double conversion)...');
    const doubleConversionResult = await convertPendingOrderToPOS(
      createdOrder.id,
      testAdminUser.id
    );

    if (doubleConversionResult.success) {
      throw new Error('Expected conversion to fail for non-pending order');
    }

    console.log('✅ Error handling works:', {
      success: doubleConversionResult.success,
      error: doubleConversionResult.error,
      message: doubleConversionResult.message
    });
    console.log('');

    // Cleanup: Delete test order
    console.log('🧹 Cleanup: Removing test order...');
    await db.delete(orders).where(eq(orders.id, createdOrder.id));
    console.log('✅ Test order cleaned up');
    console.log('');

    // Summary
    console.log('═══════════════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log('Test Results:');
    console.log('  ✅ Subscriber lookup');
    console.log('  ✅ Product lookup');
    console.log('  ✅ Pending order creation');
    console.log('  ✅ getPendingOrdersBySubscriber()');
    console.log('  ✅ convertPendingOrderToPOS()');
    console.log('  ✅ Order status update (pending → confirmed)');
    console.log('  ✅ Error handling (double conversion)');
    console.log('');
    console.log('POS Pending Orders Integration: READY FOR PRODUCTION ✅');

  } catch (error) {
    console.error('');
    console.error('❌ TEST FAILED');
    console.error('═══════════════════════════════════════════════');
    console.error('Error:', error instanceof Error ? error.message : error);
    console.error('');
    process.exit(1);
  }
}

// Run the test
testPOSPendingOrdersWorkflow()
  .then(() => {
    console.log('');
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('Test failed with unhandled error:', error);
    process.exit(1);
  });
