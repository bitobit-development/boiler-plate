import 'dotenv/config';
import { db } from '../src/lib/db';
import { adminSessions } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function cleanupSessions() {
  try {
    console.log('🧹 Cleaning up placeholder sessions...');

    // Delete sessions with placeholder token hash
    const result = await db
      .delete(adminSessions)
      .where(eq(adminSessions.tokenHash, '4097889236a2af26c293033feb964c4cf118c0224e0d063fec0a89e9d0569ef2'));

    console.log('✅ Placeholder sessions cleaned up');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning up sessions:', error);
    process.exit(1);
  }
}

cleanupSessions();
