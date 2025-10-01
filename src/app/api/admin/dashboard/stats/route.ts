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
      CacheTTL.stats, // 5 minutes
      async () => {
        // This function only runs on cache MISS
        return await fetchDashboardStatsFromDB();
      }
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

    // Execute all queries in parallel for better performance
    const [
      totalRegistrationsResult,
      pendingReviewsResult,
      approvedTodayResult,
      rejectedTodayResult,
      activeAdminsResult
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(subscribers),
      db.select({ count: sql<number>`count(*)` }).from(subscribers).where(eq(subscribers.status, 'pending')),
      db.select({ count: sql<number>`count(*)` }).from(subscribers).where(and(
        eq(subscribers.status, 'active'),
        gte(subscribers.createdAt, today),
        lt(subscribers.createdAt, tomorrow)
      )),
      db.select({ count: sql<number>`count(*)` }).from(subscribers).where(and(
        eq(subscribers.status, 'suspended'),
        gte(subscribers.createdAt, today),
        lt(subscribers.createdAt, tomorrow)
      )),
      db.select({ count: sql<number>`count(*)` }).from(adminUsers).where(eq(adminUsers.isActive, true))
    ]);

    const totalRegistrations = Number(totalRegistrationsResult[0]?.count || 0);
    const pendingReviews = Number(pendingReviewsResult[0]?.count || 0);
    const approvedToday = Number(approvedTodayResult[0]?.count || 0);
    const rejectedToday = Number(rejectedTodayResult[0]?.count || 0);
    const activeAdmins = Number(activeAdminsResult[0]?.count || 0);

    // Get registration trend for last 30 days
    const registrationTrendResult = await db
      .select({
        date: sql<string>`DATE(${subscribers.createdAt})`,
        count: sql<number>`count(*)`
      })
      .from(subscribers)
      .where(gte(subscribers.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${subscribers.createdAt})`)
      .orderBy(sql`DATE(${subscribers.createdAt})`);

    // Format registration trend data
    const registrationTrend = registrationTrendResult.map(row => ({
      date: row.date,
      count: Number(row.count)
    }));

    // Fill in missing dates with zero counts
    const trendMap = new Map(registrationTrend.map(item => [item.date, item.count]));
    const completeTrend: Array<{ date: string; count: number }> = [];

    for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      completeTrend.push({
        date: dateStr,
        count: trendMap.get(dateStr) || 0
      });
    }

    // Get status breakdown
    const [approvedResult, rejectedResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(subscribers)
        .where(eq(subscribers.status, 'active')),
      db.select({ count: sql<number>`count(*)` })
        .from(subscribers)
        .where(eq(subscribers.status, 'suspended'))
    ]);

    const statusBreakdown = {
      pending: pendingReviews,
      approved: Number(approvedResult[0]?.count || 0),
      rejected: Number(rejectedResult[0]?.count || 0)
    };

    // Construct the response matching AdminStats interface
    const stats: AdminStats = {
      totalRegistrations,
      pendingReviews,
      approvedToday,
      rejectedToday,
      averageProcessingTime: 0, // Not tracked yet
      activeAdmins,
      registrationTrend: completeTrend,
      statusBreakdown
    };

    const endTime = Date.now();
    console.log(`[Dashboard Stats] Fetched from database in ${endTime - startTime}ms`);

    return stats;
}

export async function GET(req: NextRequest) {
  return withAuth(getDashboardStats)(req);
}