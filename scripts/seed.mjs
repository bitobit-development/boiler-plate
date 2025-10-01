import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import crypto from "crypto";
import bcrypt from "bcryptjs";

// Load environment variables
config();

// ====================================
// SECURITY FUNCTIONS (duplicated for seed script)
// ====================================

async function hashPassword(password) {
  // Use bcrypt to match the AdminUser model
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

function generateBackupCodes(count = 10) {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );
}

// ====================================
// DATABASE CONNECTION
// ====================================

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Database connection string not found");
  process.exit(1);
}

const sql = postgres(connectionString, {
  max: 1,
  onnotice: () => {} // Suppress notices
});

const db = drizzle(sql);

// ====================================
// SEED DATA
// ====================================

async function seed() {
  console.log("🌱 Starting database seeding...");

  try {
    // 1. Create admin roles
    console.log("Creating admin roles...");

    const superAdminRole = await db.execute(sql`
      INSERT INTO admin_roles (
        id,
        name,
        description,
        permissions,
        is_system,
        priority
      ) VALUES (
        gen_random_uuid(),
        'super_admin',
        'Super Administrator with full system access',
        ${JSON.stringify({
          users: ["create", "read", "update", "delete", "export", "import"],
          subscribers: ["create", "read", "update", "delete", "export", "import", "approve", "reject"],
          analytics: ["read", "export", "configure"],
          system: ["configure", "maintain", "backup", "restore"],
          compliance: ["audit", "export", "configure", "report"]
        })},
        true,
        100
      )
      ON CONFLICT (name) DO UPDATE SET
        permissions = EXCLUDED.permissions,
        updated_at = NOW()
      RETURNING id
    `);

    await db.execute(sql`
      INSERT INTO admin_roles (
        id,
        name,
        description,
        permissions,
        is_system,
        priority
      ) VALUES (
        gen_random_uuid(),
        'admin',
        'Administrator with standard access',
        ${JSON.stringify({
          users: ["read", "update"],
          subscribers: ["create", "read", "update", "export", "approve", "reject"],
          analytics: ["read", "export"],
          system: [],
          compliance: ["audit", "export"]
        })},
        true,
        50
      ),
      (
        gen_random_uuid(),
        'viewer',
        'Read-only access to system data',
        ${JSON.stringify({
          users: ["read"],
          subscribers: ["read"],
          analytics: ["read"],
          system: [],
          compliance: ["read"]
        })},
        true,
        10
      )
      ON CONFLICT (name) DO UPDATE SET
        permissions = EXCLUDED.permissions,
        updated_at = NOW()
    `);

    console.log("✅ Admin roles created");

    // 2. Create super admin user
    console.log("Creating super admin user...");

    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const hashedPassword = await hashPassword(adminPassword);
    const backupCodes = generateBackupCodes();

    const adminUser = await db.execute(sql`
      INSERT INTO admin_users (
        id,
        email,
        username,
        password_hash,
        first_name,
        last_name,
        phone_number,
        role,
        permissions,
        is_active,
        is_super_admin,
        must_change_password,
        two_factor_enabled,
        backup_codes,
        terms_accepted_at,
        privacy_accepted_at
      ) VALUES (
        gen_random_uuid(),
        ${process.env.ADMIN_EMAIL || 'admin@biggbuzz.com'},
        'superadmin',
        ${hashedPassword},
        'System',
        'Administrator',
        '+1234567890',
        'super_admin',
        ${JSON.stringify(["*"])},
        true,
        true,
        ${process.env.NODE_ENV === 'production'},
        false,
        ${JSON.stringify(backupCodes)},
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        updated_at = NOW()
      RETURNING id, email
    `);

    if (adminUser.rows.length > 0) {
      console.log(`✅ Super admin created: ${adminUser.rows[0].email}`);

      if (process.env.NODE_ENV !== 'production') {
        console.log(`
╔════════════════════════════════════════════════════╗
║         SUPER ADMIN CREDENTIALS                    ║
╠════════════════════════════════════════════════════╣
║  Email:    ${adminUser.rows[0].email.padEnd(40)}║
║  Username: superadmin                              ║
║  Password: ${adminPassword.padEnd(40)}║
║                                                    ║
║  ⚠️  CHANGE THE PASSWORD IMMEDIATELY!              ║
╚════════════════════════════════════════════════════╝

Backup Codes (save these securely):
${backupCodes.map((code, i) => `${(i + 1).toString().padStart(2)}. ${code}`).join('\n')}
        `);
      }
    }

    // 3. Create initial system status entries
    console.log("Creating system status entries...");

    const services = [
      { name: 'database', status: 'healthy' },
      { name: 'web-server', status: 'healthy' },
      { name: 'authentication', status: 'healthy' },
      { name: 'email-service', status: 'healthy' },
      { name: 'analytics', status: 'healthy' },
      { name: 'audit-system', status: 'healthy' }
    ];

    for (const service of services) {
      await db.execute(sql`
        INSERT INTO system_status (
          id,
          service_name,
          status,
          health_score,
          last_check_at
        ) VALUES (
          gen_random_uuid(),
          ${service.name},
          ${service.status},
          100,
          NOW()
        )
        ON CONFLICT DO NOTHING
      `);
    }

    console.log("✅ System status entries created");

    // 4. Create initial analytics aggregation
    console.log("Creating initial analytics entry...");

    await db.execute(sql`
      INSERT INTO subscriber_analytics (
        id,
        date,
        total_signups,
        verified_signups,
        unique_visitors,
        conversion_rate,
        by_source,
        by_country,
        by_device,
        by_campaign
      ) VALUES (
        gen_random_uuid(),
        CURRENT_DATE,
        0,
        0,
        0,
        0,
        '{}',
        '{}',
        '{}',
        '{}'
      )
      ON CONFLICT DO NOTHING
    `);

    console.log("✅ Initial analytics entry created");

    // 5. Add sample subscribers (in development only)
    if (process.env.NODE_ENV !== 'production') {
      console.log("Creating sample subscribers (dev only)...");

      const sampleSubscribers = [
        {
          name: 'John',
          surname: 'Doe',
          email: 'john.doe@example.com',
          mobile: '+12025551234',
          ageVerified: true,
          emailVerified: true,
          status: 'active',
          source: 'website',
          country: 'US'
        },
        {
          name: 'Jane',
          surname: 'Smith',
          email: 'jane.smith@example.com',
          mobile: '+12025551235',
          ageVerified: true,
          emailVerified: false,
          status: 'pending',
          source: 'social_media',
          country: 'US'
        },
        {
          name: 'Bob',
          surname: 'Johnson',
          email: 'bob.j@example.com',
          mobile: '+12025551236',
          ageVerified: true,
          emailVerified: true,
          status: 'active',
          source: 'referral',
          country: 'CA'
        }
      ];

      for (const subscriber of sampleSubscribers) {
        await db.execute(sql`
          INSERT INTO subscribers (
            id,
            name,
            surname,
            email,
            mobile,
            age_verified,
            email_verified,
            status,
            source,
            country,
            engagement_score
          ) VALUES (
            gen_random_uuid(),
            ${subscriber.name},
            ${subscriber.surname},
            ${subscriber.email},
            ${subscriber.mobile},
            ${subscriber.ageVerified},
            ${subscriber.emailVerified},
            ${subscriber.status},
            ${subscriber.source},
            ${subscriber.country},
            ${Math.floor(Math.random() * 100)}
          )
          ON CONFLICT (email) DO NOTHING
        `);
      }

      console.log("✅ Sample subscribers created");
    }

    // 6. Create initial audit log entry
    console.log("Creating initial audit log...");

    const adminResult = await db.execute(sql`
      SELECT id, email FROM admin_users WHERE is_super_admin = true LIMIT 1
    `);

    if (adminResult.rows.length > 0) {
      await db.execute(sql`
        INSERT INTO audit_logs (
          id,
          admin_user_id,
          admin_email,
          admin_role,
          action,
          entity_type,
          description,
          ip_address,
          risk_level,
          is_compliance,
          is_success
        ) VALUES (
          gen_random_uuid(),
          ${adminResult.rows[0].id},
          ${adminResult.rows[0].email},
          'super_admin',
          'create',
          'system',
          'Database seeded successfully',
          '127.0.0.1',
          0,
          true,
          true
        )
      `);

      console.log("✅ Initial audit log created");
    }

    console.log("\n✨ Database seeding completed successfully!");

    // Display summary
    const counts = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM admin_users) as admin_count,
        (SELECT COUNT(*) FROM admin_roles) as role_count,
        (SELECT COUNT(*) FROM subscribers) as subscriber_count,
        (SELECT COUNT(*) FROM system_status) as status_count
    `);

    const result = counts.rows[0];
    console.log("\n📊 Database Summary:");
    console.log(`   Admin Users:  ${result.admin_count}`);
    console.log(`   Admin Roles:  ${result.role_count}`);
    console.log(`   Subscribers:  ${result.subscriber_count}`);
    console.log(`   System Status: ${result.status_count}`);

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the seed function
seed().catch(console.error);