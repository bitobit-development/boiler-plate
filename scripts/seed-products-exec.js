require('dotenv').config({ path: '.env.local' });

// Register TypeScript compiler
require('ts-node/register');

// Import and run seed function
const { seedProducts } = require('../src/lib/db/seed-products');

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