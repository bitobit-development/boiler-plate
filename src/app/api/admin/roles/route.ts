import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth';
import { db, adminRoles, auditLogs } from '@/lib/db';
import { asc, eq } from 'drizzle-orm';

async function getRoles(req: AuthenticatedRequest) {
  try {
    // Check permission
    if (!req.user?.permissions.includes('manage_users')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const roles = await db.select().from(adminRoles).orderBy(asc(adminRoles.name));

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('Get roles error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching roles' },
      { status: 500 }
    );
  }
}

async function createRole(req: AuthenticatedRequest) {
  try {
    // Check permission - only super admins can create roles
    if (!req.user?.permissions.includes('manage_roles')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, description, permissions } = body;

    if (!name || !permissions) {
      return NextResponse.json(
        { error: 'Name and permissions are required' },
        { status: 400 }
      );
    }

    // Check if role already exists
    const existingRole = await db.select().from(adminRoles).where(eq(adminRoles.name, name)).limit(1);
    if (existingRole.length > 0) {
      return NextResponse.json(
        { error: 'Role with this name already exists' },
        { status: 409 }
      );
    }

    // Create role
    const [newRole] = await db.insert(adminRoles).values({
      name,
      description,
      permissions,
    }).returning();

    // Log creation
    await db.insert(auditLogs).values({
      adminUserId: req.user.userId,
      adminEmail: req.user.email,
      adminRole: req.user.role,
      action: 'create',
      entityType: 'admin_role',
      entityId: newRole.id,
      entityName: newRole.name,
      description: `Created role: ${newRole.name}`,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      role: newRole,
    });
  } catch (error) {
    console.error('Create role error:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating role' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getRoles);
export const POST = withAuth(createRole);