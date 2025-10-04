import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    console.log('Making shop_user_id nullable in otp_override_logs...');

    // Make shop_user_id nullable
    await db.execute(sql`
      ALTER TABLE otp_override_logs
      ALTER COLUMN shop_user_id DROP NOT NULL
    `);

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrate();
