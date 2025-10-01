import { AdminUser, AdminRole, Registration, AuditLog, PermissionScope } from '@/lib/types/admin';

// Mock admin users
export const mockAdminUsers: Partial<AdminUser>[] = [
  {
    id: '1',
    email: 'admin@biggbuzz.com',
    name: 'Super Admin',
    role: 'super_admin',
    isActive: true,
    lastLogin: new Date('2025-01-15T10:00:00Z'),
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-15T10:00:00Z')
  },
  {
    id: '2',
    email: 'moderator@biggbuzz.com',
    name: 'John Moderator',
    role: 'moderator',
    isActive: true,
    lastLogin: new Date('2025-01-15T09:00:00Z'),
    createdAt: new Date('2024-02-01T00:00:00Z'),
    updatedAt: new Date('2025-01-15T09:00:00Z')
  },
  {
    id: '3',
    email: 'viewer@biggbuzz.com',
    name: 'Jane Viewer',
    role: 'viewer',
    isActive: true,
    lastLogin: null,
    createdAt: new Date('2024-03-01T00:00:00Z'),
    updatedAt: new Date('2024-03-01T00:00:00Z')
  },
  {
    id: '4',
    email: 'inactive@biggbuzz.com',
    name: 'Inactive User',
    role: 'viewer',
    isActive: false,
    lastLogin: null,
    createdAt: new Date('2024-04-01T00:00:00Z'),
    updatedAt: new Date('2024-04-01T00:00:00Z')
  }
];

// Mock admin roles
export const mockAdminRoles: AdminRole[] = [
  {
    id: '1',
    name: 'super_admin',
    displayName: 'Super Admin',
    description: 'Full system access',
    permissions: [
      PermissionScope.USERS_READ,
      PermissionScope.USERS_WRITE,
      PermissionScope.REGISTRATIONS_READ,
      PermissionScope.REGISTRATIONS_WRITE,
      PermissionScope.ANALYTICS_READ,
      PermissionScope.AUDIT_READ,
      PermissionScope.ADMIN_MANAGE
    ],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  },
  {
    id: '2',
    name: 'moderator',
    displayName: 'Moderator',
    description: 'Can manage registrations and view analytics',
    permissions: [
      PermissionScope.REGISTRATIONS_READ,
      PermissionScope.REGISTRATIONS_WRITE,
      PermissionScope.ANALYTICS_READ
    ],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  },
  {
    id: '3',
    name: 'viewer',
    displayName: 'Viewer',
    description: 'Read-only access',
    permissions: [
      PermissionScope.REGISTRATIONS_READ,
      PermissionScope.ANALYTICS_READ
    ],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  }
];

// Mock registrations
export const mockRegistrations: Partial<Registration>[] = [
  {
    id: '1',
    businessName: 'Green Valley Dispensary',
    ownerName: 'John Smith',
    email: 'john@greenvalley.com',
    phone: '+1-555-0100',
    licenseType: 'dispensary',
    address: '123 Main St',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90001',
    status: 'pending',
    submittedAt: new Date('2025-01-15T08:00:00Z'),
    updatedAt: new Date('2025-01-15T08:00:00Z')
  },
  {
    id: '2',
    businessName: 'Healing Herbs Cultivation',
    ownerName: 'Jane Doe',
    email: 'jane@healingherbs.com',
    phone: '+1-555-0101',
    licenseType: 'cultivation',
    address: '456 Farm Rd',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94101',
    status: 'approved',
    submittedAt: new Date('2025-01-14T10:00:00Z'),
    updatedAt: new Date('2025-01-14T12:00:00Z'),
    reviewedBy: '2',
    reviewedAt: new Date('2025-01-14T12:00:00Z'),
    notes: 'All documentation verified'
  },
  {
    id: '3',
    businessName: 'Pure Extract Processing',
    ownerName: 'Bob Johnson',
    email: 'bob@pureextract.com',
    phone: '+1-555-0102',
    licenseType: 'processing',
    address: '789 Industrial Way',
    city: 'San Diego',
    state: 'CA',
    zipCode: '92101',
    status: 'rejected',
    submittedAt: new Date('2025-01-13T14:00:00Z'),
    updatedAt: new Date('2025-01-13T16:00:00Z'),
    reviewedBy: '1',
    reviewedAt: new Date('2025-01-13T16:00:00Z'),
    notes: 'Missing required documentation'
  }
];

// Mock audit logs
export const mockAuditLogs: Partial<AuditLog>[] = [
  {
    id: '1',
    userId: '1',
    action: 'LOGIN',
    resource: 'auth',
    resourceId: '1',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    metadata: { success: true },
    createdAt: new Date('2025-01-15T10:00:00Z')
  },
  {
    id: '2',
    userId: '2',
    action: 'UPDATE',
    resource: 'registration',
    resourceId: '2',
    ipAddress: '192.168.1.2',
    userAgent: 'Mozilla/5.0',
    metadata: {
      changes: { status: { from: 'pending', to: 'approved' } }
    },
    createdAt: new Date('2025-01-14T12:00:00Z')
  },
  {
    id: '3',
    userId: '1',
    action: 'DELETE',
    resource: 'admin_user',
    resourceId: '5',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    metadata: {
      reason: 'Account inactive for 90 days'
    },
    createdAt: new Date('2025-01-13T15:00:00Z')
  }
];

// Mock JWT tokens
export const mockTokens = {
  validAccessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJlbWFpbCI6ImFkbWluQGJpZ2didXp6LmNvbSIsInJvbGUiOiJzdXBlcl9hZG1pbiIsImlhdCI6MTczNzAwMDAwMCwiZXhwIjoxNzM3MDAzNjAwfQ.mock',
  validRefreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJlbWFpbCI6ImFkbWluQGJpZ2didXp6LmNvbSIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzM3MDAwMDAwLCJleHAiOjE3Mzc2MDQ4MDB9.mock',
  expiredAccessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJlbWFpbCI6ImFkbWluQGJpZ2didXp6LmNvbSIsInJvbGUiOiJzdXBlcl9hZG1pbiIsImlhdCI6MTczNjkwMDAwMCwiZXhwIjoxNzM2OTAzNjAwfQ.mock',
  invalidToken: 'invalid.token.format',
  malformedToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
};

// Mock dashboard stats
export const mockDashboardStats = {
  totalRegistrations: 150,
  pendingReviews: 25,
  todayRegistrations: 8,
  approvalRate: 72.5,
  recentActivity: [
    {
      id: '1',
      type: 'registration' as const,
      message: 'New registration from Green Valley Dispensary',
      timestamp: new Date('2025-01-15T08:00:00Z')
    },
    {
      id: '2',
      type: 'approval' as const,
      message: 'Registration approved for Healing Herbs Cultivation',
      timestamp: new Date('2025-01-14T12:00:00Z')
    },
    {
      id: '3',
      type: 'admin' as const,
      message: 'New admin user created: viewer@biggbuzz.com',
      timestamp: new Date('2025-01-13T09:00:00Z')
    }
  ],
  registrationsByType: {
    dispensary: 75,
    cultivation: 45,
    processing: 20,
    distribution: 10
  },
  registrationsByStatus: {
    pending: 25,
    approved: 109,
    rejected: 16
  }
};

// Mock Socket.io events
export const mockSocketEvents = {
  newRegistration: {
    type: 'new_registration',
    data: mockRegistrations[0]
  },
  registrationUpdate: {
    type: 'registration_update',
    data: {
      id: '2',
      status: 'approved',
      reviewedBy: '2',
      reviewedAt: new Date('2025-01-14T12:00:00Z')
    }
  },
  statsUpdate: {
    type: 'stats_update',
    data: {
      totalRegistrations: 151,
      pendingReviews: 26,
      todayRegistrations: 9
    }
  }
};

// Test utilities
export const createMockAdminUser = (overrides?: Partial<AdminUser>): AdminUser => {
  return {
    id: '1',
    email: 'test@biggbuzz.com',
    name: 'Test Admin',
    role: 'moderator',
    isActive: true,
    lastLogin: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  } as AdminUser;
};

export const createMockRegistration = (overrides?: Partial<Registration>): Registration => {
  return {
    id: '1',
    businessName: 'Test Business',
    ownerName: 'Test Owner',
    email: 'test@business.com',
    phone: '+1-555-0000',
    licenseType: 'dispensary',
    address: '123 Test St',
    city: 'Test City',
    state: 'CA',
    zipCode: '90000',
    status: 'pending',
    submittedAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  } as Registration;
};