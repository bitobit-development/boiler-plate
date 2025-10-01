/**
 * Cache Key Generator
 *
 * Centralized cache key management for consistency and easy invalidation
 */

export const CacheKeys = {
  /**
   * Dashboard statistics cache
   * TTL: 5 minutes
   */
  dashboardStats: () => 'dashboard:stats',

  /**
   * Pending registrations count
   * TTL: 1 minute (frequently updated)
   */
  pendingCount: () => 'stats:pending-count',

  /**
   * Registrations list with pagination
   * TTL: 2 minutes
   */
  registrations: (params: {
    page: number;
    limit: number;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const { page, limit, status, search, sortBy, sortOrder } = params;
    const parts = ['registrations', `page:${page}`, `limit:${limit}`];

    if (status && status !== 'all') parts.push(`status:${status}`);
    if (search) parts.push(`search:${search}`);
    if (sortBy) parts.push(`sort:${sortBy}:${sortOrder || 'desc'}`);

    return parts.join(':');
  },

  /**
   * Single registration detail
   * TTL: 10 minutes
   */
  registration: (id: string) => `registration:${id}`,

  /**
   * Activity logs
   * TTL: 5 minutes
   */
  activity: (limit: number) => `activity:limit:${limit}`,

  /**
   * Admin users list
   * TTL: 10 minutes (rarely changes)
   */
  adminUsers: () => 'admin:users',

  /**
   * Wildcard patterns for bulk invalidation
   */
  patterns: {
    allRegistrations: () => 'registrations:*',
    allStats: () => 'stats:*',
    allDashboard: () => 'dashboard:*',
    allActivity: () => 'activity:*',
  },
} as const;

/**
 * Cache TTL (Time To Live) in seconds
 */
export const CacheTTL = {
  stats: 300, // 5 minutes
  registrations: 120, // 2 minutes
  registration: 600, // 10 minutes
  activity: 300, // 5 minutes
  pendingCount: 60, // 1 minute
  adminUsers: 600, // 10 minutes
} as const;
