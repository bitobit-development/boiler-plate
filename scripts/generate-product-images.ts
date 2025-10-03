#!/usr/bin/env npx tsx
/**
 * Product Image Generation Script
 * Generates AI product images using OpenAI DALL-E 3 and updates the database
 *
 * Usage:
 * npx tsx scripts/generate-product-images.ts --product "greendoor-x2"  # Generate for single product
 * npx tsx scripts/generate-product-images.ts --all                     # Generate for all products
 * npx tsx scripts/generate-product-images.ts --category "pre_roll"     # Generate for category
 */

import { config } from 'dotenv';
import { resolve, join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { createWriteStream } from 'fs';

// Load environment variables BEFORE any other imports that need them
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '@/lib/db';
import { products, Product } from '@/lib/db/schema/products';
import { generateImage } from '@/lib/openai';
import { eq, and, isNull, or } from 'drizzle-orm';

// ====================================
// CONSTANTS
// ====================================

const IMAGE_DIR = resolve(process.cwd(), 'public/images/products');
const DALL_E_CONFIG = {
  model: 'dall-e-3' as const,
  size: '1792x1024' as const,  // Landscape format - matches ProductCard aspect ratio
  quality: 'standard' as const,
  n: 1,
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // Start with 1 second delay

// Color palette for different product types (simplified for cleaner look)
const PRODUCT_COLORS = {
  pre_roll: 'minimalist green accents',
  dab: 'elegant gold details',
  edible: 'subtle purple touches',
  vape: 'sleek blue highlights',
  flower: 'natural green tones',
  concentrate: 'refined amber accents',
  accessory: 'modern black elements',
};

// ====================================
// TYPES
// ====================================

interface GenerationOptions {
  product?: string;
  all?: boolean;
  category?: string;
  dryRun?: boolean;
}

interface GenerationResult {
  productId: string;
  productName: string;
  slug: string;
  success: boolean;
  imageUrl?: string;
  error?: string;
  attempts: number;
}

// ====================================
// HELPER FUNCTIONS
// ====================================

/**
 * Generate DALL-E prompt for a product
 *
 * Updated to ensure clean white backgrounds like Indoor x1 style:
 * - Emphasizes "isolated product" and "no props"
 * - Specifies "pure white background"
 * - Avoids environmental elements
 */
function generatePrompt(product: Product): string {
  const productType = product.productType || 'product';
  const colors = PRODUCT_COLORS[productType as keyof typeof PRODUCT_COLORS] || 'clean modern design';

  // Universal template for clean isolated product shots
  // Key changes:
  // 1. Added "isolated product shot" to prevent background elements
  // 2. Specified "pure white background, no props or surfaces"
  // 3. Removed "wide angle" which can add environment
  // 4. Added "floating product" to ensure isolation
  const basePrompt = `Isolated product photography of ${product.name} cannabis package, ${colors}, floating product on pure white background, no props or surfaces, clean studio lighting, e-commerce style, centered composition, product only`;

  // Add specific details if available (kept minimal)
  const details: string[] = [];

  if (product.weight) {
    details.push(`${product.weight} visible`);
  }

  if (product.potency) {
    details.push(`${product.potency} marked`);
  }

  const detailsString = details.length > 0 ? `, ${details.join(', ')}` : '';

  // Final prompt under 400 characters
  return `${basePrompt}${detailsString}, professional quality`;
}

/**
 * Sleep function for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Download image from URL to local file system
 */
async function downloadImage(url: string, filepath: string): Promise<void> {
  console.log(`  → Downloading image to ${filepath}...`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    writeFileSync(filepath, Buffer.from(buffer));

    console.log(`  ✓ Image saved successfully`);
  } catch (error) {
    console.error(`  ✗ Download failed:`, error);
    throw error;
  }
}

/**
 * Retry wrapper with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = RETRY_DELAY
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`  ⟳ Retry ${attempt}/${maxRetries} after ${delay}ms delay...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Fetch product from database by slug
 */
async function fetchProduct(slug: string): Promise<Product | null> {
  console.log(`\n📦 Fetching product: ${slug}`);

  try {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (!product) {
      console.log(`  ✗ Product not found with slug: ${slug}`);
      return null;
    }

    console.log(`  ✓ Found: ${product.name} (${product.productType})`);
    return product;
  } catch (error) {
    console.error(`  ✗ Database error:`, error);
    throw error;
  }
}

/**
 * Fetch all products that need images
 */
async function fetchProductsNeedingImages(category?: string): Promise<Product[]> {
  console.log(`\n📦 Fetching products that need images...`);

  try {
    let query = db
      .select()
      .from(products)
      .where(
        and(
          or(isNull(products.imageUrl), eq(products.imageUrl, '')),
          eq(products.status, 'active')
        )
      );

    if (category) {
      query = query.where(eq(products.productType, category as any));
      console.log(`  → Filtering by category: ${category}`);
    }

    const productList = await query;

    console.log(`  ✓ Found ${productList.length} products needing images`);
    return productList;
  } catch (error) {
    console.error(`  ✗ Database error:`, error);
    throw error;
  }
}

/**
 * Update product image URL in database
 */
async function updateProductImage(productId: string, imagePath: string): Promise<void> {
  console.log(`  → Updating database with image path: ${imagePath}`);

  try {
    await db
      .update(products)
      .set({
        imageUrl: imagePath,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));

    console.log(`  ✓ Database updated successfully`);
  } catch (error) {
    console.error(`  ✗ Database update failed:`, error);
    throw error;
  }
}

/**
 * Generate image for a single product
 */
async function generateImageForProduct(
  product: Product,
  dryRun: boolean = false
): Promise<GenerationResult> {
  console.log(`\n🎨 Generating image for: ${product.name}`);

  const result: GenerationResult = {
    productId: product.id,
    productName: product.name,
    slug: product.slug,
    success: false,
    attempts: 0,
  };

  try {
    // Generate DALL-E prompt
    const prompt = generatePrompt(product);
    console.log(`  → Prompt: ${prompt.substring(0, 100)}...`);

    if (dryRun) {
      console.log(`  ⚠ DRY RUN: Skipping actual generation`);
      result.success = true;
      result.imageUrl = `/images/products/${product.slug}.png`;
      return result;
    }

    // Generate image with retries
    const imageData = await retryWithBackoff(async () => {
      result.attempts++;
      console.log(`  → Calling DALL-E 3 API (attempt ${result.attempts})...`);
      return await generateImage(prompt, DALL_E_CONFIG);
    });

    if (!imageData || imageData.length === 0 || !imageData[0].url) {
      throw new Error('No image URL returned from DALL-E API');
    }

    const generatedUrl = imageData[0].url;
    console.log(`  ✓ Image generated successfully`);

    if (imageData[0].revised_prompt) {
      console.log(`  → Revised prompt: ${imageData[0].revised_prompt.substring(0, 100)}...`);
    }

    // Download and save image
    const filename = `${product.slug}.png`;
    const filepath = join(IMAGE_DIR, filename);
    const publicPath = `/images/products/${filename}`;

    await downloadImage(generatedUrl, filepath);

    // Update database
    await updateProductImage(product.id, publicPath);

    result.success = true;
    result.imageUrl = publicPath;

    console.log(`✅ SUCCESS: Image generated for ${product.name}`);

  } catch (error) {
    result.success = false;
    result.error = error instanceof Error ? error.message : String(error);
    console.error(`❌ FAILED: ${product.name} - ${result.error}`);
  }

  return result;
}

/**
 * Generate images for multiple products
 */
async function generateImagesForProducts(
  productList: Product[],
  dryRun: boolean = false
): Promise<GenerationResult[]> {
  const results: GenerationResult[] = [];

  console.log(`\n🚀 Starting batch generation for ${productList.length} products`);

  for (let i = 0; i < productList.length; i++) {
    const product = productList[i];
    console.log(`\n[${i + 1}/${productList.length}] Processing ${product.name}`);

    const result = await generateImageForProduct(product, dryRun);
    results.push(result);

    // Add delay between API calls to avoid rate limiting
    if (i < productList.length - 1 && !dryRun) {
      console.log(`  ⏳ Waiting 2 seconds before next generation...`);
      await sleep(2000);
    }
  }

  return results;
}

/**
 * Print summary of generation results
 */
function printSummary(results: GenerationResult[]): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 GENERATION SUMMARY`);
  console.log(`${'='.repeat(60)}`);

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✅ Successful: ${successful.length}`);
  successful.forEach(r => {
    console.log(`  • ${r.productName} → ${r.imageUrl}`);
  });

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}`);
    failed.forEach(r => {
      console.log(`  • ${r.productName}: ${r.error}`);
    });
  }

  const totalAttempts = results.reduce((sum, r) => sum + r.attempts, 0);
  console.log(`\n📈 Statistics:`);
  console.log(`  • Total products: ${results.length}`);
  console.log(`  • Success rate: ${((successful.length / results.length) * 100).toFixed(1)}%`);
  console.log(`  • Total API calls: ${totalAttempts}`);
  console.log(`  • Average attempts per product: ${(totalAttempts / results.length).toFixed(1)}`);

  console.log(`\n${'='.repeat(60)}`);
}

// ====================================
// MAIN FUNCTION
// ====================================

async function main() {
  console.log(`${'='.repeat(60)}`);
  console.log(`🤖 AI PRODUCT IMAGE GENERATOR`);
  console.log(`${'='.repeat(60)}`);

  // Parse command-line arguments
  const args = process.argv.slice(2);
  const options: GenerationOptions = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--product':
        options.product = args[++i];
        break;
      case '--all':
        options.all = true;
        break;
      case '--category':
        options.category = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
        console.log(`
Usage:
  npx tsx scripts/generate-product-images.ts [options]

Options:
  --product <slug>     Generate image for a single product by slug
  --all                Generate images for all products missing images
  --category <type>    Generate images for a specific product category
  --dry-run            Test run without calling API or saving files
  --help               Show this help message

Examples:
  npx tsx scripts/generate-product-images.ts --product "greendoor-x2"
  npx tsx scripts/generate-product-images.ts --all
  npx tsx scripts/generate-product-images.ts --category "pre_roll"
  npx tsx scripts/generate-product-images.ts --product "greendoor-x2" --dry-run
        `);
        process.exit(0);
    }
  }

  // Validate arguments
  if (!options.product && !options.all && !options.category) {
    console.error(`\n❌ ERROR: You must specify --product, --all, or --category`);
    console.log(`Run with --help for usage information`);
    process.exit(1);
  }

  if (options.dryRun) {
    console.log(`\n⚠️  DRY RUN MODE - No actual API calls or file saves`);
  }

  // Ensure image directory exists
  if (!existsSync(IMAGE_DIR)) {
    console.log(`\n📁 Creating image directory: ${IMAGE_DIR}`);
    mkdirSync(IMAGE_DIR, { recursive: true });
  }

  try {
    let results: GenerationResult[] = [];

    if (options.product) {
      // Single product mode
      const product = await fetchProduct(options.product);

      if (!product) {
        console.error(`\n❌ Product not found: ${options.product}`);
        process.exit(1);
      }

      const result = await generateImageForProduct(product, options.dryRun);
      results = [result];

    } else if (options.all || options.category) {
      // Batch mode
      const productList = await fetchProductsNeedingImages(options.category);

      if (productList.length === 0) {
        console.log(`\n✅ No products need images`);
        process.exit(0);
      }

      results = await generateImagesForProducts(productList, options.dryRun);
    }

    // Print summary
    printSummary(results);

    // Exit with appropriate code
    const hasFailures = results.some(r => !r.success);
    process.exit(hasFailures ? 1 : 0);

  } catch (error) {
    console.error(`\n❌ FATAL ERROR:`, error);
    process.exit(1);
  }
}

// ====================================
// SCRIPT ENTRY POINT
// ====================================

// Check for required environment variables
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

// Run main function
main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});