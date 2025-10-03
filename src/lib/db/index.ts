import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// ====================================
// DATABASE CONNECTION
// ====================================

// Lazy initialization to allow environment variables to be loaded first
let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

function initializeDatabase() {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Database connection string not found. Please ensure DATABASE_URL is set in environment variables.");
  }

  // Connection pool configuration optimized for serverless
  _client = postgres(connectionString, {
    max: 3, // Allow 3 concurrent connections for better performance
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // Connection timeout in seconds
    prepare: false, // Disable prepared statements for pooled connections
    fetch_types: false, // Disable automatic type fetching for better performance
    max_lifetime: 60 * 30, // Close connections after 30 minutes
  });

  // Create drizzle instance with schema
  _db = drizzle(_client, { schema });

  return _db;
}

// Export a getter that lazily initializes the database
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const database = initializeDatabase();
    return (database as any)[prop];
  }
});

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
    if (!_client) {
      initializeDatabase();
    }
    await _client!`SELECT 1`;
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
  if (_client) {
    await _client.end();
  }
}