import 'dotenv/config';
import { db } from '../src/lib/db';
import { adminSessions } from '../src/lib/db/schema';

async function checkSessions() {
  try {
    console.log('🔍 Checking admin sessions...\n');

    // Get all sessions
    const allSessions = await db
      .select()
      .from(adminSessions);

    console.log(`📊 Total sessions in database: ${allSessions.length}`);

    if (allSessions.length > 0) {
      console.log('\n📋 Sessions found:');
      allSessions.forEach((session, index) => {
        console.log(`\n${index + 1}. Session ID: ${session.id}`);
        console.log(`   Admin User ID: ${session.adminUserId}`);
        console.log(`   Status: ${session.status}`);
        console.log(`   Created: ${session.createdAt}`);
        console.log(`   Expires: ${session.expiresAt}`);
      });
    } else {
      console.log('\n✅ No sessions found - database is clean!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking sessions:', error);
    process.exit(1);
  }
}

checkSessions();
