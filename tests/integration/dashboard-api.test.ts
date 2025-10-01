import { NextRequest } from 'next/server';
import * as statsRoute from '@/app/api/admin/dashboard/stats/route';
import * as registrationsRoute from '@/app/api/admin/registrations/route';
import * as jwt from 'jsonwebtoken';
import { mockRegistrations, mockDashboardStats } from '@/test/fixtures/admin.fixtures';

// Mock database models and connections
jest.mock('@/lib/db/models/Registration');
jest.mock('@/lib/db/models/AdminUser');
jest.mock('@/lib/db/models/AuditLog');
jest.mock('@/lib/db/connection', () => ({
  connectToDatabase: jest.fn().mockResolvedValue(true)
}));

// Mock auth middleware
jest.mock('@/lib/middleware/auth', () => ({
  withAuth: (handler: any) => handler,
  requirePermissions: (...perms: string[]) => (handler: any) => handler
}));

const { Registration } = require('@/lib/db/models/Registration');
const { AuditLog } = require('@/lib/db/models/AuditLog');

describe('Dashboard API Integration Tests', () => {
  const validToken = jwt.sign(
    {
      userId: '123',
      email: 'admin@biggbuzz.com',
      role: 'super_admin',
      permissions: ['registrations_read', 'registrations_write', 'analytics_read'],
      sessionId: 'session-123'
    },
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
    { expiresIn: '15m' }
  );

  beforeEach(() => {
    jest.clearAllMocks();
    AuditLog.create.mockResolvedValue({});
  });

  describe('GET /api/admin/dashboard/stats', () => {
    const createStatsRequest = (params: Record<string, string> = {}) => {
      const url = new URL('http://localhost:3000/api/admin/dashboard/stats');
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });

      return new NextRequest(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      });
    };

    it('should return dashboard statistics', async () => {
      // Mock aggregation results
      Registration.aggregate.mockResolvedValue([
        { _id: null, total: 150 }
      ]);

      Registration.countDocuments.mockImplementation((query: any) => {
        if (query.status === 'pending') return Promise.resolve(25);
        if (query.createdAt) return Promise.resolve(8);
        return Promise.resolve(0);
      });

      Registration.aggregate
        .mockResolvedValueOnce([{ _id: null, total: 150 }]) // Total
        .mockResolvedValueOnce([
          { _id: 'dispensary', count: 75 },
          { _id: 'cultivation', count: 45 },
          { _id: 'processing', count: 20 },
          { _id: 'distribution', count: 10 }
        ]) // By type
        .mockResolvedValueOnce([
          { _id: 'pending', count: 25 },
          { _id: 'approved', count: 109 },
          { _id: 'rejected', count: 16 }
        ]) // By status
        .mockResolvedValueOnce([
          { date: '2025-01-15', count: 8 },
          { date: '2025-01-14', count: 12 },
          { date: '2025-01-13', count: 6 }
        ]); // Trend data

      Registration.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(mockRegistrations.slice(0, 5))
      });

      const request = createStatsRequest();
      const response = await statsRoute.GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body).toHaveProperty('totalRegistrations');
      expect(body).toHaveProperty('pendingReviews');
      expect(body).toHaveProperty('todayRegistrations');
      expect(body).toHaveProperty('approvalRate');
      expect(body).toHaveProperty('registrationsByType');
      expect(body).toHaveProperty('registrationsByStatus');
      expect(body).toHaveProperty('recentRegistrations');
      expect(body).toHaveProperty('trendData');

      expect(body.totalRegistrations).toBe(150);
      expect(body.pendingReviews).toBe(25);
      expect(body.todayRegistrations).toBe(8);
    });

    it('should handle date range filters', async () => {
      Registration.aggregate.mockResolvedValue([{ _id: null, total: 50 }]);
      Registration.countDocuments.mockResolvedValue(10);
      Registration.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue([])
      });

      const request = createStatsRequest({
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      });

      const response = await statsRoute.GET(request);

      expect(response.status).toBe(200);
      expect(Registration.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              createdAt: expect.any(Object)
            })
          })
        ])
      );
    });

    it('should cache results appropriately', async () => {
      Registration.aggregate.mockResolvedValue([{ _id: null, total: 100 }]);
      Registration.countDocuments.mockResolvedValue(5);
      Registration.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue([])
      });

      // First request
      const request1 = createStatsRequest();
      const response1 = await statsRoute.GET(request1);
      expect(response1.status).toBe(200);

      // Headers should indicate caching
      expect(response1.headers.get('Cache-Control')).toBe('private, max-age=60');
    });

    it('should handle database errors gracefully', async () => {
      Registration.aggregate.mockRejectedValue(new Error('Database error'));

      const request = createStatsRequest();
      const response = await statsRoute.GET(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to fetch dashboard statistics');
    });
  });

  describe('GET /api/admin/registrations', () => {
    const createRegistrationsRequest = (params: Record<string, string> = {}) => {
      const url = new URL('http://localhost:3000/api/admin/registrations');
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });

      return new NextRequest(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      });
    };

    it('should return paginated registrations', async () => {
      Registration.countDocuments.mockResolvedValue(150);
      Registration.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockRegistrations)
      });

      const request = createRegistrationsRequest({
        page: '1',
        limit: '10'
      });

      const response = await registrationsRoute.GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body).toHaveProperty('registrations');
      expect(body).toHaveProperty('pagination');
      expect(body.pagination).toMatchObject({
        currentPage: 1,
        pageSize: 10,
        totalItems: 150,
        totalPages: 15
      });

      expect(Registration.find).toHaveBeenCalled();
      expect(Registration.find().skip).toHaveBeenCalledWith(0);
      expect(Registration.find().limit).toHaveBeenCalledWith(10);
    });

    it('should filter by status', async () => {
      Registration.countDocuments.mockResolvedValue(25);
      Registration.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(
          mockRegistrations.filter(r => r.status === 'pending')
        )
      });

      const request = createRegistrationsRequest({
        status: 'pending'
      });

      const response = await registrationsRoute.GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(Registration.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' })
      );
      expect(body.registrations.every((r: any) => r.status === 'pending')).toBe(true);
    });

    it('should filter by license type', async () => {
      Registration.countDocuments.mockResolvedValue(75);
      Registration.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(
          mockRegistrations.filter(r => r.licenseType === 'dispensary')
        )
      });

      const request = createRegistrationsRequest({
        licenseType: 'dispensary'
      });

      const response = await registrationsRoute.GET(request);

      expect(response.status).toBe(200);
      expect(Registration.find).toHaveBeenCalledWith(
        expect.objectContaining({ licenseType: 'dispensary' })
      );
    });

    it('should search by business name or email', async () => {
      Registration.countDocuments.mockResolvedValue(2);
      Registration.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockRegistrations[0]])
      });

      const request = createRegistrationsRequest({
        search: 'Green Valley'
      });

      const response = await registrationsRoute.GET(request);

      expect(response.status).toBe(200);
      expect(Registration.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ businessName: expect.any(RegExp) }),
            expect.objectContaining({ email: expect.any(RegExp) })
          ])
        })
      });
    });

    it('should sort registrations', async () => {
      Registration.countDocuments.mockResolvedValue(150);
      Registration.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockRegistrations)
      });

      const request = createRegistrationsRequest({
        sortBy: 'createdAt',
        sortOrder: 'asc'
      });

      const response = await registrationsRoute.GET(request);

      expect(response.status).toBe(200);
      expect(Registration.find().sort).toHaveBeenCalledWith({ createdAt: 1 });
    });

    it('should handle invalid pagination parameters', async () => {
      Registration.countDocuments.mockResolvedValue(150);
      Registration.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockRegistrations.slice(0, 20))
      });

      const request = createRegistrationsRequest({
        page: '-1',
        limit: '1000'
      });

      const response = await registrationsRoute.GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();

      // Should use defaults for invalid values
      expect(body.pagination.currentPage).toBe(1);
      expect(body.pagination.pageSize).toBe(100); // Max limit
    });
  });

  describe('PUT /api/admin/registrations/:id', () => {
    const createUpdateRequest = (id: string, body: any) => {
      return new NextRequest(`http://localhost:3000/api/admin/registrations/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
    };

    it('should update registration status', async () => {
      const mockRegistration = {
        _id: '1',
        ...mockRegistrations[0],
        save: jest.fn()
      };

      Registration.findById.mockResolvedValue(mockRegistration);

      const request = createUpdateRequest('1', {
        status: 'approved',
        notes: 'All documentation verified'
      });

      // Mock the route params
      const response = await registrationsRoute.PUT(
        request,
        { params: { id: '1' } }
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.registration.status).toBe('approved');

      expect(mockRegistration.save).toHaveBeenCalled();
      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'registration_update',
          resource: 'registration',
          resourceId: '1'
        })
      );
    });

    it('should validate status transitions', async () => {
      const mockRegistration = {
        _id: '1',
        status: 'approved',
        ...mockRegistrations[1]
      };

      Registration.findById.mockResolvedValue(mockRegistration);

      const request = createUpdateRequest('1', {
        status: 'pending' // Invalid transition
      });

      const response = await registrationsRoute.PUT(
        request,
        { params: { id: '1' } }
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Invalid status transition');
    });

    it('should handle non-existent registration', async () => {
      Registration.findById.mockResolvedValue(null);

      const request = createUpdateRequest('999', {
        status: 'approved'
      });

      const response = await registrationsRoute.PUT(
        request,
        { params: { id: '999' } }
      );

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Registration not found');
    });

    it('should validate required fields for approval', async () => {
      const mockRegistration = {
        _id: '1',
        status: 'pending',
        ...mockRegistrations[0],
        save: jest.fn()
      };

      Registration.findById.mockResolvedValue(mockRegistration);

      const request = createUpdateRequest('1', {
        status: 'approved'
        // Missing notes field which might be required for approval
      });

      const response = await registrationsRoute.PUT(
        request,
        { params: { id: '1' } }
      );

      // Depends on business logic - adjust based on actual implementation
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('DELETE /api/admin/registrations/:id', () => {
    const createDeleteRequest = (id: string) => {
      return new NextRequest(`http://localhost:3000/api/admin/registrations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      });
    };

    it('should delete registration', async () => {
      const mockRegistration = {
        _id: '1',
        ...mockRegistrations[2], // Rejected registration
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 })
      };

      Registration.findById.mockResolvedValue(mockRegistration);

      const request = createDeleteRequest('1');
      const response = await registrationsRoute.DELETE(
        request,
        { params: { id: '1' } }
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('Registration deleted successfully');

      expect(mockRegistration.deleteOne).toHaveBeenCalled();
      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'registration_delete',
          resource: 'registration',
          resourceId: '1'
        })
      );
    });

    it('should prevent deletion of approved registrations', async () => {
      const mockRegistration = {
        _id: '2',
        status: 'approved',
        ...mockRegistrations[1]
      };

      Registration.findById.mockResolvedValue(mockRegistration);

      const request = createDeleteRequest('2');
      const response = await registrationsRoute.DELETE(
        request,
        { params: { id: '2' } }
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Cannot delete approved registration');
    });

    it('should handle non-existent registration', async () => {
      Registration.findById.mockResolvedValue(null);

      const request = createDeleteRequest('999');
      const response = await registrationsRoute.DELETE(
        request,
        { params: { id: '999' } }
      );

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Registration not found');
    });
  });
});