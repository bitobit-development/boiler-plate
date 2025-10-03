import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_H8yPuT1KCGnt@ep-solitary-night-adt25que-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function applyMigration() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  try {
    console.log('📦 Reading migration file...');
    const migrationPath = join(process.cwd(), 'drizzle', '0006_add_audit_logs_indexes.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Applying audit logs indexes migration...');

    // Execute the migration
    await sql.unsafe(migrationSQL);

    console.log('✅ Migration applied successfully!');
    console.log('📊 Analyzing tables for query optimization...');

    // Verify indexes were created
    const indexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename IN ('audit_logs', 'admin_users')
      AND indexname LIKE 'idx_%'
      ORDER BY indexname;
    `;

    console.log(`\n✅ Created ${indexes.length} indexes:`);
    indexes.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
    });

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await sql.end();
    process.exit(1);
  }
}

applyMigration();
