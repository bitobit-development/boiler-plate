import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth';
import { AuditLog } from '@/lib/db/models/AuditLog';
import { connectToDatabase } from '@/lib/db/connection';
import { db } from '@/lib/db';
import { subscribers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withCache, CacheKeys, CacheTTL } from '@/lib/cache';

async function getRegistration(req: AuthenticatedRequest) {
  try {
    await connectToDatabase();

    // Check permission - allow super_admin or specific permissions
    const hasViewPermission = req.user?.permissions.includes('view_registrations') ||
                             req.user?.permissions.includes('manage_registrations');

    if (!hasViewPermission && req.user?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Extract ID from the URL
    const urlParts = req.url.split('/');
    const id = urlParts[urlParts.length - 1];

    // Validate ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid registration ID format' },
        { status: 400 }
      );
    }

    // Try to get from cache first
    const cacheKey = CacheKeys.registration(id);

    const cachedData = await withCache(
      cacheKey,
      CacheTTL.registrations, // 2 minutes TTL
      async () => {
        // This function only runs on cache MISS
        return await fetchRegistrationFromDB(id);
      }
    );

    // Handle not found case
    if (!cachedData || !cachedData.registration) {
      // Log the attempt even for not found
      AuditLog.create({
        adminUserId: req.user.userId,
        adminEmail: req.user.email,
        adminRole: req.user.role,
        action: 'read',
        entityType: 'registration',
        entityId: id,
        description: 'Attempted to view registration - not found',
        isSuccess: false,
        metadata: {
          registrationId: id,
          error: 'Not found'
        },
        ipAddress: req.headers.get('x-forwarded-for') || '::1',
        userAgent: req.headers.get('user-agent') || 'unknown',
      }).catch(err => console.error('[Audit Log Error]:', err));

      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    // Log successful access for EVERY request (not just cache misses)
    // Using background fire-and-forget to avoid blocking response
    AuditLog.create({
      adminUserId: req.user.userId,
      adminEmail: req.user.email,
      adminRole: req.user.role,
      action: 'read',
      entityType: 'registration',
      entityId: id,
      entityName: `${cachedData.registration.name} ${cachedData.registration.surname}`,
      description: 'Viewed registration details',
      isSuccess: true,
      metadata: {
        registrationId: id,
        registrationEmail: cachedData.registration.email,
        registrationStatus: cachedData.registration.status,
      },
      ipAddress: req.headers.get('x-forwarded-for') || '::1',
      userAgent: req.headers.get('user-agent') || 'unknown',
    }).catch(err => console.error('[Audit Log Error]:', err));

    return NextResponse.json(cachedData);
  } catch (error) {
    console.error('Get registration error:', error);

    // Log the error
    const urlParts = req.url.split('/');
    const id = urlParts[urlParts.length - 1];

    AuditLog.create({
      adminUserId: req.user?.userId || 'unknown',
      adminEmail: req.user?.email || 'unknown',
      adminRole: req.user?.role || 'unknown',
      action: 'read',
      entityType: 'registration',
      entityId: id,
      description: 'Failed to retrieve registration',
      isSuccess: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        registrationId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      ipAddress: req.headers.get('x-forwarded-for') || '::1',
      userAgent: req.headers.get('user-agent') || 'unknown',
    }).catch(err => console.error('[Audit Log Error]:', err));

    return NextResponse.json(
      { error: 'An error occurred while fetching the registration' },
      { status: 500 }
    );
  }
}

/**
 * Fetch single registration from database with extended details (called on cache MISS)
 *
 * @param id - Registration ID
 * @returns Registration data with extended details ready to be cached
 */
async function fetchRegistrationFromDB(id: string) {
  const startTime = Date.now();

  try {
    // Fetch the registration from database
    const registrationResult = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.id, id))
      .limit(1);

    // If not found, return null
    if (!registrationResult || registrationResult.length === 0) {
      return null;
    }

    const sub = registrationResult[0];

    // Transform database record to match frontend expectations
    const registration = {
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
      status: sub.status === 'active' ? 'approved' as const :
              sub.status === 'suspended' ? 'rejected' as const :
              'pending' as const,
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
      customFields: sub.customFields || {},
      // Additional fields for extended data
      country: sub.country,
      region: sub.region,
      city: sub.city,
      registrationIp: sub.registrationIp,
      campaign: sub.campaign,
      referrer: sub.referrer,
      utmSource: sub.utmSource,
      utmMedium: sub.utmMedium,
      utmCampaign: sub.utmCampaign,
      consentMarketing: sub.consentMarketing,
      consentDataProcessing: sub.consentDataProcessing,
      consentTerms: sub.consentTerms,
      engagementScore: sub.engagementScore,
      lastActivityAt: sub.lastActivityAt,
      verifiedAt: sub.verifiedAt,
      deletedAt: sub.deletedAt
    };

    // Fetch recent audit logs for this registration (last 10)
    const auditLogs = await AuditLog.getByEntity('registration', id, 10);

    // Add document metadata if documents exist
    let documentMetadata = null;
    if (sub.customFields?.documents && Array.isArray(sub.customFields.documents)) {
      documentMetadata = (sub.customFields.documents as any[]).map(doc => ({
        id: doc.id || null,
        name: doc.name || 'Unknown',
        type: doc.type || 'unknown',
        size: doc.size || 0,
        uploadedAt: doc.uploadedAt || doc.createdAt || null,
        url: doc.url || null,
        status: doc.status || 'pending'
      }));
    }

    // Build status history from audit logs (filtering for status-related changes)
    const statusHistory = auditLogs
      .filter(log =>
        log.action === 'update' &&
        log.metadata &&
        typeof log.metadata === 'object' &&
        'updates' in log.metadata &&
        (log.metadata as any).updates?.status
      )
      .map(log => ({
        status: (log.metadata as any).updates.status,
        previousStatus: (log.metadata as any).previousStatus || null,
        changedBy: log.adminEmail,
        changedAt: log.createdAt,
        reason: (log.metadata as any).updates.notes || null
      }));

    const endTime = Date.now();
    console.log(`[Registration] Fetched single registration from database in ${endTime - startTime}ms`);

    return {
      registration: {
        ...registration,
        auditLogs: auditLogs.map(log => ({
          id: log.id,
          action: log.action,
          adminEmail: log.adminEmail,
          adminRole: log.adminRole,
          description: log.description,
          metadata: log.metadata,
          createdAt: log.createdAt,
          isSuccess: log.isSuccess
        })),
        statusHistory,
        documentMetadata
      }
    };
  } catch (error) {
    console.error('[Registration] Error fetching from database:', error);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  return withAuth(getRegistration)(req);
}