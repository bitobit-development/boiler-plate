import 'dotenv/config';
import { db } from '../src/lib/db';
import { adminSessions } from '../src/lib/db/schema';

async function clearAllSessions() {
  try {
    console.log('🧹 Clearing all admin sessions...');

    // Delete all sessions
    const result = await db
      .delete(adminSessions);

    console.log('✅ All admin sessions cleared successfully');
    console.log('Users can now login again with fresh sessions');
    console.log('Each user can have up to 5 concurrent sessions that expire after 5 hours');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing sessions:', error);
    process.exit(1);
  }
}

clearAllSessions();
