#!/usr/bin/env node

import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Now import database and seed function
import { seedProducts } from '../src/lib/db/seed-products';

async function main() {
  try {
    console.log('🚀 Starting product seeding process...');
    console.log('📍 Working directory:', process.cwd());
    console.log('🔧 Database URL:', process.env.DATABASE_URL ? 'Found' : 'Not found');

    await seedProducts();

    console.log('✅ Product seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding products:', error);
    process.exit(1);
  }
}

main();