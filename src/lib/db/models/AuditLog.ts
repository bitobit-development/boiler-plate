import { db } from '@/lib/db';
import { auditLogs, type AuditLog as AuditLogType, type NewAuditLog } from '@/lib/db/schema';
import { eq, desc, and, gte, lte, sql, or, inArray } from 'drizzle-orm';

/**
 * AuditLog model operations using Drizzle ORM
 */
export const AuditLog = {
  /**
   * Create a new audit log entry
   */
  async create(data: NewAuditLog) {
    try {
      const result = await db
        .insert(auditLogs)
        .values({
          ...data,
          createdAt: new Date()
        })
        .returning();

      return result[0];
    } catch (error) {
      console.error('Error creating audit log:', error);
      throw error;
    }
  },

  /**
   * Find audit logs with optional filters
   */
  async find(filter: any = {}, options: any = {}) {
    try {
      let query = db.select().from(auditLogs);

      // Build conditions
      let conditions = [];

      if (filter.adminUserId) {
        conditions.push(eq(auditLogs.adminUserId, filter.adminUserId));
      }

      if (filter.action) {
        conditions.push(eq(auditLogs.action, filter.action));
      }

      if (filter.entityType) {
        conditions.push(eq(auditLogs.entityType, filter.entityType));
      }

      if (filter.entityId) {
        conditions.push(eq(auditLogs.entityId, filter.entityId));
      }

      if (filter.isSuccess !== undefined) {
        conditions.push(eq(auditLogs.isSuccess, filter.isSuccess));
      }

      if (filter.isCompliance !== undefined) {
        conditions.push(eq(auditLogs.isCompliance, filter.isCompliance));
      }

      if (filter.isSecurity !== undefined) {
        conditions.push(eq(auditLogs.isSecurity, filter.isSecurity));
      }

      if (filter.createdAt) {
        if (filter.createdAt.$gte) {
          conditions.push(gte(auditLogs.createdAt, filter.createdAt.$gte));
        }
        if (filter.createdAt.$lte) {
          conditions.push(lte(auditLogs.createdAt, filter.createdAt.$lte));
        }
      }

      // Apply conditions
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      // Apply sorting
      const sortField = options.sort?.createdAt === 1
        ? auditLogs.createdAt
        : desc(auditLogs.createdAt);
      query = query.orderBy(sortField) as any;

      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit) as any;
      }

      // Apply offset
      if (options.skip) {
        query = query.offset(options.skip) as any;
      }

      return await query;
    } catch (error) {
      console.error('Error finding audit logs:', error);
      throw error;
    }
  },

  /**
   * Find a single audit log by ID
   */
  async findById(id: string) {
    try {
      const result = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.id, id))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Error finding audit log by ID:', error);
      throw error;
    }
  },

  /**
   * Count audit logs with optional filters
   */
  async countDocuments(filter: any = {}) {
    try {
      let conditions = [];

      if (filter.adminUserId) {
        conditions.push(eq(auditLogs.adminUserId, filter.adminUserId));
      }

      if (filter.action) {
        conditions.push(eq(auditLogs.action, filter.action));
      }

      if (filter.entityType) {
        conditions.push(eq(auditLogs.entityType, filter.entityType));
      }

      if (filter.isSuccess !== undefined) {
        conditions.push(eq(auditLogs.isSuccess, filter.isSuccess));
      }

      if (filter.createdAt) {
        if (filter.createdAt.$gte) {
          conditions.push(gte(auditLogs.createdAt, filter.createdAt.$gte));
        }
        if (filter.createdAt.$lte) {
          conditions.push(lte(auditLogs.createdAt, filter.createdAt.$lte));
        }
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(whereClause);

      return Number(result[0]?.count || 0);
    } catch (error) {
      console.error('Error counting audit logs:', error);
      throw error;
    }
  },

  /**
   * Get audit logs for a specific admin user
   */
  async getByAdminUser(adminUserId: string, limit: number = 100) {
    try {
      const result = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.adminUserId, adminUserId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);

      return result;
    } catch (error) {
      console.error('Error getting audit logs by admin user:', error);
      throw error;
    }
  },

  /**
   * Get audit logs for a specific entity
   */
  async getByEntity(entityType: string, entityId: string, limit: number = 50) {
    try {
      const result = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entityType, entityType),
            eq(auditLogs.entityId, entityId)
          )
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);

      return result;
    } catch (error) {
      console.error('Error getting audit logs by entity:', error);
      throw error;
    }
  },

  /**
   * Get recent security events
   */
  async getSecurityEvents(days: number = 7, limit: number = 100) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.isSecurity, true),
            gte(auditLogs.createdAt, startDate)
          )
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);

      return result;
    } catch (error) {
      console.error('Error getting security events:', error);
      throw error;
    }
  },

  /**
   * Get compliance audit logs
   */
  async getComplianceLogs(days: number = 30, limit: number = 100) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.isCompliance, true),
            gte(auditLogs.createdAt, startDate)
          )
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);

      return result;
    } catch (error) {
      console.error('Error getting compliance logs:', error);
      throw error;
    }
  },

  /**
   * Get failed operations
   */
  async getFailedOperations(days: number = 1, limit: number = 50) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.isSuccess, false),
            gte(auditLogs.createdAt, startDate)
          )
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);

      return result;
    } catch (error) {
      console.error('Error getting failed operations:', error);
      throw error;
    }
  },

  /**
   * Get high-risk operations
   */
  async getHighRiskOperations(threshold: number = 7, days: number = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            gte(auditLogs.riskLevel, threshold),
            gte(auditLogs.createdAt, startDate)
          )
        )
        .orderBy(desc(auditLogs.riskLevel))
        .limit(100);

      return result;
    } catch (error) {
      console.error('Error getting high-risk operations:', error);
      throw error;
    }
  },

  /**
   * Get activity summary by action
   */
  async getActivitySummary(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await db
        .select({
          action: auditLogs.action,
          count: sql<number>`count(*)`,
          successCount: sql<number>`sum(case when ${auditLogs.isSuccess} then 1 else 0 end)`,
          failureCount: sql<number>`sum(case when not ${auditLogs.isSuccess} then 1 else 0 end)`,
          avgRiskLevel: sql<number>`avg(${auditLogs.riskLevel})`
        })
        .from(auditLogs)
        .where(gte(auditLogs.createdAt, startDate))
        .groupBy(auditLogs.action);

      return result;
    } catch (error) {
      console.error('Error getting activity summary:', error);
      throw error;
    }
  },

  /**
   * Search audit logs by text
   */
  async search(searchText: string, limit: number = 50) {
    try {
      const result = await db
        .select()
        .from(auditLogs)
        .where(
          or(
            sql`${auditLogs.description} ILIKE ${`%${searchText}%`}`,
            sql`${auditLogs.entityName} ILIKE ${`%${searchText}%`}`,
            sql`${auditLogs.adminEmail} ILIKE ${`%${searchText}%`}`
          )
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);

      return result;
    } catch (error) {
      console.error('Error searching audit logs:', error);
      throw error;
    }
  },

  /**
   * Cleanup old audit logs
   */
  async cleanup(daysToKeep: number = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Never delete compliance or security logs
      const result = await db
        .delete(auditLogs)
        .where(
          and(
            lte(auditLogs.createdAt, cutoffDate),
            eq(auditLogs.isCompliance, false),
            eq(auditLogs.isSecurity, false)
          )
        )
        .returning();

      return {
        deletedCount: result.length
      };
    } catch (error) {
      console.error('Error cleaning up audit logs:', error);
      throw error;
    }
  }
};

// Export types for use in other modules
export type { AuditLogType, NewAuditLog };