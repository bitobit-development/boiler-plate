import { db } from './index';
import { adminUsers, subscribers } from './schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

/**
 * Seed database with initial data
 */
export async function seedDatabase() {
  console.log('🌱 Starting database seed...');

  try {
    // Check if admin user already exists
    const existingAdmin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, 'admin@biggbuzz.com'))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log('✅ Admin user already exists, skipping seed');
      return;
    }

    // Create super admin user
    const passwordHash = await bcrypt.hash('admin123', 12);

    await db.insert(adminUsers).values({
      email: 'admin@biggbuzz.com',
      username: 'superadmin',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin',
      isSuperAdmin: true,
      isActive: true,
      permissions: [
        'view_analytics',
        'manage_users',
        'manage_registrations',
        'manage_admins',
        'view_audit_logs',
        'export_data',
        'system_settings',
      ],
      termsAcceptedAt: new Date(),
      privacyAcceptedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created super admin user:');
    console.log('   Email: admin@biggbuzz.com');
    console.log('   Password: admin123');

    // Create sample viewer admin
    const viewerPasswordHash = await bcrypt.hash('viewer123', 12);

    await db.insert(adminUsers).values({
      email: 'viewer@biggbuzz.com',
      username: 'viewer',
      passwordHash: viewerPasswordHash,
      firstName: 'Test',
      lastName: 'Viewer',
      role: 'viewer',
      isSuperAdmin: false,
      isActive: true,
      permissions: ['view_analytics'],
      termsAcceptedAt: new Date(),
      privacyAcceptedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created viewer user:');
    console.log('   Email: viewer@biggbuzz.com');
    console.log('   Password: viewer123');

    // Create sample subscribers for testing
    const sampleSubscribers = [
      {
        name: 'John',
        surname: 'Doe',
        email: 'john.doe@example.com',
        mobile: '+1234567890',
        ageVerified: true,
        emailVerified: true,
        mobileVerified: false,
        status: 'active' as const,
        source: 'website',
        country: 'US',
        consentDataProcessing: true,
        consentTerms: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Jane',
        surname: 'Smith',
        email: 'jane.smith@example.com',
        mobile: '+1234567891',
        ageVerified: true,
        emailVerified: false,
        mobileVerified: false,
        status: 'pending' as const,
        source: 'social',
        country: 'US',
        consentDataProcessing: true,
        consentTerms: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Bob',
        surname: 'Johnson',
        email: 'bob.johnson@example.com',
        mobile: '+1234567892',
        ageVerified: true,
        emailVerified: true,
        mobileVerified: true,
        status: 'active' as const,
        source: 'referral',
        country: 'CA',
        consentDataProcessing: true,
        consentTerms: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await db.insert(subscribers).values(sampleSubscribers);

    console.log(`✅ Created ${sampleSubscribers.length} sample subscribers`);

    console.log('✅ Database seed completed successfully!');
  } catch (error) {
    console.error('❌ Database seed failed:', error);
    throw error;
  }
}

// Run seed if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}
