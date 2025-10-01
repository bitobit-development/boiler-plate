#!/usr/bin/env node

import { config } from "dotenv";
import postgres from "postgres";
import bcrypt from "bcryptjs";

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Database connection string not found");
  process.exit(1);
}

const sql = postgres(connectionString, {
  max: 1,
  onnotice: () => {} // Suppress notices
});

async function fixAdminPassword() {
  console.log("🔧 Fixing admin password...");

  try {
    const email = 'admin@biggbuzz.com';
    const password = 'admin123';

    // Hash the password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    console.log("Email:", email);
    console.log("Password:", password);
    console.log("Hashed:", hashedPassword);

    // Update or insert the admin user
    const result = await sql`
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
        ${email},
        'admin',
        ${hashedPassword},
        'System',
        'Administrator',
        '+1234567890',
        'super_admin',
        ${JSON.stringify(["view_analytics", "manage_users", "manage_subscribers", "export_data", "system_settings", "view_audit_logs"])},
        true,
        true,
        false,
        false,
        ${JSON.stringify([])},
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        permissions = EXCLUDED.permissions,
        role = EXCLUDED.role,
        is_super_admin = EXCLUDED.is_super_admin,
        is_active = true,
        updated_at = NOW()
      RETURNING id, email, is_active
    `;

    if (result.length > 0) {
      console.log("✅ Admin user updated successfully:");
      console.log("   ID:", result[0].id);
      console.log("   Email:", result[0].email);
      console.log("   Active:", result[0].is_active);
      console.log("\n📝 Credentials:");
      console.log("   Email: admin@biggbuzz.com");
      console.log("   Password: admin123");
    }

    // Verify the password can be compared correctly
    const user = await sql`
      SELECT password_hash FROM admin_users WHERE email = ${email}
    `;

    if (user.length > 0) {
      const isValid = await bcrypt.compare(password, user[0].password_hash);
      console.log("\n🔒 Password verification test:", isValid ? "✅ PASSED" : "❌ FAILED");
    }

  } catch (error) {
    console.error("❌ Failed to fix admin password:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the fix
fixAdminPassword().catch(console.error);