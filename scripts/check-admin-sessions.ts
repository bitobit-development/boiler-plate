import { db } from '../src/lib/db';
import { adminUsers, adminSessions } from '../src/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

async function checkAdminSessions() {
  // Get admin user
  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, 'admin@biggbuzz.com'))
    .limit(1);

  if (!user) {
    console.log('Admin user not found');
    process.exit(1);
  }

  console.log('Admin User ID:', user.id);
  console.log('\nChecking sessions for admin@biggbuzz.com:\n');

  // Get all sessions for this user
  const sessions = await db
    .select({
      id: adminSessions.id,
      status: adminSessions.status,
      createdAt: adminSessions.createdAt,
      expiresAt: adminSessions.expiresAt,
      revokedAt: adminSessions.revokedAt,
      revokedReason: adminSessions.revokedReason,
      lastActivityAt: adminSessions.lastActivityAt
    })
    .from(adminSessions)
    .where(eq(adminSessions.adminUserId, user.id))
    .orderBy(desc(adminSessions.createdAt))
    .limit(10);

  console.log(`Found ${sessions.length} session(s):\n`);

  sessions.forEach((session, index) => {
    console.log(`Session ${index + 1}:`);
    console.log(`  ID: ${session.id}`);
    console.log(`  Status: ${session.status}`);
    console.log(`  Created: ${session.createdAt}`);
    console.log(`  Expires: ${session.expiresAt}`);
    console.log(`  Last Activity: ${session.lastActivityAt}`);
    if (session.revokedAt) {
      console.log(`  Revoked At: ${session.revokedAt}`);
      console.log(`  Revoke Reason: ${session.revokedReason}`);
    }
    console.log('');
  });

  // Count by status
  const activeCount = sessions.filter(s => s.status === 'active').length;
  const revokedCount = sessions.filter(s => s.status === 'revoked').length;

  console.log('\nSummary:');
  console.log(`  Active sessions: ${activeCount}`);
  console.log(`  Revoked sessions: ${revokedCount}`);

  process.exit(0);
}

checkAdminSessions();
