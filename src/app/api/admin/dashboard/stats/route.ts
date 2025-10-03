import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth';
import { db } from '@/lib/db';
import { subscribers, adminUsers } from '@/lib/db/schema';
import { eq, gte, lt, and, sql, desc } from 'drizzle-orm';
import { AdminStats } from '@/lib/types/admin';
import { withCache, CacheKeys, CacheTTL } from '@/lib/cache';

async function getDashboardStats(req: AuthenticatedRequest) {
  try {

    // Check permission - allow super_admin or specific permission
    if (!req.user?.permissions.includes('view_analytics') && req.user?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Try to get from cache first
    const cacheKey = CacheKeys.dashboardStats();
    const cachedStats = await withCache<AdminStats>(
      cacheKey,
      async () => {
        // This function only runs on cache MISS
        return await fetchDashboardStatsFromDB();
      },
      CacheTTL.stats // 5 minutes
    );

    return NextResponse.json(cachedStats);
  } catch (error) {
    console.error('Dashboard stats error:', error);

    // Return a fallback response matching AdminStats interface
    const fallbackStats: AdminStats = {
      totalRegistrations: 0,
      pendingReviews: 0,
      approvedToday: 0,
      rejectedToday: 0,
      averageProcessingTime: 0,
      activeAdmins: 0,
      registrationTrend: [],
      statusBreakdown: {
        pending: 0,
        approved: 0,
        rejected: 0
      }
    };

    return NextResponse.json(fallbackStats);
  }
}

/**
 * Fetch dashboard stats from database (called on cache MISS)
 * Optimized with CTE (Common Table Expression) for better performance
 */
async function fetchDashboardStatsFromDB(): Promise<AdminStats> {
  const startTime = Date.now();

  // Get date ranges
  const now = new Date();
  const today = new Date(now.setHours(0, 0, 0, 0));
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Convert dates to ISO strings for postgres
  const todayISO = today.toISOString();
  const tomorrowISO = tomorrow.toISOString();
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

  // Single optimized query using CTE for all stats
  const statsQuery = await db.execute(sql`
    WITH stats AS (
      SELECT
        COUNT(*) as total_registrations,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_reviews,
        COUNT(*) FILTER (WHERE status = 'active' AND created_at >= ${todayISO} AND created_at < ${tomorrowISO}) as approved_today,
        COUNT(*) FILTER (WHERE status = 'suspended' AND created_at >= ${todayISO} AND created_at < ${tomorrowISO}) as rejected_today,
        COUNT(*) FILTER (WHERE status = 'active') as approved_total,
        COUNT(*) FILTER (WHERE status = 'suspended') as rejected_total
      FROM subscribers
    ),
    admins AS (
      SELECT COUNT(*) as active_admins
      FROM admin_users
      WHERE is_active = true
    ),
    trend AS (
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM subscribers
      WHERE created_at >= ${thirtyDaysAgoISO}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    )
    SELECT
      s.total_registrations,
      s.pending_reviews,
      s.approved_today,
      s.rejected_today,
      s.approved_total,
      s.rejected_total,
      a.active_admins,
      json_agg(
        json_build_object('date', t.date::text, 'count', t.count)
        ORDER BY t.date
      ) FILTER (WHERE t.date IS NOT NULL) as registration_trend
    FROM stats s
    CROSS JOIN admins a
    LEFT JOIN trend t ON true
    GROUP BY s.total_registrations, s.pending_reviews, s.approved_today,
             s.rejected_today, s.approved_total, s.rejected_total, a.active_admins;
  `);

  const result = statsQuery[0] as any;

  // Parse registration trend
  const trendData = (result.registration_trend || []) as Array<{ date: string; count: number }>;

  // Fill in missing dates with zero counts
  const trendMap = new Map(trendData.map(item => [item.date, Number(item.count)]));
  const completeTrend: Array<{ date: string; count: number }> = [];

  for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    completeTrend.push({
      date: dateStr,
      count: trendMap.get(dateStr) || 0
    });
  }

  // Construct the response matching AdminStats interface
  const stats: AdminStats = {
    totalRegistrations: Number(result.total_registrations || 0),
    pendingReviews: Number(result.pending_reviews || 0),
    approvedToday: Number(result.approved_today || 0),
    rejectedToday: Number(result.rejected_today || 0),
    averageProcessingTime: 0, // Not tracked yet
    activeAdmins: Number(result.active_admins || 0),
    registrationTrend: completeTrend,
    statusBreakdown: {
      pending: Number(result.pending_reviews || 0),
      approved: Number(result.approved_total || 0),
      rejected: Number(result.rejected_total || 0)
    }
  };

  const endTime = Date.now();
  console.log(`[Dashboard Stats] Fetched from database in ${endTime - startTime}ms (optimized with CTE)`);

  return stats;
}

export async function GET(req: NextRequest) {
  return withAuth(getDashboardStats)(req);
}