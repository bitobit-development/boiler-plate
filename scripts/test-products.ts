#!/usr/bin/env tsx

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

// Import server actions
import {
  getProducts,
  getCategories,
  getFeaturedProducts,
  getProductBySlug,
} from "../src/app/actions/products";

async function testProductActions() {
  console.log("🧪 Testing Product Server Actions...\n");

  try {
    // Test 1: Get all categories
    console.log("📋 Test 1: Fetching categories...");
    const categoriesResult = await getCategories();
    if (categoriesResult.success) {
      console.log(`✅ Found ${categoriesResult.data.length} categories:`);
      categoriesResult.data.forEach(cat => {
        console.log(`   - ${cat.name} (${cat.slug}) - ${cat.productCount || 0} products`);
      });
    } else {
      console.log("❌ Failed to fetch categories:", categoriesResult.error);
    }

    console.log("\n" + "=".repeat(50) + "\n");

    // Test 2: Get all products
    console.log("📦 Test 2: Fetching products...");
    const productsResult = await getProducts({ page: 1, limit: 20 });
    if (productsResult.success) {
      const { products, total, page, limit } = productsResult.data;
      console.log(`✅ Found ${total} total products (showing page ${page} of ${Math.ceil(total / limit)})`);
      console.log("First 5 products:");
      products.slice(0, 5).forEach(product => {
        const priceDisplay = product.price !== null
          ? `R${(product.price / 100).toFixed(2)}`
          : "Members only";
        console.log(`   - ${product.name} (${product.productType}) - ${priceDisplay}`);
      });
    } else {
      console.log("❌ Failed to fetch products:", productsResult.error);
    }

    console.log("\n" + "=".repeat(50) + "\n");

    // Test 3: Get featured products
    console.log("⭐ Test 3: Fetching featured products...");
    const featuredResult = await getFeaturedProducts(5);
    if (featuredResult.success) {
      console.log(`✅ Found ${featuredResult.data.length} featured products:`);
      featuredResult.data.forEach(product => {
        const priceDisplay = product.price !== null
          ? `R${(product.price / 100).toFixed(2)}`
          : "Members only";
        console.log(`   - ${product.name} - ${priceDisplay}`);
      });
    } else {
      console.log("❌ Failed to fetch featured products:", featuredResult.error);
    }

    console.log("\n" + "=".repeat(50) + "\n");

    // Test 4: Get product by category
    console.log("🏷️ Test 4: Fetching products by category (pre-rolls)...");
    const categoryProducts = await getProducts({ category: "pre-rolls", limit: 5 });
    if (categoryProducts.success) {
      const { products, total } = categoryProducts.data;
      console.log(`✅ Found ${total} pre-rolls:`);
      products.forEach(product => {
        const priceDisplay = product.price !== null
          ? `R${(product.price / 100).toFixed(2)}`
          : "Members only";
        console.log(`   - ${product.name} (${product.weight}) - ${priceDisplay}`);
      });
    } else {
      console.log("❌ Failed to fetch category products:", categoryProducts.error);
    }

    console.log("\n" + "=".repeat(50) + "\n");

    // Test 5: Get single product by slug
    console.log("🔍 Test 5: Fetching single product (indoor-preroll-x2)...");
    const productResult = await getProductBySlug("indoor-preroll-x2");
    if (productResult.success && productResult.data) {
      const product = productResult.data;
      console.log("✅ Product details:");
      console.log(`   Name: ${product.name}`);
      console.log(`   Type: ${product.productType}`);
      console.log(`   Category: ${product.category?.name || "N/A"}`);
      console.log(`   Weight: ${product.weight}`);
      console.log(`   Potency: ${product.potency}`);
      console.log(`   THC: ${product.thcContent}%`);
      console.log(`   Price: ${product.price !== null ? `R${(product.price / 100).toFixed(2)}` : "Members only"}`);
      console.log(`   Stock: ${product.quantity} units`);
    } else if (productResult.success) {
      console.log("❌ Product not found");
    } else {
      console.log("❌ Failed to fetch product:", productResult.error);
    }

    console.log("\n" + "=".repeat(50) + "\n");

    // Test 6: Search products
    console.log("🔎 Test 6: Searching for 'indoor' products...");
    const searchResult = await getProducts({ search: "indoor" });
    if (searchResult.success) {
      const { products, total } = searchResult.data;
      console.log(`✅ Found ${total} products matching 'indoor':`);
      products.slice(0, 3).forEach(product => {
        console.log(`   - ${product.name}`);
      });
    } else {
      console.log("❌ Failed to search products:", searchResult.error);
    }

    console.log("\n" + "=".repeat(50) + "\n");

    // Test 7: Price filtering (only works for members)
    console.log("💰 Test 7: Filtering products by price (R300-R800)...");
    const priceFilterResult = await getProducts({
      minPrice: 30000, // R300 in cents
      maxPrice: 80000, // R800 in cents
      limit: 10
    });
    if (priceFilterResult.success) {
      const { products, total } = priceFilterResult.data;
      console.log(`✅ Found ${total} products in price range:`);
      products.forEach(product => {
        const priceDisplay = product.price !== null
          ? `R${(product.price / 100).toFixed(2)}`
          : "Members only";
        console.log(`   - ${product.name} - ${priceDisplay}`);
      });
    } else {
      console.log("❌ Failed to filter by price:", priceFilterResult.error);
    }

    console.log("\n✨ All tests completed!");

  } catch (error) {
    console.error("🚨 Test failed with error:", error);
    process.exit(1);
  }
}

// Run tests
testProductActions()
  .then(() => {
    console.log("\n✅ All tests passed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Tests failed:", error);
    process.exit(1);
  });