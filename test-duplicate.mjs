import { config } from 'dotenv';
import postgres from 'postgres';

// Load environment variables
config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL not found in .env.local');
  process.exit(1);
}

console.log('🔍 Testing Duplicate Email Detection\n');

const client = postgres(connectionString, {
  max: 1,
  prepare: false,
});

try {
  // Check all subscribers
  console.log('📊 Current subscribers in database:');
  const allSubscribers = await client`
    SELECT id, name, surname, email, created_at
    FROM subscribers
    ORDER BY created_at DESC
  `;

  console.table(allSubscribers.map(s => ({
    name: `${s.name} ${s.surname}`,
    email: s.email,
    created: new Date(s.created_at).toLocaleString(),
  })));

  console.log(`\n📈 Total subscribers: ${allSubscribers.length}\n`);

  // Check for duplicates
  console.log('🔍 Checking for duplicate emails:');
  const duplicates = await client`
    SELECT email, COUNT(*) as count
    FROM subscribers
    GROUP BY email
    HAVING COUNT(*) > 1
  `;

  if (duplicates.length > 0) {
    console.log('❌ FOUND DUPLICATES:');
    console.table(duplicates);
  } else {
    console.log('✅ No duplicate emails found\n');
  }

  // Check unique constraint
  console.log('🔒 Checking database constraints:');
  const constraints = await client`
    SELECT
      conname as constraint_name,
      contype as constraint_type,
      pg_get_constraintdef(oid) as definition
    FROM pg_constraint
    WHERE conrelid = 'subscribers'::regclass
  `;

  console.table(constraints);

  console.log('\n✅ Test complete');

} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await client.end();
}