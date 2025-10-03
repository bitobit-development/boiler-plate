import { db } from '../src/lib/db';
import { auditLogs } from '../src/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

async function checkAuditLogs() {
  try {
    console.log('Fetching recent registration audit logs...\n');

    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityType, 'registration'))
      .orderBy(desc(auditLogs.createdAt))
      .limit(3);

    logs.forEach((log, index) => {
      console.log(`--- Log ${index + 1} ---`);
      console.log(`ID: ${log.id}`);
      console.log(`Action: ${log.action}`);
      console.log(`Entity Name: ${log.entityName}`);
      console.log(`Admin Email: ${log.adminEmail}`);
      console.log(`Metadata:`, JSON.stringify(log.metadata, null, 2));
      console.log(`Changes:`, JSON.stringify(log.changes, null, 2));
      console.log(`Created At: ${log.createdAt}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAuditLogs();
