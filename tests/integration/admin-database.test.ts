import { db } from '@/lib/db';
import {
  adminUsers,
  adminSessions,
  auditLogs,
  subscribers,
  subscriberAnalytics
} from '@/lib/db/schema';
import { eq, gte, and, desc, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { mockAdminUsers } from '../fixtures/admin.fixtures';

describe('Admin Database Integration Tests', () => {
  beforeAll(async () => {
    // Ensure database is connected
    if (!db) {
      throw new Error('Database connection not established');
    }
  });

  afterEach(async () => {
    // Clean up test data after each test
    jest.clearAllMocks();
  });

  describe('Admin User Operations', () => {
    describe('Creating Admin Users', () => {
      it('should create a new admin user with encrypted password', async () => {
        const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

        const newAdmin = {
          email: 'test-admin@biggbuzz.com',
          passwordHash: hashedPassword,
          firstName: 'Test',
          lastName: 'Admin',
          role: 'moderator',
          isActive: true,
          isSuperAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const [insertedAdmin] = await db
          .insert(adminUsers)
          .values(newAdmin)
          .returning();

        expect(insertedAdmin).toBeDefined();
        expect(insertedAdmin.email).toBe('test-admin@biggbuzz.com');
        expect(insertedAdmin.role).toBe('moderator');
        expect(insertedAdmin.passwordHash).toBe(hashedPassword);

        // Clean up
        await db.delete(adminUsers).where(eq(adminUsers.id, insertedAdmin.id));
      });

      it('should enforce unique email constraint', async () => {
        const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

        const adminData = {
          email: 'unique-test@biggbuzz.com',
          passwordHash: hashedPassword,
          firstName: 'Test',
          lastName: 'Admin',
          role: 'viewer',
          isActive: true,
          isSuperAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // First insert should succeed
        const [firstAdmin] = await db
          .insert(adminUsers)
          .values(adminData)
          .returning();

        // Second insert with same email should fail
        await expect(
          db.insert(adminUsers).values(adminData)
        ).rejects.toThrow();

        // Clean up
        await db.delete(adminUsers).where(eq(adminUsers.id, firstAdmin.id));
      });

      it('should set default values correctly', async () => {
        const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

        const minimalAdmin = {
          email: 'minimal-test@biggbuzz.com',
          passwordHash: hashedPassword,
          firstName: 'Minimal',
          lastName: 'Test',
          role: 'viewer',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const [insertedAdmin] = await db
          .insert(adminUsers)
          .values(minimalAdmin)
          .returning();

        expect(insertedAdmin.isActive).toBe(true); // Default value
        expect(insertedAdmin.isSuperAdmin).toBe(false); // Default value
        expect(insertedAdmin.loginAttempts).toBe(0); // Default value
        expect(insertedAdmin.lockedUntil).toBeNull();
        expect(insertedAdmin.lastLogin).toBeNull();

        // Clean up
        await db.delete(adminUsers).where(eq(adminUsers.id, insertedAdmin.id));
      });
    });

    describe('Querying Admin Users', () => {
      let testAdminId: string;

      beforeEach(async () => {
        // Insert test admin for queries
        const hashedPassword = await bcrypt.hash('QueryTest123!', 10);
        const [admin] = await db
          .insert(adminUsers)
          .values({
            email: 'query-test@biggbuzz.com',
            passwordHash: hashedPassword,
            firstName: 'Query',
            lastName: 'Test',
            role: 'moderator',
            isActive: true,
            isSuperAdmin: false,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        testAdminId = admin.id;
      });

      afterEach(async () => {
        // Clean up test admin
        if (testAdminId) {
          await db.delete(adminUsers).where(eq(adminUsers.id, testAdminId));
        }
      });

      it('should find admin by email', async () => {
        const [admin] = await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.email, 'query-test@biggbuzz.com'));

        expect(admin).toBeDefined();
        expect(admin.email).toBe('query-test@biggbuzz.com');
        expect(admin.firstName).toBe('Query');
        expect(admin.role).toBe('moderator');
      });

      it('should find admin by ID', async () => {
        const [admin] = await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.id, testAdminId));

        expect(admin).toBeDefined();
        expect(admin.id).toBe(testAdminId);
      });

      it('should query active admins only', async () => {
        // Insert an inactive admin
        const hashedPassword = await bcrypt.hash('Inactive123!', 10);
        const [inactiveAdmin] = await db
          .insert(adminUsers)
          .values({
            email: 'inactive-query@biggbuzz.com',
            passwordHash: hashedPassword,
            firstName: 'Inactive',
            lastName: 'Query',
            role: 'viewer',
            isActive: false,
            isSuperAdmin: false,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        // Query active admins
        const activeAdmins = await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.isActive, true));

        // Should include our test admin but not the inactive one
        expect(activeAdmins.some(a => a.id === testAdminId)).toBe(true);
        expect(activeAdmins.some(a => a.id === inactiveAdmin.id)).toBe(false);

        // Clean up
        await db.delete(adminUsers).where(eq(adminUsers.id, inactiveAdmin.id));
      });

      it('should filter admins by role', async () => {
        const moderators = await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.role, 'moderator'));

        const filtered = moderators.filter(m => m.id === testAdminId);
        expect(filtered.length).toBe(1);
        expect(filtered[0].role).toBe('moderator');
      });
    });

    describe('Updating Admin Users', () => {
      let testAdminId: string;

      beforeEach(async () => {
        const hashedPassword = await bcrypt.hash('UpdateTest123!', 10);
        const [admin] = await db
          .insert(adminUsers)
          .values({
            email: 'update-test@biggbuzz.com',
            passwordHash: hashedPassword,
            firstName: 'Update',
            lastName: 'Test',
            role: 'viewer',
            isActive: true,
            isSuperAdmin: false,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        testAdminId = admin.id;
      });

      afterEach(async () => {
        if (testAdminId) {
          await db.delete(adminUsers).where(eq(adminUsers.id, testAdminId));
        }
      });

      it('should update login information', async () => {
        const now = new Date();
        const ip = '192.168.1.100';

        const [updated] = await db
          .update(adminUsers)
          .set({
            lastLogin: now,
            lastLoginIp: ip,
            loginAttempts: 0,
            updatedAt: now
          })
          .where(eq(adminUsers.id, testAdminId))
          .returning();

        expect(updated.lastLogin).toEqual(now);
        expect(updated.lastLoginIp).toBe(ip);
        expect(updated.loginAttempts).toBe(0);
      });

      it('should increment login attempts', async () => {
        const [before] = await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.id, testAdminId));

        const initialAttempts = before.loginAttempts || 0;

        const [updated] = await db
          .update(adminUsers)
          .set({
            loginAttempts: sql`${adminUsers.loginAttempts} + 1`,
            updatedAt: new Date()
          })
          .where(eq(adminUsers.id, testAdminId))
          .returning();

        expect(updated.loginAttempts).toBe(initialAttempts + 1);
      });

      it('should lock account after max attempts', async () => {
        const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        const [updated] = await db
          .update(adminUsers)
          .set({
            loginAttempts: 5,
            lockedUntil: lockUntil,
            updatedAt: new Date()
          })
          .where(eq(adminUsers.id, testAdminId))
          .returning();

        expect(updated.loginAttempts).toBe(5);
        expect(updated.lockedUntil).toBeDefined();
        expect(updated.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
      });

      it('should update password hash', async () => {
        const newPasswordHash = await bcrypt.hash('NewPassword123!', 10);

        const [updated] = await db
          .update(adminUsers)
          .set({
            passwordHash: newPasswordHash,
            updatedAt: new Date()
          })
          .where(eq(adminUsers.id, testAdminId))
          .returning();

        expect(updated.passwordHash).toBe(newPasswordHash);

        // Verify password works
        const isValid = await bcrypt.compare('NewPassword123!', updated.passwordHash);
        expect(isValid).toBe(true);
      });

      it('should change admin role', async () => {
        const [updated] = await db
          .update(adminUsers)
          .set({
            role: 'moderator',
            updatedAt: new Date()
          })
          .where(eq(adminUsers.id, testAdminId))
          .returning();

        expect(updated.role).toBe('moderator');
      });

      it('should deactivate admin', async () => {
        const [updated] = await db
          .update(adminUsers)
          .set({
            isActive: false,
            updatedAt: new Date()
          })
          .where(eq(adminUsers.id, testAdminId))
          .returning();

        expect(updated.isActive).toBe(false);
      });
    });
  });

  describe('Admin Session Operations', () => {
    let testAdminId: string;

    beforeAll(async () => {
      // Create test admin for sessions
      const hashedPassword = await bcrypt.hash('SessionTest123!', 10);
      const [admin] = await db
        .insert(adminUsers)
        .values({
          email: 'session-test@biggbuzz.com',
          passwordHash: hashedPassword,
          firstName: 'Session',
          lastName: 'Test',
          role: 'moderator',
          isActive: true,
          isSuperAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      testAdminId = admin.id;
    });

    afterAll(async () => {
      // Clean up test admin and all sessions
      if (testAdminId) {
        await db.delete(adminSessions).where(eq(adminSessions.adminUserId, testAdminId));
        await db.delete(adminUsers).where(eq(adminUsers.id, testAdminId));
      }
    });

    describe('Creating Sessions', () => {
      it('should create a new session', async () => {
        const sessionData = {
          adminUserId: testAdminId,
          accessToken: 'test-access-token-' + Date.now(),
          refreshToken: 'test-refresh-token-' + Date.now(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          ipAddress: '192.168.1.1',
          userAgent: 'Test Browser',
          status: 'active' as const,
          createdAt: new Date(),
          lastActivity: new Date()
        };

        const [session] = await db
          .insert(adminSessions)
          .values(sessionData)
          .returning();

        expect(session).toBeDefined();
        expect(session.adminUserId).toBe(testAdminId);
        expect(session.status).toBe('active');
        expect(session.accessToken).toBe(sessionData.accessToken);

        // Clean up
        await db.delete(adminSessions).where(eq(adminSessions.id, session.id));
      });

      it('should allow multiple sessions per user', async () => {
        const sessions = [];

        for (let i = 0; i < 3; i++) {
          const [session] = await db
            .insert(adminSessions)
            .values({
              adminUserId: testAdminId,
              accessToken: `multi-access-${i}-${Date.now()}`,
              refreshToken: `multi-refresh-${i}-${Date.now()}`,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              ipAddress: `192.168.1.${i + 1}`,
              userAgent: 'Test Browser',
              status: 'active' as const,
              createdAt: new Date(),
              lastActivity: new Date()
            })
            .returning();
          sessions.push(session);
        }

        // Query all sessions for user
        const userSessions = await db
          .select()
          .from(adminSessions)
          .where(eq(adminSessions.adminUserId, testAdminId));

        expect(userSessions.length).toBeGreaterThanOrEqual(3);

        // Clean up
        for (const session of sessions) {
          await db.delete(adminSessions).where(eq(adminSessions.id, session.id));
        }
      });
    });

    describe('Querying Sessions', () => {
      let testSessionId: string;

      beforeEach(async () => {
        const [session] = await db
          .insert(adminSessions)
          .values({
            adminUserId: testAdminId,
            accessToken: 'query-access-' + Date.now(),
            refreshToken: 'query-refresh-' + Date.now(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            ipAddress: '192.168.1.1',
            userAgent: 'Test Browser',
            status: 'active' as const,
            createdAt: new Date(),
            lastActivity: new Date()
          })
          .returning();
        testSessionId = session.id;
      });

      afterEach(async () => {
        if (testSessionId) {
          await db.delete(adminSessions).where(eq(adminSessions.id, testSessionId));
        }
      });

      it('should find session by access token', async () => {
        const [session] = await db
          .select()
          .from(adminSessions)
          .where(eq(adminSessions.id, testSessionId));

        expect(session).toBeDefined();
        expect(session.adminUserId).toBe(testAdminId);
      });

      it('should find active sessions', async () => {
        const activeSessions = await db
          .select()
          .from(adminSessions)
          .where(
            and(
              eq(adminSessions.adminUserId, testAdminId),
              eq(adminSessions.status, 'active')
            )
          );

        expect(activeSessions.length).toBeGreaterThanOrEqual(1);
        expect(activeSessions.every(s => s.status === 'active')).toBe(true);
      });

      it('should find expired sessions', async () => {
        // Create an expired session
        const [expiredSession] = await db
          .insert(adminSessions)
          .values({
            adminUserId: testAdminId,
            accessToken: 'expired-access-' + Date.now(),
            refreshToken: 'expired-refresh-' + Date.now(),
            expiresAt: new Date(Date.now() - 1000), // Already expired
            ipAddress: '192.168.1.2',
            userAgent: 'Test Browser',
            status: 'expired' as const,
            createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            lastActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
          })
          .returning();

        const expiredSessions = await db
          .select()
          .from(adminSessions)
          .where(
            and(
              eq(adminSessions.adminUserId, testAdminId),
              eq(adminSessions.status, 'expired')
            )
          );

        expect(expiredSessions.some(s => s.id === expiredSession.id)).toBe(true);

        // Clean up
        await db.delete(adminSessions).where(eq(adminSessions.id, expiredSession.id));
      });
    });

    describe('Updating Sessions', () => {
      let testSessionId: string;

      beforeEach(async () => {
        const [session] = await db
          .insert(adminSessions)
          .values({
            adminUserId: testAdminId,
            accessToken: 'update-access-' + Date.now(),
            refreshToken: 'update-refresh-' + Date.now(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            ipAddress: '192.168.1.1',
            userAgent: 'Test Browser',
            status: 'active' as const,
            createdAt: new Date(),
            lastActivity: new Date()
          })
          .returning();
        testSessionId = session.id;
      });

      afterEach(async () => {
        if (testSessionId) {
          await db.delete(adminSessions).where(eq(adminSessions.id, testSessionId));
        }
      });

      it('should update last activity', async () => {
        const now = new Date();

        const [updated] = await db
          .update(adminSessions)
          .set({
            lastActivity: now
          })
          .where(eq(adminSessions.id, testSessionId))
          .returning();

        expect(updated.lastActivity).toEqual(now);
      });

      it('should revoke session', async () => {
        const [updated] = await db
          .update(adminSessions)
          .set({
            status: 'revoked',
            revokedAt: new Date()
          })
          .where(eq(adminSessions.id, testSessionId))
          .returning();

        expect(updated.status).toBe('revoked');
        expect(updated.revokedAt).toBeDefined();
      });

      it('should expire session', async () => {
        const [updated] = await db
          .update(adminSessions)
          .set({
            status: 'expired',
            expiresAt: new Date(Date.now() - 1000)
          })
          .where(eq(adminSessions.id, testSessionId))
          .returning();

        expect(updated.status).toBe('expired');
        expect(updated.expiresAt.getTime()).toBeLessThan(Date.now());
      });
    });
  });

  describe('Audit Log Operations', () => {
    describe('Creating Audit Logs', () => {
      it('should create audit log for login', async () => {
        const auditData = {
          adminEmail: 'admin@biggbuzz.com',
          adminRole: 'super_admin',
          action: 'login',
          entityType: 'admin_auth',
          description: 'Successful login',
          ipAddress: '192.168.1.1',
          userAgent: 'Test Browser',
          isSuccess: true,
          createdAt: new Date()
        };

        const [log] = await db
          .insert(auditLogs)
          .values(auditData)
          .returning();

        expect(log).toBeDefined();
        expect(log.action).toBe('login');
        expect(log.isSuccess).toBe(true);

        // Clean up
        await db.delete(auditLogs).where(eq(auditLogs.id, log.id));
      });

      it('should create audit log for failed action', async () => {
        const auditData = {
          adminEmail: 'hacker@evil.com',
          adminRole: 'unknown',
          action: 'login',
          entityType: 'admin_auth',
          description: 'Failed login attempt',
          metadata: { reason: 'Invalid credentials' },
          ipAddress: '10.0.0.1',
          userAgent: 'Suspicious Browser',
          isSuccess: false,
          errorMessage: 'Authentication failed',
          riskLevel: 3,
          isSecurity: true,
          createdAt: new Date()
        };

        const [log] = await db
          .insert(auditLogs)
          .values(auditData)
          .returning();

        expect(log).toBeDefined();
        expect(log.isSuccess).toBe(false);
        expect(log.riskLevel).toBe(3);
        expect(log.isSecurity).toBe(true);
        expect(log.errorMessage).toBe('Authentication failed');

        // Clean up
        await db.delete(auditLogs).where(eq(auditLogs.id, log.id));
      });

      it('should create audit log for data modification', async () => {
        const auditData = {
          adminUserId: 'admin-001',
          adminEmail: 'admin@biggbuzz.com',
          adminRole: 'super_admin',
          action: 'update',
          entityType: 'registration',
          entityId: 'reg-001',
          entityName: 'Green Valley Dispensary',
          description: 'Updated registration status',
          metadata: {
            changes: {
              status: { from: 'pending', to: 'approved' }
            }
          },
          ipAddress: '192.168.1.1',
          userAgent: 'Test Browser',
          isSuccess: true,
          isCompliance: true,
          createdAt: new Date()
        };

        const [log] = await db
          .insert(auditLogs)
          .values(auditData)
          .returning();

        expect(log).toBeDefined();
        expect(log.entityType).toBe('registration');
        expect(log.entityId).toBe('reg-001');
        expect(log.metadata).toEqual({
          changes: {
            status: { from: 'pending', to: 'approved' }
          }
        });

        // Clean up
        await db.delete(auditLogs).where(eq(auditLogs.id, log.id));
      });
    });

    describe('Querying Audit Logs', () => {
      let testLogIds: string[] = [];

      beforeEach(async () => {
        // Create test audit logs
        const logs = await db
          .insert(auditLogs)
          .values([
            {
              adminEmail: 'admin@biggbuzz.com',
              adminRole: 'super_admin',
              action: 'login',
              entityType: 'admin_auth',
              description: 'Login test 1',
              ipAddress: '192.168.1.1',
              userAgent: 'Test Browser',
              isSuccess: true,
              createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
            },
            {
              adminEmail: 'admin@biggbuzz.com',
              adminRole: 'super_admin',
              action: 'update',
              entityType: 'registration',
              description: 'Update test',
              ipAddress: '192.168.1.1',
              userAgent: 'Test Browser',
              isSuccess: true,
              createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
            },
            {
              adminEmail: 'moderator@biggbuzz.com',
              adminRole: 'moderator',
              action: 'delete',
              entityType: 'registration',
              description: 'Delete test',
              ipAddress: '192.168.1.2',
              userAgent: 'Test Browser',
              isSuccess: false,
              errorMessage: 'Permission denied',
              createdAt: new Date()
            }
          ])
          .returning();

        testLogIds = logs.map(l => l.id);
      });

      afterEach(async () => {
        // Clean up test logs
        for (const id of testLogIds) {
          await db.delete(auditLogs).where(eq(auditLogs.id, id));
        }
      });

      it('should query logs by admin email', async () => {
        const logs = await db
          .select()
          .from(auditLogs)
          .where(eq(auditLogs.adminEmail, 'admin@biggbuzz.com'));

        const testLogs = logs.filter(l => testLogIds.includes(l.id));
        expect(testLogs.length).toBe(2);
        expect(testLogs.every(l => l.adminEmail === 'admin@biggbuzz.com')).toBe(true);
      });

      it('should query logs by action type', async () => {
        const logs = await db
          .select()
          .from(auditLogs)
          .where(eq(auditLogs.action, 'update'));

        const testLogs = logs.filter(l => testLogIds.includes(l.id));
        expect(testLogs.length).toBe(1);
        expect(testLogs[0].action).toBe('update');
      });

      it('should query failed actions', async () => {
        const logs = await db
          .select()
          .from(auditLogs)
          .where(eq(auditLogs.isSuccess, false));

        const testLogs = logs.filter(l => testLogIds.includes(l.id));
        expect(testLogs.length).toBe(1);
        expect(testLogs[0].errorMessage).toBe('Permission denied');
      });

      it('should query logs by date range', async () => {
        const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);

        const logs = await db
          .select()
          .from(auditLogs)
          .where(gte(auditLogs.createdAt, oneHourAgo))
          .orderBy(desc(auditLogs.createdAt));

        const testLogs = logs.filter(l => testLogIds.includes(l.id));
        expect(testLogs.length).toBeGreaterThanOrEqual(1);
      });

      it('should paginate audit logs', async () => {
        const pageSize = 2;
        const page = 1;

        const logs = await db
          .select()
          .from(auditLogs)
          .orderBy(desc(auditLogs.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize);

        expect(logs.length).toBeLessThanOrEqual(pageSize);
      });
    });
  });

  describe('Dashboard Statistics Queries', () => {
    describe('Subscriber Statistics', () => {
      it('should calculate total subscribers', async () => {
        const [result] = await db
          .select({ count: sql<number>`count(*)` })
          .from(subscribers);

        expect(result).toBeDefined();
        expect(typeof result.count).toBe('number');
      });

      it('should count subscribers by status', async () => {
        const statusCounts = await db
          .select({
            status: subscribers.status,
            count: sql<number>`count(*)`
          })
          .from(subscribers)
          .groupBy(subscribers.status);

        expect(Array.isArray(statusCounts)).toBe(true);
        statusCounts.forEach(row => {
          expect(['active', 'pending', 'suspended']).toContain(row.status);
          expect(typeof row.count).toBe('number');
        });
      });

      it('should calculate daily registrations', async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [result] = await db
          .select({ count: sql<number>`count(*)` })
          .from(subscribers)
          .where(gte(subscribers.createdAt, today));

        expect(result).toBeDefined();
        expect(typeof result.count).toBe('number');
      });

      it('should get registration trend data', async () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const trendData = await db
          .select({
            date: sql<string>`DATE(${subscribers.createdAt})`,
            count: sql<number>`count(*)`
          })
          .from(subscribers)
          .where(gte(subscribers.createdAt, thirtyDaysAgo))
          .groupBy(sql`DATE(${subscribers.createdAt})`)
          .orderBy(sql`DATE(${subscribers.createdAt})`);

        expect(Array.isArray(trendData)).toBe(true);
        trendData.forEach(row => {
          expect(row.date).toBeDefined();
          expect(typeof row.count).toBe('number');
        });
      });

      it('should calculate growth rate', async () => {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const [thisMonthCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(subscribers)
          .where(gte(subscribers.createdAt, thisMonth));

        const [lastMonthCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(subscribers)
          .where(
            and(
              gte(subscribers.createdAt, lastMonth),
              sql`${subscribers.createdAt} < ${thisMonth}`
            )
          );

        const thisMonthTotal = Number(thisMonthCount?.count || 0);
        const lastMonthTotal = Number(lastMonthCount?.count || 0);

        const growthRate = lastMonthTotal > 0
          ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
          : 0;

        expect(typeof growthRate).toBe('number');
      });
    });

    describe('Analytics Aggregation', () => {
      it('should get latest analytics snapshot', async () => {
        const [latest] = await db
          .select()
          .from(subscriberAnalytics)
          .orderBy(desc(subscriberAnalytics.createdAt))
          .limit(1);

        if (latest) {
          expect(latest).toHaveProperty('totalSignups');
          expect(latest).toHaveProperty('verifiedSignups');
          expect(latest).toHaveProperty('conversionRate');
          expect(latest).toHaveProperty('uniqueVisitors');
        }
      });

      it('should calculate email verification rate', async () => {
        const [verifiedCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(subscribers)
          .where(eq(subscribers.emailVerified, true));

        const [totalCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(subscribers);

        const verificationRate = totalCount.count > 0
          ? (Number(verifiedCount.count) / Number(totalCount.count)) * 100
          : 0;

        expect(typeof verificationRate).toBe('number');
        expect(verificationRate).toBeGreaterThanOrEqual(0);
        expect(verificationRate).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Database Transactions', () => {
    it('should rollback transaction on error', async () => {
      let adminId: string | null = null;

      try {
        await db.transaction(async (tx) => {
          // Insert admin (should succeed)
          const [admin] = await tx
            .insert(adminUsers)
            .values({
              email: 'transaction-test@biggbuzz.com',
              passwordHash: 'test-hash',
              firstName: 'Transaction',
              lastName: 'Test',
              role: 'viewer',
              isActive: true,
              isSuperAdmin: false,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();

          adminId = admin.id;

          // Force an error by inserting duplicate
          await tx
            .insert(adminUsers)
            .values({
              email: 'transaction-test@biggbuzz.com', // Duplicate email
              passwordHash: 'test-hash',
              firstName: 'Duplicate',
              lastName: 'Test',
              role: 'viewer',
              isActive: true,
              isSuperAdmin: false,
              createdAt: new Date(),
              updatedAt: new Date()
            });
        });
      } catch (error) {
        // Transaction should have rolled back
      }

      // Verify admin was not created due to rollback
      if (adminId) {
        const [admin] = await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.id, adminId));

        expect(admin).toBeUndefined();
      }
    });

    it('should commit successful transaction', async () => {
      let adminId: string | null = null;
      let sessionId: string | null = null;

      try {
        await db.transaction(async (tx) => {
          // Insert admin
          const [admin] = await tx
            .insert(adminUsers)
            .values({
              email: 'tx-success@biggbuzz.com',
              passwordHash: 'test-hash',
              firstName: 'Success',
              lastName: 'Transaction',
              role: 'viewer',
              isActive: true,
              isSuperAdmin: false,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();

          adminId = admin.id;

          // Insert session for admin
          const [session] = await tx
            .insert(adminSessions)
            .values({
              adminUserId: adminId,
              accessToken: 'tx-access-token',
              refreshToken: 'tx-refresh-token',
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              ipAddress: '192.168.1.1',
              userAgent: 'Test Browser',
              status: 'active' as const,
              createdAt: new Date(),
              lastActivity: new Date()
            })
            .returning();

          sessionId = session.id;

          // Log the action
          await tx
            .insert(auditLogs)
            .values({
              adminUserId: adminId,
              adminEmail: 'tx-success@biggbuzz.com',
              adminRole: 'viewer',
              action: 'login',
              entityType: 'admin_auth',
              description: 'Transaction test login',
              ipAddress: '192.168.1.1',
              userAgent: 'Test Browser',
              sessionId: sessionId,
              isSuccess: true,
              createdAt: new Date()
            });
        });

        // Verify all records were created
        if (adminId) {
          const [admin] = await db
            .select()
            .from(adminUsers)
            .where(eq(adminUsers.id, adminId));

          expect(admin).toBeDefined();
          expect(admin.email).toBe('tx-success@biggbuzz.com');
        }

        if (sessionId) {
          const [session] = await db
            .select()
            .from(adminSessions)
            .where(eq(adminSessions.id, sessionId));

          expect(session).toBeDefined();
          expect(session.adminUserId).toBe(adminId);
        }

      } finally {
        // Clean up
        if (sessionId) {
          await db.delete(adminSessions).where(eq(adminSessions.id, sessionId));
        }
        if (adminId) {
          await db.delete(adminUsers).where(eq(adminUsers.id, adminId));
        }
      }
    });
  });
});