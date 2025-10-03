#!/usr/bin/env node

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
  getProductBySlug,
} from '../src/app/actions/products';

async function testProductActions() {
  console.log('🧪 Testing Product Server Actions...\n');

  try {
    // Test 1: Get all categories
    console.log('1️⃣ Testing getCategories()...');
    const categories = await getCategories();
    console.log(`   ✅ Found ${categories.length} categories`);
    categories.forEach(cat => {
      console.log(`      - ${cat.name}: ${cat.productCount} products`);
    });
    console.log('');

    // Test 2: Get products with pagination
    console.log('2️⃣ Testing getProducts() with pagination...');
    const productsResponse = await getProducts({
      page: 1,
      limit: 5,
      sort: 'created',
      order: 'desc',
    });
    console.log(`   ✅ Found ${productsResponse.pagination.total} total products`);
    console.log(`   📄 Page 1 of ${productsResponse.pagination.totalPages}`);
    console.log(`   🔢 Showing ${productsResponse.products.length} products:`);
    productsResponse.products.forEach(product => {
      console.log(`      - ${product.name} (${product.productType}) - R${(product.price / 100).toFixed(2)}`);
    });
    console.log('');

    // Test 3: Get featured products
    console.log('3️⃣ Testing getFeaturedProducts()...');
    const featured = await getFeaturedProducts(4);
    console.log(`   ✅ Found ${featured.length} featured products`);
    featured.forEach(product => {
      console.log(`      - ${product.name}`);
    });
    console.log('');

    // Test 4: Search products
    console.log('4️⃣ Testing searchProducts("indoor")...');
    const searchResults = await searchProducts('indoor');
    console.log(`   ✅ Found ${searchResults.length} products matching "indoor"`);
    searchResults.forEach(product => {
      console.log(`      - ${product.name}`);
    });
    console.log('');

    // Test 5: Get product by slug
    console.log('5️⃣ Testing getProductBySlug("indoor-pre-roll-x1")...');
    const product = await getProductBySlug('indoor-pre-roll-x1');
    if (product) {
      console.log(`   ✅ Found product: ${product.name}`);
      console.log(`      Category: ${product.category.name}`);
      console.log(`      Price: R${(product.price / 100).toFixed(2)}`);
      console.log(`      Status: ${product.status}`);
      console.log(`      Quantity: ${product.quantity}`);
    } else {
      console.log('   ❌ Product not found');
    }
    console.log('');

    // Test 6: Filter products by category
    console.log('6️⃣ Testing getProducts() with category filter...');
    if (categories.length > 0) {
      const categoryProducts = await getProducts({
        category: categories[0].id,
        page: 1,
        limit: 10,
      });
      console.log(`   ✅ Found ${categoryProducts.pagination.total} products in "${categories[0].name}"`);
    }
    console.log('');

    // Test 7: Filter products with price range (member access simulation)
    console.log('7️⃣ Testing getProducts() with price filter...');
    const priceFiltered = await getProducts({
      minPrice: 5000, // R50
      maxPrice: 20000, // R200
      page: 1,
      limit: 10,
    });
    console.log(`   ✅ Found ${priceFiltered.pagination.total} products between R50-R200`);
    console.log('');

    console.log('✅ All Server Actions tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testProductActions()
  .then(() => {
    console.log('\n🎉 Product Server Actions are working correctly!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });