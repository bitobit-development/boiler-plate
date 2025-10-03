#!/usr/bin/env node

import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { pgTable, uuid, varchar, boolean, timestamp, text, integer, jsonb, date, pgEnum } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';

// Load environment variables
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

// Create postgres client
const client = postgres(connectionString, {
  max: 1,
  prepare: false
});

// Define minimal schema tables for seeding
const adminRoleEnum = pgEnum("admin_role", [
  "super_admin",
  "admin",
  "viewer"
]);

const auditActionEnum = pgEnum("audit_action", [
  "create",
  "read",
  "update",
  "delete",
  "login",
  "logout",
  "export",
  "import",
  "approve",
  "reject"
]);

const subscriberStatusEnum = pgEnum("subscriber_status", [
  "pending",
  "active",
  "suspended",
  "deleted"
]);

const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }),
  role: adminRoleEnum("role").notNull().default("viewer"),
  permissions: jsonb("permissions").default([]),
  isActive: boolean("is_active").notNull().default(true),
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  loginAttempts: integer("login_attempts").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminUserId: uuid("admin_user_id"),
  adminEmail: varchar("admin_email", { length: 255 }).notNull(),
  adminRole: varchar("admin_role", { length: 50 }).notNull(),
  action: auditActionEnum("action").notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id"),
  entityName: varchar("entity_name", { length: 255 }),
  description: text("description").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  userAgent: text("user_agent"),
  riskLevel: integer("risk_level").notNull().default(0),
  isCompliance: boolean("is_compliance").notNull().default(false),
  isSecurity: boolean("is_security").notNull().default(false),
  isSuccess: boolean("is_success").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

const subscribers = pgTable("subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  surname: varchar("surname", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  mobile: varchar("mobile", { length: 20 }).notNull().unique(),
  ageVerified: boolean("age_verified").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  mobileVerified: boolean("mobile_verified").notNull().default(false),
  status: subscriberStatusEnum("status").notNull().default("pending"),
  source: varchar("source", { length: 100 }),
  campaign: varchar("campaign", { length: 100 }),
  registrationIp: varchar("registration_ip", { length: 45 }),
  country: varchar("country", { length: 2 }),
  region: varchar("region", { length: 100 }),
  city: varchar("city", { length: 100 }),
  consentMarketing: boolean("consent_marketing").notNull().default(false),
  consentDataProcessing: boolean("consent_data_processing").notNull().default(true),
  consentTerms: boolean("consent_terms").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

const subscriberAnalytics = pgTable("subscriber_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").notNull(),
  totalSignups: integer("total_signups").notNull().default(0),
  verifiedSignups: integer("verified_signups").notNull().default(0),
  uniqueVisitors: integer("unique_visitors").notNull().default(0),
  conversionRate: integer("conversion_rate").notNull().default(0),
  bySource: jsonb("by_source").default({}),
  byCountry: jsonb("by_country").default({}),
  byDevice: jsonb("by_device").default({}),
  byCampaign: jsonb("by_campaign").default({}),
  avgTimeToVerify: integer("avg_time_to_verify"),
  bounceRate: integer("bounce_rate"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Create drizzle instance
const db = drizzle(client);

async function seedAdmin() {
  try {
    console.log('🔧 Connecting to PostgreSQL...');

    // Test connection
    await client`SELECT 1`;
    console.log('✅ Connected to PostgreSQL');

    // Check if any admin users exist
    const existingAdmins = await db
      .select()
      .from(adminUsers)
      .limit(1);

    if (existingAdmins.length > 0) {
      console.log('ℹ️  Admin users already exist, updating password...');

      // Update the super admin password
      const superAdminEmail = process.env.ADMIN_EMAIL || 'superadmin@biggbuzz.com';
      const superAdminPassword = process.env.ADMIN_PASSWORD || 'Admin2024!@#';
      const passwordHash = await bcrypt.hash(superAdminPassword, 12);

      await db
        .update(adminUsers)
        .set({
          passwordHash,
          isActive: true,
          role: 'super_admin',
          isSuperAdmin: true,
          updatedAt: new Date()
        })
        .where(eq(adminUsers.email, superAdminEmail));

      console.log('✅ Super admin password updated');
      console.log(`   Email: ${superAdminEmail}`);
      console.log(`   Password: ${superAdminPassword}`);

      await client.end();
      return;
    }

    // Create super admin user
    const superAdminEmail = process.env.ADMIN_EMAIL || 'superadmin@biggbuzz.com';
    const superAdminPassword = process.env.ADMIN_PASSWORD || 'Admin2024!@#';

    console.log('\n👤 Creating super admin user...');

    const passwordHash = await bcrypt.hash(superAdminPassword, 12);

    const [adminUser] = await db
      .insert(adminUsers)
      .values({
        email: superAdminEmail,
        username: 'admin',
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        phoneNumber: '+1234567890',
        role: 'super_admin',
        permissions: [
          'view_analytics',
          'manage_users',
          'manage_subscribers',
          'export_data',
          'system_settings',
          'view_audit_logs'
        ],
        isActive: true,
        isSuperAdmin: true,
        mustChangePassword: true,
        twoFactorEnabled: false,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    console.log('  ✅ Created super admin user');
    console.log(`     Email: ${adminUser.email}`);
    console.log(`     Username: ${adminUser.username}`);
    console.log(`     Password: ${superAdminPassword}`);
    console.log('\n⚠️  IMPORTANT: Change the default password after first login!');

    // Create a viewer user for testing
    const viewerPasswordHash = await bcrypt.hash('Viewer@123456!', 12);

    const [viewerUser] = await db
      .insert(adminUsers)
      .values({
        email: 'viewer@biggbuzz.com',
        username: 'viewer',
        passwordHash: viewerPasswordHash,
        firstName: 'Test',
        lastName: 'Viewer',
        phoneNumber: '+1234567891',
        role: 'viewer',
        permissions: ['view_analytics'],
        isActive: true,
        isSuperAdmin: false,
        mustChangePassword: false,
        twoFactorEnabled: false,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    console.log('\n  ✅ Created viewer user');
    console.log(`     Email: ${viewerUser.email}`);
    console.log(`     Username: ${viewerUser.username}`);
    console.log('     Password: Viewer@123456!');

    // Create initial audit log entry
    await db.insert(auditLogs).values({
      adminUserId: adminUser.id,
      adminEmail: adminUser.email,
      adminRole: 'super_admin',
      action: 'create',
      entityType: 'admin_user',
      entityId: adminUser.id,
      entityName: `${adminUser.firstName} ${adminUser.lastName}`,
      description: 'Initial super admin user created via seed script',
      ipAddress: '127.0.0.1',
      userAgent: 'seed-script',
      riskLevel: 0,
      isCompliance: true,
      isSecurity: true,
      isSuccess: true,
      createdAt: new Date()
    });

    console.log('\n✅ Audit log entry created');

    // Create some sample subscriber data for testing
    const sampleSubscribers = [
      {
        name: 'John',
        surname: 'Doe',
        email: 'john.doe@example.com',
        mobile: '+1234567892',
        ageVerified: true,
        emailVerified: true,
        mobileVerified: false,
        status: 'active',
        source: 'website',
        campaign: 'launch',
        registrationIp: '192.168.1.1',
        country: 'US',
        region: 'California',
        city: 'Los Angeles',
        consentMarketing: true,
        consentDataProcessing: true,
        consentTerms: true,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      },
      {
        name: 'Jane',
        surname: 'Smith',
        email: 'jane.smith@example.com',
        mobile: '+1234567893',
        ageVerified: true,
        emailVerified: false,
        mobileVerified: false,
        status: 'pending',
        source: 'social',
        campaign: 'instagram',
        registrationIp: '192.168.1.2',
        country: 'US',
        region: 'New York',
        city: 'New York City',
        consentMarketing: false,
        consentDataProcessing: true,
        consentTerms: true,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      },
      {
        name: 'Bob',
        surname: 'Johnson',
        email: 'bob.johnson@example.com',
        mobile: '+1234567894',
        ageVerified: true,
        emailVerified: true,
        mobileVerified: true,
        status: 'active',
        source: 'referral',
        campaign: 'friend',
        registrationIp: '192.168.1.3',
        country: 'CA',
        region: 'Ontario',
        city: 'Toronto',
        consentMarketing: true,
        consentDataProcessing: true,
        consentTerms: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await db.insert(subscribers).values(sampleSubscribers);
    console.log(`\n✅ ${sampleSubscribers.length} sample subscribers created`);

    // Create sample analytics data
    const today = new Date().toISOString().split('T')[0];

    await db.insert(subscriberAnalytics).values({
      date: today,
      totalSignups: 3,
      verifiedSignups: 2,
      uniqueVisitors: 10,
      conversionRate: 3000,
      bySource: { website: 1, social: 1, referral: 1 },
      byCountry: { US: 2, CA: 1 },
      byDevice: { desktop: 2, mobile: 1 },
      byCampaign: { launch: 1, instagram: 1, friend: 1 },
      avgTimeToVerify: 3600,
      bounceRate: 2000,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ Sample analytics data created');

    // Display summary
    console.log('\n📊 Admin Setup Summary:');
    const adminCount = await db.select().from(adminUsers);
    const subscriberCount = await db.select().from(subscribers);
    console.log(`  - Total admin users: ${adminCount.length}`);
    console.log(`  - Total subscribers: ${subscriberCount.length}`);

    console.log('\n✨ Admin seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n👋 Database connection closed');
  }
}

// Run the seed function
seedAdmin();