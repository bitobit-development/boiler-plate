import { config } from 'dotenv';
import postgres from 'postgres';
import { z } from 'zod';

// Load environment variables
config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString, { max: 1, prepare: false });

// Copied validation schema from src/lib/validations/subscription.ts
const subscriptionSchema = z.object({
  name: z.string().min(2, "Please enter your first name"),
  surname: z.string().min(2, "Please enter your last name"),
  email: z.string().email("Please enter a valid email address"),
  mobile: z.string().regex(/^\d{10}$/, "Please enter a valid 10-digit mobile number"),
  ageVerified: z.boolean().refine((val) => val === true, {
    message: "You must be 18 or older to subscribe",
  }),
});

// Simulate the Server Action logic
async function testSubscribeAction(formData) {
  try {
    console.log('📝 Testing submission with:', formData);

    const validatedData = subscriptionSchema.parse(formData);
    console.log('✅ Validation passed');

    // Check for duplicate email
    console.log('🔍 Checking for existing email...');
    const existingSubscriber = await client`
      SELECT * FROM subscribers
      WHERE email = ${validatedData.email}
      LIMIT 1
    `;

    if (existingSubscriber.length > 0) {
      console.log('❌ DUPLICATE FOUND - Should show error');
      return {
        success: false,
        error: "This email is already subscribed to Bigg Buzz",
        field: "email",
      };
    }

    console.log('✅ No duplicate found - Would proceed with insert');
    return { success: true, note: 'Would insert into database (skipped for test)' };

  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

console.log('🧪 Testing Server Action Duplicate Detection\n');
console.log('═══════════════════════════════════════════\n');

// Test 1: Try to register with existing email
console.log('Test 1: Submit EXISTING email (haim@bitobit.co.za)');
const test1 = await testSubscribeAction({
  name: 'Test',
  surname: 'User',
  email: 'haim@bitobit.co.za', // This exists in database
  mobile: '0123456789',
  ageVerified: true,
});
console.log('Result:', test1);
console.log('\n───────────────────────────────────────────\n');

// Test 2: Try to register with new email
console.log('Test 2: Submit NEW email (newuser@test.com)');
const test2 = await testSubscribeAction({
  name: 'New',
  surname: 'User',
  email: 'newuser@test.com', // This doesn't exist
  mobile: '0987654321',
  ageVerified: true,
});
console.log('Result:', test2);
console.log('\n═══════════════════════════════════════════\n');

console.log('✅ Server Action logic test complete');

await client.end();