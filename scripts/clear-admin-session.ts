import 'dotenv/config';
import { db } from '../src/lib/db';
import { adminSessions, adminUsers } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function clearAdminSession() {
  try {
    console.log('🧹 Clearing admin sessions...');

    // Find admin user
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, 'admin@biggbuzz.com'))
      .limit(1);

    if (!admin) {
      console.log('❌ Admin user not found');
      process.exit(1);
    }

    // Delete all sessions for admin user
    const result = await db
      .delete(adminSessions)
      .where(eq(adminSessions.adminUserId, admin.id));

    console.log('✅ Admin sessions cleared successfully');
    console.log('You can now login again at http://localhost:3000/admin');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing sessions:', error);
    process.exit(1);
  }
}

clearAdminSession();
