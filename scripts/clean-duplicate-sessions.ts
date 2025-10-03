import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_H8yPuT1KCGnt@ep-solitary-night-adt25que-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function cleanDuplicateSessions() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  try {
    console.log('🧹 Cleaning duplicate sessions...');

    // Delete sessions with placeholder tokens
    const result = await sql`
      DELETE FROM admin_sessions
      WHERE access_token = 'placeholder'
         OR refresh_token = 'placeholder'
    `;

    console.log(`✅ Deleted ${result.count} duplicate/placeholder sessions`);

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning sessions:', error);
    await sql.end();
    process.exit(1);
  }
}

cleanDuplicateSessions();
