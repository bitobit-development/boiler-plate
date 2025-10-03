#!/usr/bin/env npx tsx
/**
 * Quick script to check products in the database
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables BEFORE any other imports
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '@/lib/db';
import { products } from '@/lib/db/schema/products';
import { eq, like, isNull, or } from 'drizzle-orm';

async function main() {
  console.log('📦 Checking products in database...\n');

  try {
    // Find all products
    const allProducts = await db.select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      productType: products.productType,
      imageUrl: products.imageUrl,
      status: products.status,
      price: products.price,
    }).from(products);

    console.log(`Total products: ${allProducts.length}\n`);

    // Group by product type
    const byType: Record<string, typeof allProducts> = {};
    allProducts.forEach(product => {
      const type = product.productType || 'unknown';
      if (!byType[type]) byType[type] = [];
      byType[type].push(product);
    });

    console.log('By Product Type:');
    Object.entries(byType).forEach(([type, items]) => {
      console.log(`  ${type}: ${items.length} products`);
    });

    // Check for Greendoor products
    console.log('\n🔍 Searching for Greendoor products...');
    const greendoorProducts = allProducts.filter(p =>
      p.name?.toLowerCase().includes('greendoor') ||
      p.slug?.includes('greendoor')
    );

    if (greendoorProducts.length > 0) {
      console.log(`Found ${greendoorProducts.length} Greendoor products:\n`);
      greendoorProducts.forEach(p => {
        console.log(`  • ${p.name}`);
        console.log(`    Slug: ${p.slug}`);
        console.log(`    Type: ${p.productType}`);
        console.log(`    Status: ${p.status}`);
        console.log(`    Price: R${(p.price / 100).toFixed(2)}`);
        console.log(`    Image: ${p.imageUrl || 'NO IMAGE'}`);
        console.log('');
      });
    } else {
      console.log('No Greendoor products found.\n');
    }

    // Products without images
    const withoutImages = allProducts.filter(p => !p.imageUrl || p.imageUrl === '');
    console.log(`\n📷 Products without images: ${withoutImages.length}`);

    if (withoutImages.length > 0 && withoutImages.length <= 20) {
      console.log('Products needing images:');
      withoutImages.forEach(p => {
        console.log(`  • ${p.name} (${p.slug}) - ${p.productType}`);
      });
    }

    // Active products
    const activeProducts = allProducts.filter(p => p.status === 'active');
    console.log(`\n✅ Active products: ${activeProducts.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();