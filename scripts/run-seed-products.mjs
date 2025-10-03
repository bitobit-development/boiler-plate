#!/usr/bin/env node

import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Dynamically import the seed function
async function main() {
  try {
    console.log('🚀 Starting product seeding process...');
    console.log('📍 Working directory:', process.cwd());
    console.log('🔧 Database URL:', process.env.DATABASE_URL ? 'Found' : 'Not found');

    const seedModule = await import('../src/lib/db/seed-products.ts');
    await seedModule.seedProducts();

    console.log('✅ Product seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding products:', error);
    process.exit(1);
  }
}

main();