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

// Connection pool configuration optimized for serverless
const client = postgres(connectionString, {
  max: 3, // Allow 3 concurrent connections for better performance
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
  prepare: false, // Disable prepared statements for pooled connections
  fetch_types: false, // Disable automatic type fetching for better performance
  max_lifetime: 60 * 30, // Close connections after 30 minutes
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