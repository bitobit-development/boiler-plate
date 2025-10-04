/**
 * Script to test stock level indicators in POS by updating product inventory
 * Usage: npx tsx scripts/test-stock-levels.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '@/lib/db';
import { products } from '@/lib/db/schema/products';
import { eq } from 'drizzle-orm';

async function testStockLevels() {
  console.log('🔧 Setting up test stock levels for POS products...\n');

  try {
    // Get some products to test with
    const allProducts = await db.select().from(products).limit(10);

    if (allProducts.length === 0) {
      console.log('No products found. Please seed the database first.');
      return;
    }

    console.log(`Found ${allProducts.length} products. Setting test stock levels...`);

    // Set various stock levels for testing
    const testScenarios = [
      { name: 'Out of Stock', quantity: 0, allowBackorder: false },
      { name: 'Out of Stock with Override', quantity: 0, allowBackorder: true },
      { name: 'Critical Stock (2 units)', quantity: 2, allowBackorder: false },
      { name: 'Low Stock (5 units)', quantity: 5, allowBackorder: true },
      { name: 'Medium Stock (8 units)', quantity: 8, allowBackorder: false },
      { name: 'Good Stock (15 units)', quantity: 15, allowBackorder: false },
      { name: 'High Stock (50 units)', quantity: 50, allowBackorder: false },
    ];

    // Apply test scenarios to products
    for (let i = 0; i < Math.min(testScenarios.length, allProducts.length); i++) {
      const product = allProducts[i];
      const scenario = testScenarios[i];

      await db
        .update(products)
        .set({
          quantity: scenario.quantity,
          allowBackorder: scenario.allowBackorder,
          trackQuantity: true,
          lowStockThreshold: 5,
        })
        .where(eq(products.id, product.id));

      console.log(
        `✅ ${product.name.substring(0, 30).padEnd(30)} | ${scenario.name.padEnd(30)} | Stock: ${scenario.quantity} | Override: ${scenario.allowBackorder}`
      );
    }

    console.log('\n✨ Stock levels updated successfully!');
    console.log('📱 Visit http://localhost:3000/pos to see the stock indicators in action.');
    console.log('\n🏷️ Legend:');
    console.log('  • Green badge: Stock > 10 units');
    console.log('  • Yellow badge: Stock 5-10 units');
    console.log('  • Red badge: Stock 1-4 units');
    console.log('  • Gray badge: Out of stock');
    console.log('  • Blue "Override OK" badge: Backorder allowed');
  } catch (error) {
    console.error('❌ Error updating stock levels:', error);
  } finally {
    process.exit(0);
  }
}

testStockLevels();