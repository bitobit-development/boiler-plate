import 'dotenv/config';
import { db } from '../src/lib/db';
import { products } from '../src/lib/db/schema';

async function updateInventory() {
  try {
    console.log('📦 Updating all products inventory to 1000...');

    // Update all products to have 1000 quantity
    const result = await db
      .update(products)
      .set({
        quantity: 1000,
        reserved_quantity: 0
      });

    console.log('✅ Successfully updated all products inventory to 1000');
    console.log('You can now use the POS system with plenty of stock!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating inventory:', error);
    process.exit(1);
  }
}

updateInventory();
