import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_H8yPuT1KCGnt@ep-solitary-night-adt25que-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function checkSessions() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  try {
    console.log('🔍 Checking admin sessions...\n');

    const sessions = await sql`
      SELECT id, token_hash, status, created_at
      FROM admin_sessions
      ORDER BY created_at DESC
      LIMIT 10
    `;

    console.log(`Found ${sessions.length} sessions:`);
    sessions.forEach((s, i) => {
      console.log(`${i + 1}. ID: ${s.id}, Hash: ${s.token_hash}, Status: ${s.status}, Created: ${s.created_at}`);
    });

    // Check for the specific duplicate
    const duplicate = await sql`
      SELECT * FROM admin_sessions
      WHERE token_hash = '4097889236a2af26c293033feb964c4cf118c0224e0d063fec0a89e9d0569ef2'
    `;

    console.log(`\n🔍 Sessions with problematic hash: ${duplicate.length}`);

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkSessions();
