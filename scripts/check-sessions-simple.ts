import { db } from '../src/lib/db';
import { adminSessions } from '../src/lib/db/schema';

(async () => {
  try {
    const sessions = await db.select().from(adminSessions);
    console.log('📊 Total sessions:', sessions.length);
    
    if (sessions.length === 0) {
      console.log('✅ All sessions have been removed!');
    } else {
      console.log('⚠️  Sessions found:');
      sessions.forEach(s => {
        console.log('  - ID:', s.id, '| User:', s.adminUserId, '| Status:', s.status);
      });
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
