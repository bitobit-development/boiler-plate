import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth';
import { db } from '@/lib/db';
import { auditLogs, adminActionHistory, dataChangeHistory, adminUsers } from '@/lib/db/schema';
import { desc, eq, sql, and, gte } from 'drizzle-orm';

async function getRecentActivity(req: AuthenticatedRequest) {
  try {
    // Check permission - allow super_admin or specific permission
    if (!req.user?.permissions.includes('view_analytics') && req.user?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const entityType = searchParams.get('entityType');
    const adminUserId = searchParams.get('adminUserId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build conditions for audit logs
    const conditions = [];

    if (entityType) {
      conditions.push(eq(auditLogs.entityType, entityType));
    }

    if (adminUserId) {
      conditions.push(eq(auditLogs.adminUserId, adminUserId));
    }

    if (startDate) {
      conditions.push(gte(auditLogs.createdAt, new Date(startDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch recent audit logs with admin user info
    const recentLogs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        entityName: auditLogs.entityName,
        description: auditLogs.description,
        changes: auditLogs.changes,
        adminEmail: auditLogs.adminEmail,
        adminRole: auditLogs.adminRole,
        adminUserId: auditLogs.adminUserId,
        ipAddress: auditLogs.ipAddress,
        isSuccess: auditLogs.isSuccess,
        errorMessage: auditLogs.errorMessage,
        createdAt: auditLogs.createdAt,
        metadata: auditLogs.metadata,
        userName: adminUsers.firstName,
        userSurname: adminUsers.lastName
      })
      .from(auditLogs)
      .leftJoin(adminUsers, eq(auditLogs.adminUserId, adminUsers.id))
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(whereClause);

    const total = Number(totalResult[0]?.count || 0);

    // Transform to match frontend expectations
    const activities = recentLogs.map(log => ({
      id: log.id,
      type: getActivityType(log.entityType),
      action: log.action,
      title: getActivityTitle(log.action, log.entityType),
      description: log.description,
      entityType: log.entityType,
      entityId: log.entityId,
      entityName: log.entityName,
      userName: log.userName && log.userSurname
        ? `${log.userName} ${log.userSurname}`
        : log.adminEmail,
      userEmail: log.adminEmail,
      userRole: log.adminRole,
      userId: log.adminUserId,
      timestamp: log.createdAt,
      ipAddress: log.ipAddress,
      isSuccess: log.isSuccess,
      errorMessage: log.errorMessage,
      changes: log.changes,
      metadata: log.metadata,
      icon: getActivityIcon(log.action),
      color: getActivityColor(log.entityType, log.isSuccess)
    }));

    // Get summary statistics
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const statsResult = await db
      .select({
        totalToday: sql<number>`COUNT(CASE WHEN ${auditLogs.createdAt} >= ${sql`${last24Hours.toISOString()}`} THEN 1 END)`,
        totalSuccess: sql<number>`COUNT(CASE WHEN ${auditLogs.isSuccess} = true THEN 1 END)`,
        totalFailure: sql<number>`COUNT(CASE WHEN ${auditLogs.isSuccess} = false THEN 1 END)`,
        uniqueUsers: sql<number>`COUNT(DISTINCT ${auditLogs.adminUserId})`
      })
      .from(auditLogs)
      .where(whereClause);

    const stats = {
      totalToday: Number(statsResult[0]?.totalToday || 0),
      totalSuccess: Number(statsResult[0]?.totalSuccess || 0),
      totalFailure: Number(statsResult[0]?.totalFailure || 0),
      uniqueUsers: Number(statsResult[0]?.uniqueUsers || 0)
    };

    return NextResponse.json({
      activities,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      stats
    });

  } catch (error) {
    console.error('Get activity error:', error);

    // Return a fallback response to prevent frontend crashes
    return NextResponse.json({
      activities: [],
      total: 0,
      limit: 20,
      offset: 0,
      hasMore: false,
      stats: {
        totalToday: 0,
        totalSuccess: 0,
        totalFailure: 0,
        uniqueUsers: 0
      }
    });
  }
}

// Helper functions
function getActivityType(entityType: string | null): string {
  if (!entityType) return 'system';

  switch (entityType.toLowerCase()) {
    case 'registration':
    case 'subscriber':
      return 'registration';
    case 'review':
      return 'review';
    case 'admin':
    case 'user':
    case 'admin_user':
      return 'admin_action';
    case 'login':
    case 'logout':
    case 'session':
      return 'auth';
    default:
      return 'system';
  }
}

function getActivityTitle(action: string, entityType: string | null): string {
  const entity = entityType || 'item';
  const actionLower = action.toLowerCase();

  if (actionLower.includes('login')) return 'User Login';
  if (actionLower.includes('logout')) return 'User Logout';
  if (actionLower.includes('create')) return `Created ${entity}`;
  if (actionLower.includes('update')) return `Updated ${entity}`;
  if (actionLower.includes('delete')) return `Deleted ${entity}`;
  if (actionLower.includes('approve')) return `Approved ${entity}`;
  if (actionLower.includes('reject')) return `Rejected ${entity}`;
  if (actionLower.includes('export')) return `Exported ${entity}`;
  if (actionLower.includes('import')) return `Imported ${entity}`;
  if (actionLower.includes('view')) return `Viewed ${entity}`;

  return `${action} ${entity}`;
}

function getActivityIcon(action: string): string {
  const actionLower = action.toLowerCase();

  if (actionLower.includes('login')) return 'LogIn';
  if (actionLower.includes('logout')) return 'LogOut';
  if (actionLower.includes('create') || actionLower.includes('add')) return 'Plus';
  if (actionLower.includes('update') || actionLower.includes('edit')) return 'Edit';
  if (actionLower.includes('delete') || actionLower.includes('remove')) return 'Trash';
  if (actionLower.includes('approve')) return 'CheckCircle';
  if (actionLower.includes('reject')) return 'XCircle';
  if (actionLower.includes('export')) return 'Download';
  if (actionLower.includes('import')) return 'Upload';
  if (actionLower.includes('view') || actionLower.includes('read')) return 'Eye';

  return 'Activity';
}

function getActivityColor(entityType: string | null, isSuccess: boolean): string {
  if (!isSuccess) return 'red';

  if (!entityType) return 'gray';

  switch (entityType.toLowerCase()) {
    case 'registration':
    case 'subscriber':
      return 'blue';
    case 'review':
      return 'purple';
    case 'admin':
    case 'admin_user':
      return 'orange';
    case 'login':
    case 'logout':
    case 'session':
      return 'green';
    default:
      return 'gray';
  }
}

export async function GET(req: NextRequest) {
  return withAuth(getRecentActivity)(req);
}