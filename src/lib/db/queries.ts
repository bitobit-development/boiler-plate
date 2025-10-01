import { eq, and, or, desc, asc, gte, lte, like, inArray, isNull, isNotNull, sql } from "drizzle-orm";
import { db } from "./index";
import {
  adminUsers,
  adminSessions,
  auditLogs,
  subscribers,
  subscriberAnalytics,
  adminActionHistory,
  systemStatus,
  securityEvents,
  dataChangeHistory,
  adminRoles
} from "./schema";
import type {
  AdminUser,
  NewAdminUser,
  AdminSession,
  AuditLog,
  Subscriber,
  SubscriberFilters,
  QueryOptions,
  PaginatedResponse
} from "./types";
import { hashPassword, generateTokenPair, getSessionExpiry } from "./security";

// ====================================
// ADMIN USER QUERIES
// ====================================

export const adminQueries = {
  /**
   * Find admin user by email
   */
  async findByEmail(email: string) {
    const [user] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase()))
      .limit(1);

    return user;
  },

  /**
   * Find admin user by ID
   */
  async findById(id: string) {
    const [user] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, id))
      .limit(1);

    return user;
  },

  /**
   * Create new admin user
   */
  async create(data: Omit<NewAdminUser, "passwordHash"> & { password: string }) {
    const passwordHash = await hashPassword(data.password);

    const [user] = await db
      .insert(adminUsers)
      .values({
        ...data,
        passwordHash,
        email: data.email.toLowerCase()
      })
      .returning();

    return user;
  },

  /**
   * Update admin user
   */
  async update(id: string, data: Partial<AdminUser>) {
    const [user] = await db
      .update(adminUsers)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(adminUsers.id, id))
      .returning();

    return user;
  },

  /**
   * Update last login
   */
  async updateLastLogin(id: string, ipAddress: string) {
    await db
      .update(adminUsers)
      .set({
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        loginAttempts: 0,
        lockedUntil: null
      })
      .where(eq(adminUsers.id, id));
  },

  /**
   * Increment failed login attempts
   */
  async incrementFailedAttempts(email: string) {
    const user = await this.findByEmail(email);
    if (!user) return;

    const attempts = (user.loginAttempts || 0) + 1;
    const locked = attempts >= 5
      ? new Date(Date.now() + 30 * 60 * 1000) // Lock for 30 minutes
      : null;

    await db
      .update(adminUsers)
      .set({
        loginAttempts: attempts,
        lockedUntil: locked
      })
      .where(eq(adminUsers.email, email.toLowerCase()));
  },

  /**
   * Get all admins with pagination
   */
  async list(options: QueryOptions = {}): Promise<PaginatedResponse<AdminUser>> {
    const limit = options.limit || 20;
    const offset = options.offset || 0;

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(adminUsers);

    const total = Number(totalResult?.count || 0);

    const items = await db
      .select()
      .from(adminUsers)
      .orderBy(desc(adminUsers.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      items,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
      hasNext: offset + limit < total,
      hasPrevious: offset > 0
    };
  }
};

// ====================================
// SESSION QUERIES
// ====================================

export const sessionQueries = {
  /**
   * Create new session
   */
  async create(
    userId: string,
    ipAddress: string,
    userAgent?: string
  ) {
    const tokens = generateTokenPair();
    const expiry = getSessionExpiry();

    const [session] = await db
      .insert(adminSessions)
      .values({
        adminUserId: userId,
        ...tokens,
        ipAddress,
        userAgent,
        expiresAt: expiry.sessionExpiry
      })
      .returning();

    return { session, tokens };
  },

  /**
   * Find session by token hash
   */
  async findByTokenHash(tokenHash: string) {
    const [session] = await db
      .select()
      .from(adminSessions)
      .where(
        and(
          eq(adminSessions.tokenHash, tokenHash),
          eq(adminSessions.status, "active"),
          gte(adminSessions.expiresAt, new Date())
        )
      )
      .limit(1);

    return session;
  },

  /**
   * Update session activity
   */
  async updateActivity(id: string) {
    await db
      .update(adminSessions)
      .set({
        lastActivityAt: new Date()
      })
      .where(eq(adminSessions.id, id));
  },

  /**
   * Revoke session
   */
  async revoke(id: string, revokedBy: string, reason?: string) {
    await db
      .update(adminSessions)
      .set({
        status: "revoked",
        revokedAt: new Date(),
        revokedBy,
        revokedReason: reason
      })
      .where(eq(adminSessions.id, id));
  },

  /**
   * Clean up expired sessions
   */
  async cleanupExpired() {
    const result = await db
      .update(adminSessions)
      .set({
        status: "expired"
      })
      .where(
        and(
          eq(adminSessions.status, "active"),
          lte(adminSessions.expiresAt, new Date())
        )
      );

    return result;
  },

  /**
   * Get active sessions for user
   */
  async getActiveSessions(userId: string) {
    return await db
      .select()
      .from(adminSessions)
      .where(
        and(
          eq(adminSessions.adminUserId, userId),
          eq(adminSessions.status, "active")
        )
      )
      .orderBy(desc(adminSessions.lastActivityAt));
  }
};

// ====================================
// AUDIT LOG QUERIES
// ====================================

export const auditQueries = {
  /**
   * Create audit log entry
   */
  async log(data: Omit<AuditLog, "id" | "createdAt">) {
    const [log] = await db
      .insert(auditLogs)
      .values(data)
      .returning();

    return log;
  },

  /**
   * Query audit logs with filters
   */
  async query(filters: {
    adminUserId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    isCompliance?: boolean;
    isSecurity?: boolean;
  }, options: QueryOptions = {}): Promise<PaginatedResponse<AuditLog>> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const conditions = [];

    if (filters.adminUserId) {
      conditions.push(eq(auditLogs.adminUserId, filters.adminUserId));
    }
    if (filters.action) {
      conditions.push(eq(auditLogs.action, filters.action as any));
    }
    if (filters.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType));
    }
    if (filters.entityId) {
      conditions.push(eq(auditLogs.entityId, filters.entityId));
    }
    if (filters.dateFrom) {
      conditions.push(gte(auditLogs.createdAt, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(lte(auditLogs.createdAt, filters.dateTo));
    }
    if (filters.isCompliance !== undefined) {
      conditions.push(eq(auditLogs.isCompliance, filters.isCompliance));
    }
    if (filters.isSecurity !== undefined) {
      conditions.push(eq(auditLogs.isSecurity, filters.isSecurity));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(whereClause);

    const total = Number(totalResult?.count || 0);

    const items = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      items,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
      hasNext: offset + limit < total,
      hasPrevious: offset > 0
    };
  }
};

// ====================================
// SUBSCRIBER QUERIES
// ====================================

export const subscriberQueries = {
  /**
   * Find subscriber by email
   */
  async findByEmail(email: string) {
    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, email.toLowerCase()))
      .limit(1);

    return subscriber;
  },

  /**
   * Find subscriber by mobile
   */
  async findByMobile(mobile: string) {
    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.mobile, mobile))
      .limit(1);

    return subscriber;
  },

  /**
   * Create new subscriber
   */
  async create(data: Omit<Subscriber, "id" | "createdAt" | "updatedAt">) {
    const [subscriber] = await db
      .insert(subscribers)
      .values({
        ...data,
        email: data.email.toLowerCase()
      })
      .returning();

    return subscriber;
  },

  /**
   * Update subscriber
   */
  async update(id: string, data: Partial<Subscriber>) {
    const [subscriber] = await db
      .update(subscribers)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(subscribers.id, id))
      .returning();

    return subscriber;
  },

  /**
   * Query subscribers with filters
   */
  async query(filters: SubscriberFilters = {}, options: QueryOptions = {}): Promise<PaginatedResponse<Subscriber>> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const conditions = [];

    if (filters.status) {
      conditions.push(eq(subscribers.status, filters.status as any));
    }
    if (filters.emailVerified !== undefined) {
      conditions.push(eq(subscribers.emailVerified, filters.emailVerified));
    }
    if (filters.mobileVerified !== undefined) {
      conditions.push(eq(subscribers.mobileVerified, filters.mobileVerified));
    }
    if (filters.source) {
      conditions.push(eq(subscribers.source, filters.source));
    }
    if (filters.campaign) {
      conditions.push(eq(subscribers.campaign, filters.campaign));
    }
    if (filters.country) {
      conditions.push(eq(subscribers.country, filters.country));
    }
    if (filters.dateFrom) {
      conditions.push(gte(subscribers.createdAt, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(lte(subscribers.createdAt, filters.dateTo));
    }
    if (filters.searchTerm) {
      const searchPattern = `%${filters.searchTerm}%`;
      conditions.push(
        or(
          like(subscribers.email, searchPattern),
          like(subscribers.name, searchPattern),
          like(subscribers.surname, searchPattern),
          like(subscribers.mobile, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(subscribers)
      .where(whereClause);

    const total = Number(totalResult?.count || 0);

    const items = await db
      .select()
      .from(subscribers)
      .where(whereClause)
      .orderBy(desc(subscribers.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      items,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
      hasNext: offset + limit < total,
      hasPrevious: offset > 0
    };
  },

  /**
   * Get subscriber statistics
   */
  async getStats() {
    const stats = await db.execute(sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE email_verified = true AND mobile_verified = true) as verified,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as recent_signups
      FROM subscribers
    `);

    const countryCounts = await db.execute(sql`
      SELECT country, COUNT(*) as count
      FROM subscribers
      WHERE country IS NOT NULL
      GROUP BY country
    `);

    const sourceCounts = await db.execute(sql`
      SELECT source, COUNT(*) as count
      FROM subscribers
      WHERE source IS NOT NULL
      GROUP BY source
    `);

    return {
      total: Number(stats.rows[0].total),
      active: Number(stats.rows[0].active),
      pending: Number(stats.rows[0].pending),
      verified: Number(stats.rows[0].verified),
      recentSignups: Number(stats.rows[0].recent_signups),
      byCountry: Object.fromEntries(
        countryCounts.rows.map(r => [r.country, Number(r.count)])
      ),
      bySource: Object.fromEntries(
        sourceCounts.rows.map(r => [r.source, Number(r.count)])
      )
    };
  }
};

// ====================================
// SYSTEM STATUS QUERIES
// ====================================

export const systemQueries = {
  /**
   * Get all system status
   */
  async getStatus() {
    return await db
      .select()
      .from(systemStatus)
      .orderBy(asc(systemStatus.serviceName));
  },

  /**
   * Update system status
   */
  async updateStatus(serviceName: string, data: Partial<typeof systemStatus.$inferInsert>) {
    const [status] = await db
      .update(systemStatus)
      .set({
        ...data,
        lastCheckAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(systemStatus.serviceName, serviceName))
      .returning();

    return status;
  },

  /**
   * Check system health
   */
  async checkHealth() {
    const statuses = await this.getStatus();

    const overall = {
      healthy: statuses.every(s => s.status === "healthy"),
      degraded: statuses.some(s => s.status === "degraded"),
      down: statuses.some(s => s.status === "down"),
      score: Math.round(
        statuses.reduce((acc, s) => acc + (s.healthScore || 0), 0) / statuses.length
      )
    };

    return { statuses, overall };
  }
};