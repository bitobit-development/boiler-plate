import { Redis } from "@upstash/redis";

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Cache key prefixes and patterns
export const CacheKeys = {
  // Product cache keys
  products: {
    byId: (id: string) => `product:${id}`,
    bySlug: (slug: string) => `product:slug:${slug}`,
    list: (page: number, limit: number) => `products:list:${page}:${limit}`,
    featured: () => `products:featured`,
    byCategory: (categoryId: string) => `products:category:${categoryId}`,
  },

  // Category cache keys
  categories: {
    all: () => `categories:all`,
    byId: (id: string) => `category:${id}`,
    bySlug: (slug: string) => `category:slug:${slug}`,
    withCounts: () => `categories:with-counts`,
  },

  // Pattern matching for bulk operations
  patterns: {
    allProducts: () => `product:*`,
    allCategories: () => `categor*`,
    productsByCategory: (categoryId: string) => `products:category:${categoryId}:*`,
    allRegistrations: () => `admin:registrations*`,
    allStats: () => `admin:dashboard:stats*`,
    allDashboard: () => `admin:*`,
  },

  // User/session cache keys
  session: {
    byToken: (token: string) => `session:${token}`,
    byUserId: (userId: string) => `session:user:${userId}`,
  },

  // Member access cache
  member: {
    access: (memberId: string) => `member:access:${memberId}`,
    permissions: (memberId: string) => `member:permissions:${memberId}`,
  },

  // Admin dashboard cache keys
  dashboardStats: () => `admin:dashboard:stats`,
  registrations: (params?: string) => `admin:registrations${params ? `:${params}` : ''}`,
  adminActivity: (limit: number) => `admin:activity:${limit}`,
};

// Cache TTL values (in seconds)
export const CacheTTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
  WEEK: 604800, // 7 days
  stats: 300, // 5 minutes for dashboard stats
  registrations: 60, // 1 minute for registrations list
  activity: 30, // 30 seconds for activity feed
};

/**
 * Get cached value
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key);
    return cached as T;
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error);
    return null;
  }
}

/**
 * Set cached value with TTL
 */
export async function setCached<T>(
  key: string,
  value: T,
  ttl: number = CacheTTL.MEDIUM
): Promise<boolean> {
  try {
    await redis.set(key, JSON.stringify(value), {
      ex: ttl,
    });
    return true;
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete cached value(s)
 */
export async function deleteCached(key: string | string[]): Promise<number> {
  try {
    const keys = Array.isArray(key) ? key : [key];
    if (keys.length === 0) return 0;

    const results = await Promise.all(
      keys.map(k => redis.del(k))
    );
    return results.reduce((sum, count) => sum + count, 0);
  } catch (error) {
    console.error(`Cache delete error:`, error);
    return 0;
  }
}

/**
 * Delete cache entries matching a pattern
 * Note: This is expensive - use sparingly
 */
export async function deletePattern(pattern: string): Promise<number> {
  try {
    console.log(`[Cache] Deleting pattern: ${pattern}`);

    // Upstash supports scan for pattern matching
    let cursor = 0;
    const keysToDelete: string[] = [];
    const maxIterations = 100; // Safety limit
    let iterations = 0;

    do {
      // Scan for keys matching the pattern
      const result = await redis.scan(cursor, {
        match: pattern,
        count: 100
      });

      cursor = result[0];
      const keys = result[1];

      if (keys && keys.length > 0) {
        keysToDelete.push(...keys);
      }

      iterations++;
      if (iterations >= maxIterations) {
        console.warn(`[Cache] Max iterations reached for pattern: ${pattern}`);
        break;
      }
    } while (cursor !== 0);

    // Delete all found keys
    if (keysToDelete.length > 0) {
      const deletedCount = await deleteCached(keysToDelete);
      console.log(`[Cache] Deleted ${deletedCount} keys matching pattern: ${pattern}`);
      return deletedCount;
    }

    console.log(`[Cache] No keys found for pattern: ${pattern}`);
    return 0;
  } catch (error) {
    console.error(`[Cache] Pattern delete error for "${pattern}":`, error);
    return 0;
  }
}

/**
 * Cache wrapper for async functions
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = CacheTTL.MEDIUM
): Promise<T> {
  // Try to get from cache first
  const cached = await getCached<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Execute function and cache result
  const result = await fn();
  await setCached(key, result, ttl);
  return result;
}

/**
 * Invalidate multiple cache patterns
 */
export async function invalidateCache(patterns: string[]): Promise<void> {
  await Promise.all(patterns.map(pattern => deletePattern(pattern)));
}

/**
 * Check if cache key exists
 */
export async function cacheExists(key: string): Promise<boolean> {
  try {
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error(`Cache exists check error for key ${key}:`, error);
    return false;
  }
}

/**
 * Get remaining TTL for a key
 */
export async function getCacheTTL(key: string): Promise<number> {
  try {
    const ttl = await redis.ttl(key);
    return ttl;
  } catch (error) {
    console.error(`Cache TTL check error for key ${key}:`, error);
    return -1;
  }
}