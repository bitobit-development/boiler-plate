import { db } from '@/lib/db';
import { subscribers, type Subscriber as SubscriberType, type NewSubscriber } from '@/lib/db/schema';
import { eq, gte, lt, and, desc, asc, sql, inArray } from 'drizzle-orm';

/**
 * Subscriber model operations using Drizzle ORM
 */
export const Subscriber = {
  /**
   * Find all subscribers with optional filters
   */
  async find(filters: Partial<SubscriberType> = {}) {
    try {
      let query = db.select().from(subscribers);

      // Apply filters if provided
      if (filters.status) {
        query = query.where(eq(subscribers.status, filters.status)) as any;
      }

      if (filters.emailVerified !== undefined) {
        query = query.where(eq(subscribers.emailVerified, filters.emailVerified)) as any;
      }

      return await query;
    } catch (error) {
      console.error('Error finding subscribers:', error);
      throw error;
    }
  },

  /**
   * Find a single subscriber by ID
   */
  async findById(id: string) {
    try {
      const result = await db
        .select()
        .from(subscribers)
        .where(eq(subscribers.id, id))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Error finding subscriber by ID:', error);
      throw error;
    }
  },

  /**
   * Find a single subscriber by email
   */
  async findByEmail(email: string) {
    try {
      const result = await db
        .select()
        .from(subscribers)
        .where(eq(subscribers.email, email))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Error finding subscriber by email:', error);
      throw error;
    }
  },

  /**
   * Create a new subscriber
   */
  async create(data: NewSubscriber) {
    try {
      const result = await db
        .insert(subscribers)
        .values(data)
        .returning();

      return result[0];
    } catch (error) {
      console.error('Error creating subscriber:', error);
      throw error;
    }
  },

  /**
   * Update a subscriber by ID
   */
  async updateOne(filter: { _id?: string; id?: string; email?: string }, update: Partial<SubscriberType>) {
    try {
      const id = filter._id || filter.id;
      let whereClause;

      if (id) {
        whereClause = eq(subscribers.id, id);
      } else if (filter.email) {
        whereClause = eq(subscribers.email, filter.email);
      } else {
        throw new Error('No valid filter provided for update');
      }

      const result = await db
        .update(subscribers)
        .set({
          ...update,
          updatedAt: new Date()
        })
        .where(whereClause)
        .returning();

      return {
        modifiedCount: result.length,
        data: result[0]
      };
    } catch (error) {
      console.error('Error updating subscriber:', error);
      throw error;
    }
  },

  /**
   * Delete a subscriber by ID
   */
  async deleteOne(filter: { _id?: string; id?: string }) {
    try {
      const id = filter._id || filter.id;
      if (!id) {
        throw new Error('No ID provided for deletion');
      }

      const result = await db
        .delete(subscribers)
        .where(eq(subscribers.id, id))
        .returning();

      return {
        deletedCount: result.length
      };
    } catch (error) {
      console.error('Error deleting subscriber:', error);
      throw error;
    }
  },

  /**
   * Count documents with optional filters
   */
  async countDocuments(filter: any = {}) {
    try {
      let conditions = [];

      if (filter.status) {
        conditions.push(eq(subscribers.status, filter.status));
      }

      if (filter.emailVerified !== undefined) {
        conditions.push(eq(subscribers.emailVerified, filter.emailVerified));
      }

      if (filter.mobile) {
        conditions.push(eq(subscribers.mobile, filter.mobile));
      }

      if (filter.email) {
        conditions.push(eq(subscribers.email, filter.email));
      }

      if (filter.createdAt) {
        if (filter.createdAt.$gte) {
          conditions.push(gte(subscribers.createdAt, filter.createdAt.$gte));
        }
        if (filter.createdAt.$lt) {
          conditions.push(lt(subscribers.createdAt, filter.createdAt.$lt));
        }
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(subscribers)
        .where(whereClause);

      return Number(result[0]?.count || 0);
    } catch (error) {
      console.error('Error counting documents:', error);
      throw error;
    }
  },

  /**
   * Aggregate data (for MongoDB compatibility)
   */
  async aggregate(pipeline: any[]) {
    try {
      // Handle common aggregation patterns
      if (pipeline.length > 0 && pipeline[0].$group) {
        const groupBy = pipeline[0].$group._id;
        const fieldName = groupBy?.replace('$', '') || 'status';

        // Special handling for date grouping
        if (pipeline[0].$match?.createdAt?.$gte) {
          // Daily activity aggregation
          const result = await db
            .select({
              _id: sql<string>`DATE(${subscribers.createdAt})`,
              registrations: sql<number>`count(*)`
            })
            .from(subscribers)
            .where(gte(subscribers.createdAt, pipeline[0].$match.createdAt.$gte))
            .groupBy(sql`DATE(${subscribers.createdAt})`)
            .orderBy(asc(sql`DATE(${subscribers.createdAt})`));

          return result;
        }

        // Regular grouping
        const field = subscribers[fieldName as keyof typeof subscribers];
        if (field) {
          const result = await db
            .select({
              _id: field,
              count: sql<number>`count(*)`
            })
            .from(subscribers)
            .groupBy(field)
            .orderBy(desc(sql`count(*)`));

          return result;
        }
      }

      // Return empty array for unsupported aggregations
      return [];
    } catch (error) {
      console.error('Error in aggregation:', error);
      throw error;
    }
  },

  /**
   * Find with pagination and sorting
   */
  async findPaginated(options: {
    page?: number;
    limit?: number;
    sort?: { [key: string]: 1 | -1 };
    filter?: Partial<SubscriberType>;
  }) {
    try {
      const page = options.page || 1;
      const limit = options.limit || 10;
      const offset = (page - 1) * limit;

      let query = db.select().from(subscribers);

      // Apply filters
      if (options.filter?.status) {
        query = query.where(eq(subscribers.status, options.filter.status)) as any;
      }

      // Apply sorting
      if (options.sort) {
        const sortKey = Object.keys(options.sort)[0] as keyof typeof subscribers;
        const sortDirection = options.sort[sortKey];
        const field = subscribers[sortKey];

        if (field) {
          query = sortDirection === -1
            ? query.orderBy(desc(field)) as any
            : query.orderBy(asc(field)) as any;
        }
      } else {
        query = query.orderBy(desc(subscribers.createdAt)) as any;
      }

      // Apply pagination
      query = query.limit(limit).offset(offset) as any;

      const results = await query;
      const total = await this.countDocuments(options.filter || {});

      return {
        data: results,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error in paginated find:', error);
      throw error;
    }
  },

  /**
   * Bulk operations
   */
  async insertMany(documents: NewSubscriber[]) {
    try {
      const result = await db
        .insert(subscribers)
        .values(documents)
        .returning();

      return result;
    } catch (error) {
      console.error('Error in bulk insert:', error);
      throw error;
    }
  },

  /**
   * Update many documents
   */
  async updateMany(filter: Partial<SubscriberType>, update: Partial<SubscriberType>) {
    try {
      let conditions = [];

      if (filter.status) {
        conditions.push(eq(subscribers.status, filter.status));
      }

      if (filter.emailVerified !== undefined) {
        conditions.push(eq(subscribers.emailVerified, filter.emailVerified));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .update(subscribers)
        .set({
          ...update,
          updatedAt: new Date()
        })
        .where(whereClause)
        .returning();

      return {
        modifiedCount: result.length,
        data: result
      };
    } catch (error) {
      console.error('Error updating many:', error);
      throw error;
    }
  },

  /**
   * Delete many documents
   */
  async deleteMany(filter: Partial<SubscriberType>) {
    try {
      let conditions = [];

      if (filter.status) {
        conditions.push(eq(subscribers.status, filter.status));
      }

      if (filter.emailVerified !== undefined) {
        conditions.push(eq(subscribers.emailVerified, filter.emailVerified));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .delete(subscribers)
        .where(whereClause)
        .returning();

      return {
        deletedCount: result.length
      };
    } catch (error) {
      console.error('Error deleting many:', error);
      throw error;
    }
  }
};

// Export type for use in other modules
export type { SubscriberType, NewSubscriber };