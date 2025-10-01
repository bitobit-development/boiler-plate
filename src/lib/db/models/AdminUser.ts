import { db } from '@/lib/db';
import { adminUsers, type AdminUser as AdminUserType, type NewAdminUser } from '@/lib/db/schema';
import { eq, and, gte, lte, sql, or, ne, desc, asc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

/**
 * AdminUser model operations using Drizzle ORM
 */
export const AdminUser = {
  /**
   * Find a single admin user by various criteria
   */
  async findOne(filter: any = {}) {
    try {
      let conditions = [];

      if (filter.email) {
        conditions.push(eq(adminUsers.email, filter.email));
      }

      if (filter.username) {
        conditions.push(eq(adminUsers.username, filter.username));
      }

      if (filter._id || filter.id) {
        conditions.push(eq(adminUsers.id, filter._id || filter.id));
      }

      if (filter.isActive !== undefined) {
        conditions.push(eq(adminUsers.isActive, filter.isActive));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select()
        .from(adminUsers)
        .where(whereClause)
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Error finding admin user:', error);
      throw error;
    }
  },

  /**
   * Find admin users with filters
   */
  async find(filter: any = {}, options: any = {}) {
    try {
      let query = db.select().from(adminUsers);

      // Build conditions
      let conditions = [];

      if (filter.role) {
        conditions.push(eq(adminUsers.role, filter.role));
      }

      if (filter.isActive !== undefined) {
        conditions.push(eq(adminUsers.isActive, filter.isActive));
      }

      if (filter.isSuperAdmin !== undefined) {
        conditions.push(eq(adminUsers.isSuperAdmin, filter.isSuperAdmin));
      }

      if (filter.twoFactorEnabled !== undefined) {
        conditions.push(eq(adminUsers.twoFactorEnabled, filter.twoFactorEnabled));
      }

      // Apply conditions
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      // Apply sorting
      if (options.sort) {
        const sortKey = Object.keys(options.sort)[0] as keyof typeof adminUsers;
        const sortDirection = options.sort[sortKey];
        const field = adminUsers[sortKey];

        if (field) {
          query = sortDirection === -1
            ? query.orderBy(desc(field)) as any
            : query.orderBy(asc(field)) as any;
        }
      } else {
        query = query.orderBy(desc(adminUsers.createdAt)) as any;
      }

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
      console.error('Error finding admin users:', error);
      throw error;
    }
  },

  /**
   * Find admin user by ID
   */
  async findById(id: string) {
    try {
      const result = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.id, id))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Error finding admin user by ID:', error);
      throw error;
    }
  },

  /**
   * Find admin user by email
   */
  async findByEmail(email: string) {
    try {
      const result = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.email, email))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Error finding admin user by email:', error);
      throw error;
    }
  },

  /**
   * Find admin user by username
   */
  async findByUsername(username: string) {
    try {
      const result = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.username, username))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Error finding admin user by username:', error);
      throw error;
    }
  },

  /**
   * Create a new admin user
   */
  async create(data: Partial<NewAdminUser> & { password?: string }) {
    try {
      // Hash password if provided
      let passwordHash = data.passwordHash;
      if (data.password) {
        passwordHash = await bcrypt.hash(data.password, 12);
      }

      const { password, ...userData } = data;

      const result = await db
        .insert(adminUsers)
        .values({
          ...userData,
          passwordHash: passwordHash!,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // Remove sensitive data before returning
      const { passwordHash: _, twoFactorSecret: __, backupCodes: ___, ...safeUser } = result[0];
      return safeUser;
    } catch (error) {
      console.error('Error creating admin user:', error);
      throw error;
    }
  },

  /**
   * Update admin user by ID
   */
  async updateById(id: string, update: Partial<AdminUserType> & { password?: string }) {
    try {
      // Hash password if provided
      if (update.password) {
        update.passwordHash = await bcrypt.hash(update.password, 12);
        update.lastPasswordChange = new Date();
        delete update.password;
      }

      const result = await db
        .update(adminUsers)
        .set({
          ...update,
          updatedAt: new Date()
        })
        .where(eq(adminUsers.id, id))
        .returning();

      if (result.length === 0) {
        return null;
      }

      // Remove sensitive data before returning
      const { passwordHash: _, twoFactorSecret: __, backupCodes: ___, ...safeUser } = result[0];
      return safeUser;
    } catch (error) {
      console.error('Error updating admin user:', error);
      throw error;
    }
  },

  /**
   * Delete admin user by ID
   */
  async deleteById(id: string) {
    try {
      const result = await db
        .delete(adminUsers)
        .where(eq(adminUsers.id, id))
        .returning();

      return {
        deletedCount: result.length
      };
    } catch (error) {
      console.error('Error deleting admin user:', error);
      throw error;
    }
  },

  /**
   * Count admin users with filters
   */
  async countDocuments(filter: any = {}) {
    try {
      let conditions = [];

      if (filter.role) {
        conditions.push(eq(adminUsers.role, filter.role));
      }

      if (filter.isActive !== undefined) {
        conditions.push(eq(adminUsers.isActive, filter.isActive));
      }

      if (filter.isSuperAdmin !== undefined) {
        conditions.push(eq(adminUsers.isSuperAdmin, filter.isSuperAdmin));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(adminUsers)
        .where(whereClause);

      return Number(result[0]?.count || 0);
    } catch (error) {
      console.error('Error counting admin users:', error);
      throw error;
    }
  },

  /**
   * Verify password for an admin user
   */
  async verifyPassword(user: AdminUserType, password: string) {
    try {
      return await bcrypt.compare(password, user.passwordHash);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  },

  /**
   * Update login information
   */
  async updateLoginInfo(id: string, ipAddress: string) {
    try {
      const result = await db
        .update(adminUsers)
        .set({
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress,
          loginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date()
        })
        .where(eq(adminUsers.id, id))
        .returning();

      return result[0];
    } catch (error) {
      console.error('Error updating login info:', error);
      throw error;
    }
  },

  /**
   * Increment login attempts
   */
  async incrementLoginAttempts(id: string) {
    try {
      const user = await this.findById(id);
      if (!user) return null;

      const attempts = (user.loginAttempts || 0) + 1;
      let lockedUntil = user.lockedUntil;

      // Lock account after 5 failed attempts for 15 minutes
      if (attempts >= 5) {
        const lockTime = new Date();
        lockTime.setMinutes(lockTime.getMinutes() + 15);
        lockedUntil = lockTime;
      }

      const result = await db
        .update(adminUsers)
        .set({
          loginAttempts: attempts,
          lockedUntil,
          updatedAt: new Date()
        })
        .where(eq(adminUsers.id, id))
        .returning();

      return result[0];
    } catch (error) {
      console.error('Error incrementing login attempts:', error);
      throw error;
    }
  },

  /**
   * Get active admin users
   */
  async getActiveAdmins() {
    try {
      const result = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.isActive, true))
        .orderBy(desc(adminUsers.lastLoginAt));

      return result;
    } catch (error) {
      console.error('Error getting active admins:', error);
      throw error;
    }
  },

  /**
   * Get admin users by role
   */
  async getByRole(role: 'super_admin' | 'admin' | 'viewer') {
    try {
      const result = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.role, role))
        .orderBy(adminUsers.firstName);

      return result;
    } catch (error) {
      console.error('Error getting admins by role:', error);
      throw error;
    }
  },

  /**
   * Check if email exists (excluding a specific user)
   */
  async emailExists(email: string, excludeId?: string) {
    try {
      let conditions = [eq(adminUsers.email, email)];

      if (excludeId) {
        conditions.push(ne(adminUsers.id, excludeId));
      }

      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(adminUsers)
        .where(and(...conditions));

      return Number(result[0]?.count || 0) > 0;
    } catch (error) {
      console.error('Error checking email existence:', error);
      throw error;
    }
  },

  /**
   * Check if username exists (excluding a specific user)
   */
  async usernameExists(username: string, excludeId?: string) {
    try {
      let conditions = [eq(adminUsers.username, username)];

      if (excludeId) {
        conditions.push(ne(adminUsers.id, excludeId));
      }

      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(adminUsers)
        .where(and(...conditions));

      return Number(result[0]?.count || 0) > 0;
    } catch (error) {
      console.error('Error checking username existence:', error);
      throw error;
    }
  },

  /**
   * Search admin users
   */
  async search(searchText: string, limit: number = 50) {
    try {
      const result = await db
        .select()
        .from(adminUsers)
        .where(
          or(
            sql`${adminUsers.email} ILIKE ${`%${searchText}%`}`,
            sql`${adminUsers.username} ILIKE ${`%${searchText}%`}`,
            sql`${adminUsers.firstName} ILIKE ${`%${searchText}%`}`,
            sql`${adminUsers.lastName} ILIKE ${`%${searchText}%`}`
          )
        )
        .orderBy(adminUsers.firstName)
        .limit(limit);

      // Remove sensitive data
      return result.map(user => {
        const { passwordHash, twoFactorSecret, backupCodes, ...safeUser } = user;
        return safeUser;
      });
    } catch (error) {
      console.error('Error searching admin users:', error);
      throw error;
    }
  },

  /**
   * Get admin statistics
   */
  async getStatistics() {
    try {
      const result = await db
        .select({
          total: sql<number>`count(*)`,
          active: sql<number>`sum(case when ${adminUsers.isActive} then 1 else 0 end)`,
          inactive: sql<number>`sum(case when not ${adminUsers.isActive} then 1 else 0 end)`,
          superAdmins: sql<number>`sum(case when ${adminUsers.isSuperAdmin} then 1 else 0 end)`,
          admins: sql<number>`sum(case when ${adminUsers.role} = 'admin' then 1 else 0 end)`,
          viewers: sql<number>`sum(case when ${adminUsers.role} = 'viewer' then 1 else 0 end)`,
          twoFactorEnabled: sql<number>`sum(case when ${adminUsers.twoFactorEnabled} then 1 else 0 end)`
        })
        .from(adminUsers);

      return result[0] || {
        total: 0,
        active: 0,
        inactive: 0,
        superAdmins: 0,
        admins: 0,
        viewers: 0,
        twoFactorEnabled: 0
      };
    } catch (error) {
      console.error('Error getting admin statistics:', error);
      throw error;
    }
  }
};

// Export types for use in other modules
export type { AdminUserType, NewAdminUser };