import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth';
import { AuditLog } from '@/lib/db/models/AuditLog';
import { AdminUser } from '@/lib/db/models/AdminUser';
import { connectToDatabase } from '@/lib/db/connection';

async function getAuditLogs(req: AuthenticatedRequest) {
  try {
    await connectToDatabase();

    // Check permission
    if (!req.user?.permissions.includes('view_audit_logs')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const userId = searchParams.get('userId') || '';
    const action = searchParams.get('action') || '';
    const resource = searchParams.get('resource') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const severity = searchParams.get('severity') || '';

    // Build query
    const query: any = {};

    if (userId) {
      query.userId = userId;
    }

    if (action) {
      query.action = { $regex: action, $options: 'i' };
    }

    if (resource) {
      query.resource = resource;
    }

    if (severity) {
      query.severity = severity;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    // Get user details for the logs
    const userIds = [...new Set(logs.map(log => log.userId).filter(Boolean))];
    const users = await AdminUser.find({ _id: { $in: userIds } })
      .select('_id email name')
      .lean();

    const userMap = users.reduce((acc, user) => {
      acc[user._id.toString()] = user;
      return acc;
    }, {} as Record<string, any>);

    // Enhance logs with user details
    const enhancedLogs = logs.map(log => ({
      ...log,
      user: log.userId ? userMap[log.userId] : null,
    }));

    // Log this audit log access
    await AuditLog.create({
      userId: req.user.userId,
      action: 'view_audit_logs',
      resource: 'admin_audit_logs',
      details: {
        page,
        limit,
        filters: { userId, action, resource, severity, startDate, endDate },
        resultsCount: logs.length,
      },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      logs: enhancedLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching audit logs' },
      { status: 500 }
    );
  }
}

async function exportAuditLogs(req: AuthenticatedRequest) {
  try {
    await connectToDatabase();

    // Check permission
    if (!req.user?.permissions.includes('export_audit_logs')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    const query: any = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Get logs
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Log export
    await AuditLog.create({
      userId: req.user.userId,
      action: 'export_audit_logs',
      resource: 'admin_audit_logs',
      details: {
        format,
        startDate,
        endDate,
        recordCount: logs.length,
      },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    });

    if (format === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(logs);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${Date.now()}.csv"`,
        },
      });
    } else {
      // Return as JSON
      return NextResponse.json({
        logs,
        exportedAt: new Date().toISOString(),
        recordCount: logs.length,
      });
    }
  } catch (error) {
    console.error('Export audit logs error:', error);
    return NextResponse.json(
      { error: 'An error occurred while exporting audit logs' },
      { status: 500 }
    );
  }
}

function convertToCSV(logs: any[]): string {
  const headers = [
    'Timestamp',
    'User ID',
    'Action',
    'Resource',
    'Resource ID',
    'IP Address',
    'User Agent',
    'Details',
  ];

  const rows = logs.map(log => [
    log.createdAt,
    log.userId || 'N/A',
    log.action,
    log.resource || 'N/A',
    log.resourceId || 'N/A',
    log.ipAddress || 'N/A',
    log.userAgent || 'N/A',
    JSON.stringify(log.details || {}),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}

export const GET = withAuth(getAuditLogs);
export const POST = withAuth(exportAuditLogs);