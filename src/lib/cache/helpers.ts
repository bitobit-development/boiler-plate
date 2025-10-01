import { redis } from './redis';

/**
 * Cache Helper Functions
 *
 * Utility functions for get/set/invalidate operations with fallback handling
 */

/**
 * Get data from cache
 * Returns null if cache miss or Redis unavailable
 */
export async function getCached<T>(key: string): Promise<T | null> {
  if (!redis) return null;

  try {
    const data = await redis.get(key);
    if (data) {
      console.log(`[Cache HIT] ${key}`);
      return data as T;
    }
    console.log(`[Cache MISS] ${key}`);
    return null;
  } catch (error) {
    console.error(`[Cache GET Error] ${key}:`, error);
    return null;
  }
}

/**
 * Set data in cache with TTL (Time To Live)
 * Note: Upstash Redis automatically handles JSON serialization
 */
export async function setCached<T>(
  key: string,
  data: T,
  ttlSeconds: number
): Promise<boolean> {
  if (!redis) return false;

  try {
    // Upstash Redis automatically serializes to JSON
    await redis.set(key, data, { ex: ttlSeconds });
    console.log(`[Cache SET] ${key} (TTL: ${ttlSeconds}s)`);
    return true;
  } catch (error) {
    console.error(`[Cache SET Error] ${key}:`, error);
    return false;
  }
}

/**
 * Delete a single cache key
 */
export async function deleteCached(key: string): Promise<boolean> {
  if (!redis) return false;

  try {
    await redis.del(key);
    console.log(`[Cache DELETE] ${key}`);
    return true;
  } catch (error) {
    console.error(`[Cache DELETE Error] ${key}:`, error);
    return false;
  }
}

/**
 * Delete multiple cache keys matching a pattern
 * Example: deletePattern('registrations:*') deletes all registration caches
 */
export async function deletePattern(pattern: string): Promise<number> {
  if (!redis) return 0;

  try {
    // Get all keys matching pattern
    const keys = await redis.keys(pattern);

    if (keys.length === 0) {
      console.log(`[Cache DELETE Pattern] No keys found for: ${pattern}`);
      return 0;
    }

    // Delete all matching keys
    await redis.del(...keys);
    console.log(`[Cache DELETE Pattern] ${pattern} (${keys.length} keys)`);
    return keys.length;
  } catch (error) {
    console.error(`[Cache DELETE Pattern Error] ${pattern}:`, error);
    return 0;
  }
}

/**
 * Cache wrapper for expensive database queries
 *
 * Usage:
 * const stats = await withCache(
 *   'dashboard:stats',
 *   300,
 *   async () => db.query()
 * );
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try to get from cache first
  const cached = await getCached<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch fresh data
  console.log(`[Cache MISS] Fetching fresh data for: ${key}`);
  const data = await fetchFn();

  // Store in cache for next request
  await setCached(key, data, ttlSeconds);

  return data;
}

/**
 * Invalidate multiple cache keys at once
 * Useful when a single action affects multiple caches
 */
export async function invalidateCaches(keys: string[]): Promise<void> {
  if (!redis || keys.length === 0) return;

  try {
    await Promise.all(keys.map(key => deleteCached(key)));
    console.log(`[Cache INVALIDATE] ${keys.length} keys`);
  } catch (error) {
    console.error('[Cache INVALIDATE Error]:', error);
  }
}

/**
 * Clear all application caches (use with caution!)
 */
export async function clearAllCaches(): Promise<void> {
  if (!redis) return;

  try {
    await redis.flushdb();
    console.log('[Cache FLUSH] All caches cleared');
  } catch (error) {
    console.error('[Cache FLUSH Error]:', error);
  }
}
