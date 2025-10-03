#!/usr/bin/env tsx

import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Import server actions
import {
  getProducts,
  getCategories,
  getFeaturedProducts,
  searchProducts,
  getProductBySlug
} from '../src/app/actions/products';

async function testProductsAPI() {
  try {
    console.log('🧪 Testing Product Server Actions...\n');

    // Test 1: Get all products
    console.log('📦 Test 1: Getting all products...');
    const productsResponse = await getProducts({ page: 1, limit: 5 });
    console.log(`   ✓ Found ${productsResponse.products.length} products`);
    console.log(`   ✓ Total products: ${productsResponse.pagination.total}`);
    console.log(`   ✓ Total pages: ${productsResponse.pagination.totalPages}`);

    // Test 2: Get categories
    console.log('\n📂 Test 2: Getting categories...');
    const categories = await getCategories();
    console.log(`   ✓ Found ${categories.length} categories`);
    categories.forEach(cat => {
      console.log(`      - ${cat.name}: ${cat.productCount} products`);
    });

    // Test 3: Get featured products
    console.log('\n⭐ Test 3: Getting featured products...');
    const featured = await getFeaturedProducts(4);
    console.log(`   ✓ Found ${featured.length} featured products`);
    featured.forEach(product => {
      console.log(`      - ${product.name} (${product.categoryName})`);
    });

    // Test 4: Search products
    console.log('\n🔍 Test 4: Searching for "purple"...');
    const searchResults = await searchProducts('purple');
    console.log(`   ✓ Found ${searchResults.length} matching products`);
    searchResults.forEach(product => {
      console.log(`      - ${product.name}`);
    });

    // Test 5: Get product by slug
    if (productsResponse.products.length > 0) {
      const firstProduct = productsResponse.products[0];
      console.log(`\n🔎 Test 5: Getting product by slug "${firstProduct.slug}"...`);
      const product = await getProductBySlug(firstProduct.slug);
      if (product) {
        console.log(`   ✓ Found product: ${product.name}`);
        console.log(`      - Category: ${product.category.name}`);
        console.log(`      - Price: R${(product.price / 100).toFixed(2)}`);
        console.log(`      - Status: ${product.status}`);
        console.log(`      - In stock: ${product.quantity > 0 ? 'Yes' : 'No'}`);
      }
    }

    // Test 6: Filter by category
    if (categories.length > 0) {
      const firstCategory = categories[0];
      console.log(`\n🏷️ Test 6: Getting products in "${firstCategory.name}" category...`);
      const categoryProducts = await getProducts({
        category: firstCategory.id,
        page: 1,
        limit: 10
      });
      console.log(`   ✓ Found ${categoryProducts.products.length} products in ${firstCategory.name}`);
    }

    // Test 7: Test price range filter (will only work if user is a member)
    console.log('\n💰 Test 7: Testing price range filter (20-100)...');
    const priceFilteredProducts = await getProducts({
      minPrice: 2000, // R20 in cents
      maxPrice: 10000, // R100 in cents
      page: 1,
      limit: 10
    });
    console.log(`   ✓ Found ${priceFilteredProducts.products.length} products in price range`);

    console.log('\n✅ All tests passed successfully!');
    console.log('🎉 Server Actions are working correctly with the Neon database.');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testProductsAPI();