// ====================================
// ENHANCED TYPE DEFINITIONS
// ====================================

import type {
  AdminUser,
  AdminRole,
  AdminSession,
  AuditLog,
  Subscriber,
  SecurityEvent
} from "./schema";

// ====================================
// PERMISSION TYPES
// ====================================

export type Permission = "create" | "read" | "update" | "delete" | "export" | "import" | "approve" | "reject";

export type PermissionScope = {
  users: Permission[];
  subscribers: Permission[];
  analytics: Permission[];
  system: Permission[];
  compliance: Permission[];
};

export type AdminRoleType = "super_admin" | "admin" | "viewer";

// ====================================
// SESSION TYPES
// ====================================

export type SessionStatus = "active" | "expired" | "revoked";

export interface SessionData {
  userId: string;
  email: string;
  role: AdminRoleType;
  permissions: PermissionScope;
  sessionId: string;
  ipAddress: string;
  userAgent?: string;
}

export interface TokenPayload {
  sub: string; // user ID
  email: string;
  role: AdminRoleType;
  sessionId: string;
  type: "access" | "refresh";
  iat: number;
  exp: number;
}

// ====================================
// AUDIT TYPES
// ====================================

export type AuditAction = "create" | "read" | "update" | "delete" | "login" | "logout" | "export" | "import" | "approve" | "reject";

export interface AuditContext {
  adminUser: Pick<AdminUser, "id" | "email" | "role">;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  description: string;
  ipAddress: string;
  sessionId?: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  metadata?: Record<string, any>;
}

export interface SecurityEventData {
  eventType: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  adminUserId?: string;
  ipAddress: string;
  details?: Record<string, any>;
}

// ====================================
// SUBSCRIBER TYPES
// ====================================

export type SubscriberStatus = "pending" | "active" | "suspended" | "deleted";

export interface SubscriberFilters {
  status?: SubscriberStatus;
  emailVerified?: boolean;
  mobileVerified?: boolean;
  source?: string;
  campaign?: string;
  country?: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
}

export interface SubscriberStats {
  total: number;
  active: number;
  pending: number;
  verified: number;
  byCountry: Record<string, number>;
  bySource: Record<string, number>;
  recentSignups: number;
}

// ====================================
// ANALYTICS TYPES
// ====================================

export interface AnalyticsMetrics {
  totalSignups: number;
  verifiedSignups: number;
  conversionRate: number; // percentage
  uniqueVisitors: number;
  avgTimeToVerify: number; // seconds
  bounceRate: number; // percentage
}

export interface AnalyticsBreakdown {
  bySource: Record<string, number>;
  byCountry: Record<string, number>;
  byDevice: Record<string, number>;
  byCampaign: Record<string, number>;
}

export interface AnalyticsTimeRange {
  start: Date;
  end: Date;
  granularity: "hour" | "day" | "week" | "month";
}

// ====================================
// SYSTEM STATUS TYPES
// ====================================

export type SystemHealthStatus = "healthy" | "degraded" | "down";
export type AlertLevel = "none" | "warning" | "critical";

export interface SystemHealth {
  serviceName: string;
  status: SystemHealthStatus;
  healthScore: number; // 0-100
  uptime?: number; // seconds
  responseTime?: number; // milliseconds
  errorRate?: number; // percentage
  alertLevel?: AlertLevel;
  lastCheckAt: Date;
}

// ====================================
// API RESPONSE TYPES
// ====================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// ====================================
// REQUEST TYPES
// ====================================

export interface LoginRequest {
  email: string;
  password: string;
  twoFactorCode?: string;
  rememberMe?: boolean;
}

export interface CreateAdminRequest {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: AdminRoleType;
  phoneNumber?: string;
  mustChangePassword?: boolean;
}

export interface UpdateAdminRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: AdminRoleType;
  isActive?: boolean;
  permissions?: string[];
}

// ====================================
// SECURITY TYPES
// ====================================

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonPasswords: boolean;
  preventUserInfoInPassword: boolean;
  maxAge?: number; // days
}

export interface SessionPolicy {
  maxSessionDuration: number; // minutes
  idleTimeout: number; // minutes
  maxConcurrentSessions: number;
  requireMFA: boolean;
  allowRememberMe: boolean;
}

export interface IPRestriction {
  allowedIPs?: string[];
  blockedIPs?: string[];
  requireVPN?: boolean;
  geoRestrictions?: {
    allowedCountries?: string[];
    blockedCountries?: string[];
  };
}

// ====================================
// COMPLIANCE TYPES
// ====================================

export interface ComplianceConfig {
  dataRetentionDays: number;
  auditRetentionDays: number;
  requireConsent: boolean;
  encryptPII: boolean;
  maskSensitiveData: boolean;
  cannabisCompliant: boolean;
  ageVerificationRequired: boolean;
  minAge: number;
}

export interface DataExport {
  userId: string;
  requestedAt: Date;
  completedAt?: Date;
  format: "json" | "csv" | "pdf";
  includeAuditLogs: boolean;
  status: "pending" | "processing" | "completed" | "failed";
}

// ====================================
// HELPER TYPES
// ====================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncResult<T> = Promise<{ success: boolean; data?: T; error?: string }>;

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
  include?: string[];
}

export interface BulkOperationResult {
  total: number;
  succeeded: number;
  failed: number;
  errors?: Array<{ item: any; error: string }>;
}