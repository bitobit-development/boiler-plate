#!/usr/bin/env node

/**
 * Seed script to create a superadmin user for testing
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Setup __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/biggbuzz';

// Admin User Schema (simplified)
const adminUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  firstName: String,
  lastName: String,
  role: { type: String, default: 'admin' },
  isActive: { type: Boolean, default: true },
  isSuperAdmin: { type: Boolean, default: false },
  permissions: [String],
  twoFactorEnabled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const AdminUser = mongoose.model('AdminUser', adminUserSchema);

async function seedAdminUser() {
  console.log('Connecting to MongoDB...');
  console.log('URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//<username>:<password>@'));

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const email = 'superadmin@biggbuzz.com';
    const password = 'Admin2024!@#';

    // Check if user already exists
    const existingUser = await AdminUser.findOne({ email });

    if (existingUser) {
      console.log('✅ Superadmin user already exists');
      console.log('   Email:', email);
      console.log('   Password:', password);
      console.log('   Role:', existingUser.role);
      console.log('   Is Active:', existingUser.isActive);

      // Update password if needed
      const hashedPassword = await bcrypt.hash(password, 12);
      existingUser.passwordHash = hashedPassword;
      existingUser.isActive = true;
      existingUser.role = 'super_admin';
      existingUser.isSuperAdmin = true;
      await existingUser.save();
      console.log('\n   Password has been reset to:', password);

      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

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
    console.log('   ID:', user._id);
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('   Role:', user.role);
    console.log('\n   You can now login with these credentials');

  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the seed
seedAdminUser()
  .then(() => {
    console.log('✅ Seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });