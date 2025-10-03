import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_H8yPuT1KCGnt@ep-solitary-night-adt25que-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function deleteDuplicateSession() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  try {
    console.log('🗑️  Deleting duplicate session...');

    const result = await sql`
      DELETE FROM admin_sessions
      WHERE token_hash = '4097889236a2af26c293033feb964c4cf118c0224e0d063fec0a89e9d0569ef2'
    `;

    console.log(`✅ Deleted ${result.count} session(s)`);

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

deleteDuplicateSession();
