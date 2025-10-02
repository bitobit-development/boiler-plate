import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth';
import { Subscriber } from '@/lib/db/models/Subscriber';
import { AuditLog } from '@/lib/db/models/AuditLog';
import { connectToDatabase } from '@/lib/db/connection';
import { db } from '@/lib/db';
import { subscribers } from '@/lib/db/schema';
import { eq, ilike, or, and, desc, asc, sql, gte, lte } from 'drizzle-orm';
import { withCache, CacheKeys, CacheTTL, deletePattern } from '@/lib/cache';

async function getRegistrations(req: AuthenticatedRequest) {
  try {
    await connectToDatabase();

    // Check permission - allow super_admin or specific permission
    if (!req.user?.permissions.includes('view_registrations') && req.user?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const source = searchParams.get('source') || '';
    // Map frontend field names to actual database fields
    const fieldMapping: { [key: string]: string } = {
      'submittedAt': 'createdAt',
      'registrationType': 'source',
      'companyName': 'name',
      'phone': 'mobile',
      'documents': 'customFields'
    };

    const sortByField = searchParams.get('sortBy') || 'createdAt';
    const sortBy = fieldMapping[sortByField] || sortByField;
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Try to get from cache first
    const cacheKey = CacheKeys.registrations({
      page,
      limit,
      status,
      search,
      sortBy,
      sortOrder
    });

    const cachedData = await withCache(
      cacheKey,
      CacheTTL.registrations, // 2 minutes
      async () => {
        // This function only runs on cache MISS
        // Audit logging happens OUTSIDE this function (for every request)
        return await fetchRegistrationsFromDB({
          page,
          limit,
          search,
          status,
          source,
          sortBy,
          sortOrder,
          startDate,
          endDate
        });
      }
    );

    // Log access for EVERY request (not just cache misses)
    // Using background fire-and-forget to avoid blocking response
    AuditLog.create({
      adminUserId: req.user.userId,
      adminEmail: req.user.email,
      adminRole: req.user.role,
      action: 'read',
      entityType: 'registration',
      description: 'Viewed registration list',
      metadata: {
        page,
        limit,
        filters: { search, status, source, startDate, endDate },
        resultsCount: cachedData.registrations?.length || 0,
      },
      ipAddress: req.headers.get('x-forwarded-for') || '::1',
      userAgent: req.headers.get('user-agent') || 'unknown',
    }).catch(err => console.error('[Audit Log Error]:', err));

    return NextResponse.json(cachedData);
  } catch (error) {
    console.error('Get registrations error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching registrations' },
      { status: 500 }
    );
  }
}

/**
 * Fetch registrations from database (called on cache MISS)
 *
 * @param params - Query parameters for filtering and pagination
 * @returns Registrations data ready to be cached
 */
async function fetchRegistrationsFromDB(params: {
  page: number;
  limit: number;
  search: string;
  status: string;
  source: string;
  sortBy: string;
  sortOrder: string;
  startDate: string | null;
  endDate: string | null;
}) {
  const { page, limit, search, status, source, sortBy, sortOrder, startDate, endDate } = params;
  const startTime = Date.now();

  // Build query conditions using Drizzle ORM
  const conditions = [];

  if (search) {
    conditions.push(
      or(
        ilike(subscribers.email, `%${search}%`),
        ilike(subscribers.name, `%${search}%`),
        ilike(subscribers.surname, `%${search}%`),
        ilike(subscribers.mobile, `%${search}%`)
      )
    );
  }

  if (status && status !== 'all') {
    // Map frontend status to database status
    const statusMapping: { [key: string]: string } = {
      'approved': 'active',
      'rejected': 'suspended',
      'pending': 'pending'
    };
    const dbStatus = statusMapping[status] || status;
    conditions.push(eq(subscribers.status, dbStatus as any));
  }

  if (source) {
    conditions.push(eq(subscribers.source, source));
  }

  if (startDate || endDate) {
    if (startDate) {
      conditions.push(gte(subscribers.createdAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(subscribers.createdAt, new Date(endDate)));
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Execute query with pagination
  const skip = (page - 1) * limit;

  // Build sort clause
  const sortColumn = subscribers[sortBy as keyof typeof subscribers];
  const orderByClause = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  // Execute queries
  const [registrationsResult, totalResult] = await Promise.all([
    db
      .select()
      .from(subscribers)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(skip),
    db
      .select({ count: sql<number>`count(*)` })
      .from(subscribers)
      .where(whereClause)
  ]);

  const total = Number(totalResult[0]?.count || 0);

  // Transform database records to match frontend expectations
  const registrations = registrationsResult.map(sub => ({
    _id: sub.id,
    id: sub.id,
    name: sub.name,
    surname: sub.surname,
    email: sub.email,
    phone: sub.mobile,
    mobile: sub.mobile,
    companyName: sub.name, // Using name as company name for now
    companyWebsite: sub.customFields?.website as string || '',
    registrationType: sub.source || 'website',
    status: sub.status === 'active' ? 'approved' :
            sub.status === 'suspended' ? 'rejected' : 'pending',
    ageVerified: sub.ageVerified,
    emailVerified: sub.emailVerified,
    mobileVerified: sub.mobileVerified,
    source: sub.source,
    submittedAt: sub.createdAt,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
    notes: sub.notes,
    tags: sub.tags || [],
    documents: sub.customFields?.documents as any[] || [],
    customFields: sub.customFields || {}
  }));

  const endTime = Date.now();
  console.log(`[Registrations] Fetched from database in ${endTime - startTime}ms`);

  return {
    registrations,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
}

async function updateRegistration(req: AuthenticatedRequest) {
  try {
    await connectToDatabase();

    // Check permission
    if (!req.user?.permissions.includes('manage_registrations')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Registration ID is required' },
        { status: 400 }
      );
    }

    // Update registration using Drizzle ORM
    const updateResult = await Subscriber.updateOne(
      { id },
      { ...updates }
    );

    const registration = updateResult.data;

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    // Log update
    await AuditLog.create({
      userId: req.user.userId,
      action: 'update_registration',
      resource: 'admin_registrations',
      resourceId: id,
      details: {
        updates,
        previousStatus: registration.status,
      },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    });

    // Invalidate caches - registration update affects cached data
    await Promise.all([
      deletePattern(CacheKeys.patterns.allRegistrations()),
      deletePattern(CacheKeys.patterns.allStats()),
      deletePattern(CacheKeys.patterns.allDashboard()),
    ]);
    console.log('[Cache INVALIDATE] Registration updated - cleared all caches');

    // Broadcast update via Socket.IO (if available)
    try {
      const { broadcastRegistrationUpdate } = await import('@/lib/socket/broadcast');
      broadcastRegistrationUpdate(id, updates);
    } catch (socketError) {
      // Socket.IO not available, continue without broadcasting
      console.log('Socket.IO broadcast skipped');
    }

    return NextResponse.json({
      success: true,
      registration,
    });
  } catch (error) {
    console.error('Update registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating registration' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return withAuth(getRegistrations)(req);
}

export async function PUT(req: NextRequest) {
  return withAuth(updateRegistration)(req);
}