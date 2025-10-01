import { db } from '@/lib/db';
import { subscriberAnalytics, type SubscriberAnalytic, type NewSubscriberAnalytic } from '@/lib/db/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';

/**
 * SubscriberAnalytics model operations using Drizzle ORM
 */
export const SubscriberAnalytics = {
  /**
   * Find one analytics record with optional sort
   */
  async findOne(filter: any = {}) {
    try {
      let query = db.select().from(subscriberAnalytics);

      // Apply date filter if provided
      if (filter.date) {
        query = query.where(eq(subscriberAnalytics.date, filter.date)) as any;
      }

      // Sort by createdAt descending by default
      const sortField = filter.sort?.createdAt === -1
        ? desc(subscriberAnalytics.createdAt)
        : desc(subscriberAnalytics.createdAt);

      query = query.orderBy(sortField).limit(1) as any;

      const result = await query;
      return result[0] || null;
    } catch (error) {
      console.error('Error finding analytics:', error);
      throw error;
    }
  },

  /**
   * Find all analytics records with optional filters
   */
  async find(filter: Partial<SubscriberAnalytic> = {}) {
    try {
      let query = db.select().from(subscriberAnalytics);

      if (filter.date) {
        query = query.where(eq(subscriberAnalytics.date, filter.date)) as any;
      }

      return await query.orderBy(desc(subscriberAnalytics.date));
    } catch (error) {
      console.error('Error finding analytics:', error);
      throw error;
    }
  },

  /**
   * Create a new analytics record
   */
  async create(data: NewSubscriberAnalytic) {
    try {
      const result = await db
        .insert(subscriberAnalytics)
        .values(data)
        .returning();

      return result[0];
    } catch (error) {
      console.error('Error creating analytics:', error);
      throw error;
    }
  },

  /**
   * Update or create analytics for a specific date
   */
  async upsert(date: string, data: Partial<NewSubscriberAnalytic>) {
    try {
      // Check if record exists
      const existing = await db
        .select()
        .from(subscriberAnalytics)
        .where(eq(subscriberAnalytics.date, date))
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        const result = await db
          .update(subscriberAnalytics)
          .set({
            ...data,
            updatedAt: new Date()
          })
          .where(eq(subscriberAnalytics.date, date))
          .returning();

        return result[0];
      } else {
        // Create new record
        const result = await db
          .insert(subscriberAnalytics)
          .values({
            ...data,
            date
          })
          .returning();

        return result[0];
      }
    } catch (error) {
      console.error('Error upserting analytics:', error);
      throw error;
    }
  },

  /**
   * Get analytics for a date range
   */
  async getDateRange(startDate: string, endDate: string) {
    try {
      const result = await db
        .select()
        .from(subscriberAnalytics)
        .where(
          and(
            gte(subscriberAnalytics.date, startDate),
            lte(subscriberAnalytics.date, endDate)
          )
        )
        .orderBy(desc(subscriberAnalytics.date));

      return result;
    } catch (error) {
      console.error('Error getting date range analytics:', error);
      throw error;
    }
  },

  /**
   * Get aggregated metrics
   */
  async getAggregatedMetrics(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await db
        .select({
          totalSignups: sql<number>`SUM(${subscriberAnalytics.totalSignups})`,
          verifiedSignups: sql<number>`SUM(${subscriberAnalytics.verifiedSignups})`,
          uniqueVisitors: sql<number>`SUM(${subscriberAnalytics.uniqueVisitors})`,
          avgConversionRate: sql<number>`AVG(${subscriberAnalytics.conversionRate})`,
          avgTimeToVerify: sql<number>`AVG(${subscriberAnalytics.avgTimeToVerify})`,
          avgBounceRate: sql<number>`AVG(${subscriberAnalytics.bounceRate})`,
          daysWithData: sql<number>`COUNT(DISTINCT ${subscriberAnalytics.date})`
        })
        .from(subscriberAnalytics)
        .where(gte(subscriberAnalytics.date, startDate.toISOString().split('T')[0]));

      return result[0] || {
        totalSignups: 0,
        verifiedSignups: 0,
        uniqueVisitors: 0,
        avgConversionRate: 0,
        avgTimeToVerify: 0,
        avgBounceRate: 0,
        daysWithData: 0
      };
    } catch (error) {
      console.error('Error getting aggregated metrics:', error);
      throw error;
    }
  },

  /**
   * Get hourly analytics for a specific date
   */
  async getHourlyAnalytics(date: string) {
    try {
      const result = await db
        .select()
        .from(subscriberAnalytics)
        .where(
          and(
            eq(subscriberAnalytics.date, date),
            sql`${subscriberAnalytics.hour} IS NOT NULL`
          )
        )
        .orderBy(subscriberAnalytics.hour);

      return result;
    } catch (error) {
      console.error('Error getting hourly analytics:', error);
      throw error;
    }
  },

  /**
   * Get top performing sources
   */
  async getTopSources(limit: number = 5, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await db
        .select()
        .from(subscriberAnalytics)
        .where(gte(subscriberAnalytics.date, startDate.toISOString().split('T')[0]))
        .orderBy(desc(subscriberAnalytics.date));

      // Aggregate sources from JSON data
      const sourceMap = new Map<string, number>();

      result.forEach(record => {
        if (record.bySource && typeof record.bySource === 'object') {
          Object.entries(record.bySource as Record<string, number>).forEach(([source, count]) => {
            sourceMap.set(source, (sourceMap.get(source) || 0) + count);
          });
        }
      });

      // Sort and limit
      const topSources = Array.from(sourceMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([source, count]) => ({ source, count }));

      return topSources;
    } catch (error) {
      console.error('Error getting top sources:', error);
      throw error;
    }
  },

  /**
   * Get conversion funnel metrics
   */
  async getConversionFunnel(days: number = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await db
        .select({
          date: subscriberAnalytics.date,
          visitors: subscriberAnalytics.uniqueVisitors,
          signups: subscriberAnalytics.totalSignups,
          verified: subscriberAnalytics.verifiedSignups,
          conversionRate: subscriberAnalytics.conversionRate,
          bounceRate: subscriberAnalytics.bounceRate
        })
        .from(subscriberAnalytics)
        .where(gte(subscriberAnalytics.date, startDate.toISOString().split('T')[0]))
        .orderBy(desc(subscriberAnalytics.date));

      return result;
    } catch (error) {
      console.error('Error getting conversion funnel:', error);
      throw error;
    }
  },

  /**
   * Delete old analytics records
   */
  async cleanupOldRecords(daysToKeep: number = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await db
        .delete(subscriberAnalytics)
        .where(lte(subscriberAnalytics.date, cutoffDate.toISOString().split('T')[0]))
        .returning();

      return {
        deletedCount: result.length
      };
    } catch (error) {
      console.error('Error cleaning up old records:', error);
      throw error;
    }
  },

  /**
   * Sort helper (for compatibility)
   */
  sort(sortOrder: { createdAt?: -1 | 1 }) {
    return {
      findOne: () => this.findOne({ sort: sortOrder })
    };
  }
};

// Export types for use in other modules
export type { SubscriberAnalytic, NewSubscriberAnalytic };