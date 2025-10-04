#!/usr/bin/env node
import { db } from '../src/lib/db';
import { adminUsers } from '../src/lib/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

/**
 * Seed database with shop user account for POS Kiosk
 */
async function seedShopUser() {
  console.log('🏪 Starting shop user seed...');

  try {
    // Check if shop user already exists
    const existingShopUser = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, 'foodtruck@biggbuzz.com'))
      .limit(1);

    if (existingShopUser.length > 0) {
      console.log('✅ Shop user already exists, skipping seed');
      console.log('   Email: foodtruck@biggbuzz.com');
      console.log('   Role: shop_user');
      return;
    }

    // Create shop user with specified credentials
    const passwordHash = await bcrypt.hash('Tsitsi2025!!', 12);

    const [shopUser] = await db.insert(adminUsers).values({
      email: 'foodtruck@biggbuzz.com',
      username: 'foodtruck',
      passwordHash,
      firstName: 'Food',
      lastName: 'Truck',
      role: 'shop_user',
      isSuperAdmin: false,
      isActive: true,
      permissions: [
        'pos_access',
        'process_orders',
        'verify_customers',
        'override_otp',
        'view_products',
        'manage_kiosk_session'
      ],
      phoneNumber: '+27823290001', // Example phone number for the food truck
      termsAcceptedAt: new Date(),
      privacyAcceptedAt: new Date(),
      mustChangePassword: false, // Don't require password change for kiosk user
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    console.log('✅ Successfully created shop user:');
    console.log('   ID: ' + shopUser.id);
    console.log('   Email: foodtruck@biggbuzz.com');
    console.log('   Username: foodtruck');
    console.log('   Password: Tsitsi2025!!');
    console.log('   Role: shop_user');
    console.log('   First Name: Food');
    console.log('   Last Name: Truck');
    console.log('   Status: Active');
    console.log('');
    console.log('📝 Shop User Permissions:');
    console.log('   - POS Access');
    console.log('   - Process Orders');
    console.log('   - Verify Customers');
    console.log('   - Override OTP (with audit logging)');
    console.log('   - View Products');
    console.log('   - Manage Kiosk Sessions');
    console.log('');
    console.log('🔒 Security Notes:');
    console.log('   - This user can only access /pos routes');
    console.log('   - Cannot access /admin routes');
    console.log('   - All OTP overrides are logged for audit');
    console.log('   - Session activity is tracked');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding shop user:', error);
    process.exit(1);
  }
}

// Run the seed function
seedShopUser().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});