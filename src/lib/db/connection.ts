import { db } from './index';
import { sql } from 'drizzle-orm';

/**
 * Test database connection and return connection status
 */
export async function connectToDatabase() {
  try {
    // Test the connection with a simple query
    const result = await db.execute(sql`SELECT 1 as connected`);

    if (result && result.length > 0) {
      console.log('✅ Database connection successful');
      return { connected: true };
    }

    throw new Error('Database connection test failed');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}