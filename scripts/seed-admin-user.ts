#!/usr/bin/env ts-node

/**
 * Seed script to create a superadmin user for testing
 */

import { AdminUser } from '../src/lib/db/models/AdminUser';
import { hashPassword } from '../src/lib/auth/password';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function seedAdminUser() {
  console.log('Creating superadmin user...\n');

  try {
    const email = 'superadmin@biggbuzz.com';
    const password = 'Admin2024!@#';

    // Check if user already exists
    const existingUser = await AdminUser.findOne({ email });

    if (existingUser) {
      console.log('✅ Superadmin user already exists');
      console.log('   Email:', email);
      console.log('   Password:', password);
      console.log('   Role:', existingUser.role);
      return;
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create the superadmin user
    const user = await AdminUser.create({
      email,
      passwordHash: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin',
      isActive: true,
      isSuperAdmin: true,
      permissions: ['*'], // All permissions
      twoFactorEnabled: false,
    });

    console.log('✅ Superadmin user created successfully');
    console.log('   ID:', user.id);
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('   Role:', user.role);
    console.log('\n   You can now login with these credentials');

  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    process.exit(1);
  }
}

// Run the seed
seedAdminUser()
  .then(() => {
    console.log('\n✅ Seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });