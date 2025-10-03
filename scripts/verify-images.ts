#!/usr/bin/env npx tsx
/**
 * Verify generated product images
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync, statSync, readdirSync } from 'fs';

// Load environment variables BEFORE any other imports
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '@/lib/db';
import { products } from '@/lib/db/schema/products';
import { isNotNull } from 'drizzle-orm';

const IMAGE_DIR = resolve(process.cwd(), 'public/images/products');

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function main() {
  console.log('🖼️  Product Image Verification\n');
  console.log('=' .repeat(60));

  // Check directory
  if (!existsSync(IMAGE_DIR)) {
    console.log('❌ Image directory does not exist: ' + IMAGE_DIR);
    process.exit(1);
  }

  // List all image files
  const files = readdirSync(IMAGE_DIR).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));

  console.log(`\n📁 Found ${files.length} image files in /public/images/products/\n`);

  if (files.length > 0) {
    console.log('File Details:');
    console.log('-'.repeat(60));

    files.forEach(file => {
      const filepath = resolve(IMAGE_DIR, file);
      const stats = statSync(filepath);
      const slug = file.replace(/\.(png|jpg)$/, '');

      console.log(`\n📷 ${file}`);
      console.log(`   Size: ${formatBytes(stats.size)}`);
      console.log(`   Created: ${stats.birthtime.toLocaleString()}`);
      console.log(`   Product Slug: ${slug}`);
    });
  }

  // Check database
  console.log('\n' + '='.repeat(60));
  console.log('\n💾 Database Status:\n');

  const productsWithImages = await db
    .select({
      name: products.name,
      slug: products.slug,
      imageUrl: products.imageUrl,
      productType: products.productType,
    })
    .from(products)
    .where(isNotNull(products.imageUrl));

  console.log(`Products with images in database: ${productsWithImages.length}\n`);

  productsWithImages.forEach(product => {
    const filename = product.imageUrl?.split('/').pop();
    const fileExists = filename && files.includes(filename);

    console.log(`• ${product.name} (${product.slug})`);
    console.log(`  Type: ${product.productType}`);
    console.log(`  DB Path: ${product.imageUrl}`);
    console.log(`  File Status: ${fileExists ? '✅ Exists' : '⚠️  Missing'}`);
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Summary:');
  console.log(`• Total image files: ${files.length}`);
  console.log(`• Total products with images in DB: ${productsWithImages.length}`);

  const totalSize = files.reduce((sum, file) => {
    const filepath = resolve(IMAGE_DIR, file);
    return sum + statSync(filepath).size;
  }, 0);

  console.log(`• Total disk usage: ${formatBytes(totalSize)}`);
  console.log(`• Average image size: ${formatBytes(totalSize / files.length)}`);

  console.log('\n✅ Verification complete!\n');
}

main().catch(console.error);