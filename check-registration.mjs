import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { subscribers } from './src/lib/db/schema.js';
import { desc } from 'drizzle-orm';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

const latest = await db.select().from(subscribers).orderBy(desc(subscribers.createdAt)).limit(1);

console.log('Latest registration:', JSON.stringify(latest[0], null, 2));
