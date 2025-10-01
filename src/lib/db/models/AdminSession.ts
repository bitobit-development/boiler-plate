import { db } from '@/lib/db';
import { adminSessions, type AdminSession as AdminSessionType, type NewAdminSession } from '@/lib/db/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * AdminSession model operations using Drizzle ORM
 */
export const AdminSession = {
  /**
   * Find a single session by various criteria
   */
  async findOne(filter: any = {}) {
    try {
      let conditions = [];

      if (filter.accessToken) {
        conditions.push(eq(adminSessions.accessToken, filter.accessToken));
      }

      if (filter.refreshToken) {
        conditions.push(eq(adminSessions.refreshToken, filter.refreshToken));
      }

      if (filter.tokenHash) {
        conditions.push(eq(adminSessions.tokenHash, filter.tokenHash));
      }

      if (filter._id || filter.id) {
        conditions.push(eq(adminSessions.id, filter._id || filter.id));
      }

      if (filter.adminUserId || filter.userId) {
        conditions.push(eq(adminSessions.adminUserId, filter.adminUserId || filter.userId));
      }

      if (filter.status) {
        conditions.push(eq(adminSessions.status, filter.status));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select()
        .from(adminSessions)
        .where(whereClause)
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Error finding session:', error);
      throw error;
    }
  },

  /**
   * Find session by access token
   */
  async findByAccessToken(accessToken: string) {
    try {
      const result = await db
        .select()
        .from(adminSessions)
        .where(eq(adminSessions.accessToken, accessToken))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Error finding session by access token:', error);
      throw error;
    }
  },

  /**
   * Find session by refresh token
   */
  async findByRefreshToken(refreshToken: string) {
    try {
      const result = await db
        .select()
        .from(adminSessions)
        .where(eq(adminSessions.refreshToken, refreshToken))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Error finding session by refresh token:', error);
      throw error;
    }
  },

  /**
   * Find session by token hash
   */
  async findByTokenHash(tokenHash: string) {
    try {
      const result = await db
        .select()
        .from(adminSessions)
        .where(eq(adminSessions.tokenHash, tokenHash))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Error finding session by token hash:', error);
      throw error;
    }
  },

  /**
   * Create a new session
   */
  async create(data: Partial<NewAdminSession>) {
    try {
      // Generate tokens if not provided
      const accessToken = data.accessToken || this.generateToken();
      const refreshToken = data.refreshToken || this.generateToken();
      const tokenHash = this.hashToken(accessToken);

      // Set expiry time (24 hours for access token by default)
      const expiresAt = data.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);

      const result = await db
        .insert(adminSessions)
        .values({
          ...data,
          accessToken,
          refreshToken,
          tokenHash,
          expiresAt,
          createdAt: new Date(),
          lastActivityAt: new Date()
        })
        .returning();

      return result[0];
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  },

  /**
   * Update session by ID
   */
  async updateById(id: string, update: Partial<AdminSessionType>) {
    try {
      const result = await db
        .update(adminSessions)
        .set({
          ...update,
          lastActivityAt: new Date()
        })
        .where(eq(adminSessions.id, id))
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  },

  /**
   * Update last activity time
   */
  async updateActivity(id: string) {
    try {
      const result = await db
        .update(adminSessions)
        .set({
          lastActivityAt: new Date()
        })
        .where(eq(adminSessions.id, id))
        .returning();

      return result[0];
    } catch (error) {
      console.error('Error updating session activity:', error);
      throw error;
    }
  },

  /**
   * Delete a session (logout)
   */
  async deleteOne(filter: { _id?: string; id?: string; accessToken?: string }) {
    try {
      let whereClause;

      if (filter._id || filter.id) {
        whereClause = eq(adminSessions.id, filter._id || filter.id);
      } else if (filter.accessToken) {
        whereClause = eq(adminSessions.accessToken, filter.accessToken);
      } else {
        throw new Error('No valid filter provided for deletion');
      }

      const result = await db
        .delete(adminSessions)
        .where(whereClause)
        .returning();

      return {
        deletedCount: result.length
      };
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  },

  /**
   * Revoke a session
   */
  async revoke(id: string, revokedBy: string, reason?: string) {
    try {
      const result = await db
        .update(adminSessions)
        .set({
          status: 'revoked',
          revokedAt: new Date(),
          revokedBy,
          revokedReason: reason
        })
        .where(eq(adminSessions.id, id))
        .returning();

      return result[0];
    } catch (error) {
      console.error('Error revoking session:', error);
      throw error;
    }
  },

  /**
   * Get active sessions for a user
   */
  async getActiveUserSessions(adminUserId: string) {
    try {
      const now = new Date();

      const result = await db
        .select()
        .from(adminSessions)
        .where(
          and(
            eq(adminSessions.adminUserId, adminUserId),
            eq(adminSessions.status, 'active'),
            gte(adminSessions.expiresAt, now)
          )
        )
        .orderBy(desc(adminSessions.lastActivityAt));

      return result;
    } catch (error) {
      console.error('Error getting active user sessions:', error);
      throw error;
    }
  },

  /**
   * Delete expired sessions
   */
  async deleteExpired() {
    try {
      const now = new Date();

      const result = await db
        .delete(adminSessions)
        .where(
          and(
            lte(adminSessions.expiresAt, now),
            eq(adminSessions.status, 'active')
          )
        )
        .returning();

      return {
        deletedCount: result.length
      };
    } catch (error) {
      console.error('Error deleting expired sessions:', error);
      throw error;
    }
  },

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(adminUserId: string, excludeSessionId?: string) {
    try {
      let conditions = [eq(adminSessions.adminUserId, adminUserId)];

      if (excludeSessionId) {
        conditions.push(sql`${adminSessions.id} != ${excludeSessionId}`);
      }

      const result = await db
        .delete(adminSessions)
        .where(and(...conditions))
        .returning();

      return {
        deletedCount: result.length
      };
    } catch (error) {
      console.error('Error deleting user sessions:', error);
      throw error;
    }
  },

  /**
   * Validate session token
   */
  async validateToken(accessToken: string): Promise<AdminSessionType | null> {
    try {
      const now = new Date();
      const tokenHash = this.hashToken(accessToken);

      const result = await db
        .select()
        .from(adminSessions)
        .where(
          and(
            eq(adminSessions.tokenHash, tokenHash),
            eq(adminSessions.status, 'active'),
            gte(adminSessions.expiresAt, now)
          )
        )
        .limit(1);

      if (result.length > 0) {
        // Update last activity
        await this.updateActivity(result[0].id);
        return result[0];
      }

      return null;
    } catch (error) {
      console.error('Error validating token:', error);
      return null;
    }
  },

  /**
   * Refresh session tokens
   */
  async refreshTokens(refreshToken: string) {
    try {
      const session = await this.findByRefreshToken(refreshToken);

      if (!session || session.status !== 'active') {
        return null;
      }

      const now = new Date();
      if (session.expiresAt <= now) {
        return null;
      }

      // Generate new tokens
      const newAccessToken = this.generateToken();
      const newRefreshToken = this.generateToken();
      const newTokenHash = this.hashToken(newAccessToken);

      // Update session with new tokens
      const result = await db
        .update(adminSessions)
        .set({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          tokenHash: newTokenHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          lastActivityAt: new Date()
        })
        .where(eq(adminSessions.id, session.id))
        .returning();

      return result[0];
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      throw error;
    }
  },

  /**
   * Get session statistics
   */
  async getStatistics() {
    try {
      const now = new Date();

      const result = await db
        .select({
          total: sql<number>`count(*)`,
          active: sql<number>`sum(case when ${adminSessions.status} = 'active' and ${adminSessions.expiresAt} > ${now} then 1 else 0 end)`,
          expired: sql<number>`sum(case when ${adminSessions.status} = 'expired' or ${adminSessions.expiresAt} <= ${now} then 1 else 0 end)`,
          revoked: sql<number>`sum(case when ${adminSessions.status} = 'revoked' then 1 else 0 end)`,
          uniqueUsers: sql<number>`count(distinct ${adminSessions.adminUserId})`
        })
        .from(adminSessions);

      return result[0] || {
        total: 0,
        active: 0,
        expired: 0,
        revoked: 0,
        uniqueUsers: 0
      };
    } catch (error) {
      console.error('Error getting session statistics:', error);
      throw error;
    }
  },

  /**
   * Generate a secure random token
   */
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  },

  /**
   * Hash a token using SHA-256
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
};

// Export types for use in other modules
export type { AdminSessionType, NewAdminSession };