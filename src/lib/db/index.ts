import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// ====================================
// DATABASE CONNECTION
// ====================================

// Use pooled connection for queries (recommended for serverless)
const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  throw new Error("Database connection string not found");
}

// Disable prefetch as it's not supported for "Transaction" pool mode
const client = postgres(connectionString, {
  max: 1, // Serverless functions should use 1 connection
  prepare: false,
});

// Create drizzle instance with schema
export const db = drizzle(client, { schema });

// Export schema for easy access
export * from "./schema";

// ====================================
// DATABASE HELPERS
// ====================================

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    console.log("Database connection successful");
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

/**
 * Close database connection (for cleanup)
 */
export async function closeConnection(): Promise<void> {
  await client.end();
}