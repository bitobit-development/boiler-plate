import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
  integer,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
  primaryKey,
  date
} from "drizzle-orm/pg-core";
import { InferSelectModel, InferInsertModel, relations } from "drizzle-orm";

// ====================================
// ENUMS
// ====================================

export const adminRoleEnum = pgEnum("admin_role", [
  "super_admin",
  "admin",
  "viewer",
  "shop_user"
]);

export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "read",
  "update",
  "delete",
  "login",
  "logout",
  "export",
  "import",
  "approve",
  "reject"
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "active",
  "expired",
  "revoked"
]);

export const subscriberStatusEnum = pgEnum("subscriber_status", [
  "pending",
  "active",
  "suspended",
  "deleted"
]);

// ====================================
// 1. ADMIN USERS & ROLES
// ====================================

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),

  // Profile
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }),

  // Role & Permissions
  role: adminRoleEnum("role").notNull().default("viewer"),
  permissions: jsonb("permissions").$type<string[]>().default([]),

  // Security
  isActive: boolean("is_active").notNull().default(true),
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  lastPasswordChange: timestamp("last_password_change"),

  // 2FA
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"),
  backupCodes: jsonb("backup_codes").$type<string[]>(),

  // Tracking
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIp: varchar("last_login_ip", { length: 45 }),
  loginAttempts: integer("login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until"),

  // Compliance
  termsAcceptedAt: timestamp("terms_accepted_at"),
  privacyAcceptedAt: timestamp("privacy_accepted_at"),

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by")
}, (table) => ({
  emailIdx: index("admin_users_email_idx").on(table.email),
  roleIdx: index("admin_users_role_idx").on(table.role),
  activeIdx: index("admin_users_active_idx").on(table.isActive),
  lastLoginIdx: index("admin_users_last_login_idx").on(table.lastLoginAt)
}));

export const adminRoles = pgTable("admin_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description"),
  permissions: jsonb("permissions").notNull().$type<{
    users: string[];
    subscribers: string[];
    analytics: string[];
    system: string[];
    compliance: string[];
  }>(),
  isSystem: boolean("is_system").notNull().default(false),
  priority: integer("priority").notNull().default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  nameIdx: uniqueIndex("admin_roles_name_idx").on(table.name),
  priorityIdx: index("admin_roles_priority_idx").on(table.priority)
}));

// ====================================
// 2. SESSION MANAGEMENT
// ====================================

export const adminSessions = pgTable("admin_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminUserId: uuid("admin_user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),

  // Token Management
  accessToken: text("access_token").notNull().unique(),
  refreshToken: text("refresh_token").unique(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(), // SHA-256 hash

  // Session Details
  status: sessionStatusEnum("status").notNull().default("active"),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  ipLocation: jsonb("ip_location").$type<{
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  }>(),

  // Device Info
  deviceId: varchar("device_id", { length: 100 }),
  deviceType: varchar("device_type", { length: 50 }),
  browserName: varchar("browser_name", { length: 50 }),
  osName: varchar("os_name", { length: 50 }),

  // Timing
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
  revokedBy: uuid("revoked_by"),
  revokedReason: text("revoked_reason")
}, (table) => ({
  adminUserIdx: index("admin_sessions_user_idx").on(table.adminUserId),
  tokenHashIdx: uniqueIndex("admin_sessions_token_hash_idx").on(table.tokenHash),
  statusIdx: index("admin_sessions_status_idx").on(table.status),
  expiresAtIdx: index("admin_sessions_expires_idx").on(table.expiresAt),
  ipAddressIdx: index("admin_sessions_ip_idx").on(table.ipAddress)
}));

// ====================================
// 3. AUDIT LOGGING SYSTEM
// ====================================

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Actor
  adminUserId: uuid("admin_user_id").references(() => adminUsers.id, { onDelete: "set null" }),
  adminEmail: varchar("admin_email", { length: 255 }).notNull(), // Denormalized for immutability
  adminRole: varchar("admin_role", { length: 50 }).notNull(), // Denormalized for immutability

  // Action
  action: auditActionEnum("action").notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id"),
  entityName: varchar("entity_name", { length: 255 }),

  // Details
  description: text("description").notNull(),
  changes: jsonb("changes").$type<{
    before?: Record<string, any>;
    after?: Record<string, any>;
    diff?: Array<{field: string; old: any; new: any}>;
  }>(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),

  // Request Context
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  userAgent: text("user_agent"),
  sessionId: uuid("session_id"),
  requestId: varchar("request_id", { length: 100 }),

  // Security & Compliance
  riskLevel: integer("risk_level").notNull().default(0), // 0-10 scale
  isCompliance: boolean("is_compliance").notNull().default(false),
  isSecurity: boolean("is_security").notNull().default(false),
  isSuccess: boolean("is_success").notNull().default(true),
  errorMessage: text("error_message"),

  // Immutable timestamp
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  adminUserIdx: index("audit_logs_admin_user_idx").on(table.adminUserId),
  actionIdx: index("audit_logs_action_idx").on(table.action),
  entityIdx: index("audit_logs_entity_idx").on(table.entityType, table.entityId),
  createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  complianceIdx: index("audit_logs_compliance_idx").on(table.isCompliance),
  securityIdx: index("audit_logs_security_idx").on(table.isSecurity),
  riskLevelIdx: index("audit_logs_risk_level_idx").on(table.riskLevel)
}));

export const securityEvents = pgTable("security_events", {
  id: uuid("id").primaryKey().defaultRandom(),

  eventType: varchar("event_type", { length: 100 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(), // critical, high, medium, low

  // Actor
  adminUserId: uuid("admin_user_id").references(() => adminUsers.id, { onDelete: "set null" }),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),

  // Event Details
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  details: jsonb("details").$type<Record<string, any>>(),

  // Response
  actionTaken: text("action_taken"),
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: uuid("resolved_by"),

  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  eventTypeIdx: index("security_events_type_idx").on(table.eventType),
  severityIdx: index("security_events_severity_idx").on(table.severity),
  createdAtIdx: index("security_events_created_at_idx").on(table.createdAt),
  resolvedIdx: index("security_events_resolved_idx").on(table.resolved)
}));

// ====================================
// 4. REGISTRATION ANALYTICS (Enhanced Subscribers)
// ====================================

export const subscribers = pgTable("subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Personal Info
  name: varchar("name", { length: 255 }).notNull(),
  surname: varchar("surname", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  mobile: varchar("mobile", { length: 20 }).notNull().unique(),

  // Verification
  ageVerified: boolean("age_verified").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  mobileVerified: boolean("mobile_verified").notNull().default(false),

  // Status
  status: subscriberStatusEnum("status").notNull().default("pending"),

  // Source & Campaign
  source: varchar("source", { length: 100 }),
  campaign: varchar("campaign", { length: 100 }),
  referrer: text("referrer"),
  utmSource: varchar("utm_source", { length: 100 }),
  utmMedium: varchar("utm_medium", { length: 100 }),
  utmCampaign: varchar("utm_campaign", { length: 100 }),

  // Location
  registrationIp: varchar("registration_ip", { length: 45 }),
  country: varchar("country", { length: 2 }),
  region: varchar("region", { length: 100 }),
  city: varchar("city", { length: 100 }),

  // Engagement
  lastActivityAt: timestamp("last_activity_at"),
  engagementScore: integer("engagement_score").notNull().default(0),

  // Compliance
  consentMarketing: boolean("consent_marketing").notNull().default(false),
  consentDataProcessing: boolean("consent_data_processing").notNull().default(true),
  consentTerms: boolean("consent_terms").notNull().default(true),

  // OTP Fields for Mobile Verification
  otpCode: varchar("otp_code", { length: 255 }), // Encrypted 6-digit OTP code
  otpExpiresAt: timestamp("otp_expires_at"), // OTP expiration time
  otpAttempts: integer("otp_attempts").notNull().default(0), // Failed verification attempts counter
  otpLastSentAt: timestamp("otp_last_sent_at"), // Last OTP send timestamp

  // Admin Management
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>().default([]),
  customFields: jsonb("custom_fields").$type<Record<string, any>>(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
  deletedAt: timestamp("deleted_at")
}, (table) => ({
  emailIdx: uniqueIndex("subscribers_email_idx").on(table.email),
  mobileIdx: uniqueIndex("subscribers_mobile_idx").on(table.mobile),
  statusIdx: index("subscribers_status_idx").on(table.status),
  createdAtIdx: index("subscribers_created_at_idx").on(table.createdAt),
  sourceIdx: index("subscribers_source_idx").on(table.source),
  countryIdx: index("subscribers_country_idx").on(table.country),
  // OTP-related indexes
  otpExpiresAtIdx: index("subscribers_otp_expires_at_idx").on(table.otpExpiresAt),
  otpLastSentAtIdx: index("subscribers_otp_last_sent_at_idx").on(table.otpLastSentAt)
}));

export const subscriberAnalytics = pgTable("subscriber_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Time-based aggregations
  date: date("date").notNull(),
  hour: integer("hour"), // 0-23 for hourly aggregations

  // Metrics
  totalSignups: integer("total_signups").notNull().default(0),
  verifiedSignups: integer("verified_signups").notNull().default(0),
  uniqueVisitors: integer("unique_visitors").notNull().default(0),
  conversionRate: integer("conversion_rate").notNull().default(0), // Stored as basis points (100 = 1%)

  // Breakdown
  bySource: jsonb("by_source").$type<Record<string, number>>().default({}),
  byCountry: jsonb("by_country").$type<Record<string, number>>().default({}),
  byDevice: jsonb("by_device").$type<Record<string, number>>().default({}),
  byCampaign: jsonb("by_campaign").$type<Record<string, number>>().default({}),

  // Performance
  avgTimeToVerify: integer("avg_time_to_verify"), // seconds
  bounceRate: integer("bounce_rate"), // basis points

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  dateIdx: index("subscriber_analytics_date_idx").on(table.date),
  dateHourIdx: index("subscriber_analytics_date_hour_idx").on(table.date, table.hour)
}));

// ====================================
// 5. STATUS & HISTORY TRACKING
// ====================================

export const adminActionHistory = pgTable("admin_action_history", {
  id: uuid("id").primaryKey().defaultRandom(),

  adminUserId: uuid("admin_user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),

  // Action Details
  actionType: varchar("action_type", { length: 100 }).notNull(),
  actionCategory: varchar("action_category", { length: 50 }).notNull(),
  actionDescription: text("action_description").notNull(),

  // Target
  targetType: varchar("target_type", { length: 50 }),
  targetId: uuid("target_id"),
  targetName: varchar("target_name", { length: 255 }),

  // Result
  isSuccess: boolean("is_success").notNull().default(true),
  errorMessage: text("error_message"),
  duration: integer("duration"), // milliseconds

  // Context
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  sessionId: uuid("session_id"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),

  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  adminUserIdx: index("admin_action_history_user_idx").on(table.adminUserId),
  actionTypeIdx: index("admin_action_history_type_idx").on(table.actionType),
  createdAtIdx: index("admin_action_history_created_at_idx").on(table.createdAt),
  targetIdx: index("admin_action_history_target_idx").on(table.targetType, table.targetId)
}));

export const systemStatus = pgTable("system_status", {
  id: uuid("id").primaryKey().defaultRandom(),

  serviceName: varchar("service_name", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // healthy, degraded, down

  // Metrics
  uptime: integer("uptime"), // seconds
  responseTime: integer("response_time"), // milliseconds
  errorRate: integer("error_rate"), // basis points
  throughput: integer("throughput"), // requests per second

  // Health Details
  healthScore: integer("health_score").notNull().default(100), // 0-100
  lastCheckAt: timestamp("last_check_at").notNull(),
  lastErrorAt: timestamp("last_error_at"),
  lastErrorMessage: text("last_error_message"),

  // Alerts
  alertLevel: varchar("alert_level", { length: 20 }), // none, warning, critical
  alertMessage: text("alert_message"),

  metadata: jsonb("metadata").$type<Record<string, any>>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  serviceNameIdx: index("system_status_service_idx").on(table.serviceName),
  statusIdx: index("system_status_status_idx").on(table.status),
  alertLevelIdx: index("system_status_alert_idx").on(table.alertLevel)
}));

export const dataChangeHistory = pgTable("data_change_history", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Change Info
  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: uuid("record_id").notNull(),
  operation: varchar("operation", { length: 20 }).notNull(), // insert, update, delete

  // Actor
  changedBy: uuid("changed_by").references(() => adminUsers.id, { onDelete: "set null" }),
  changedByEmail: varchar("changed_by_email", { length: 255 }),

  // Data
  oldValues: jsonb("old_values").$type<Record<string, any>>(),
  newValues: jsonb("new_values").$type<Record<string, any>>(),
  changedFields: jsonb("changed_fields").$type<string[]>(),

  // Context
  changeReason: text("change_reason"),
  changeContext: varchar("change_context", { length: 100 }), // admin_panel, api, system
  sessionId: uuid("session_id"),
  requestId: varchar("request_id", { length: 100 }),

  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  tableRecordIdx: index("data_change_table_record_idx").on(table.tableName, table.recordId),
  changedByIdx: index("data_change_changed_by_idx").on(table.changedBy),
  createdAtIdx: index("data_change_created_at_idx").on(table.createdAt),
  operationIdx: index("data_change_operation_idx").on(table.operation)
}));

// ====================================
// RELATIONS
// ====================================

export const adminUsersRelations = relations(adminUsers, ({ many, one }) => ({
  sessions: many(adminSessions),
  auditLogs: many(auditLogs),
  actionHistory: many(adminActionHistory),
  createdByUser: one(adminUsers, {
    fields: [adminUsers.createdBy],
    references: [adminUsers.id]
  }),
  updatedByUser: one(adminUsers, {
    fields: [adminUsers.updatedBy],
    references: [adminUsers.id]
  })
}));

export const adminSessionsRelations = relations(adminSessions, ({ one }) => ({
  adminUser: one(adminUsers, {
    fields: [adminSessions.adminUserId],
    references: [adminUsers.id]
  })
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  adminUser: one(adminUsers, {
    fields: [auditLogs.adminUserId],
    references: [adminUsers.id]
  })
}));

export const adminActionHistoryRelations = relations(adminActionHistory, ({ one }) => ({
  adminUser: one(adminUsers, {
    fields: [adminActionHistory.adminUserId],
    references: [adminUsers.id]
  })
}));

// ====================================
// TYPE EXPORTS
// ====================================

// Admin Users
export type AdminUser = InferSelectModel<typeof adminUsers>;
export type NewAdminUser = InferInsertModel<typeof adminUsers>;
export type AdminRole = InferSelectModel<typeof adminRoles>;
export type NewAdminRole = InferInsertModel<typeof adminRoles>;

// Sessions
export type AdminSession = InferSelectModel<typeof adminSessions>;
export type NewAdminSession = InferInsertModel<typeof adminSessions>;

// Audit
export type AuditLog = InferSelectModel<typeof auditLogs>;
export type NewAuditLog = InferInsertModel<typeof auditLogs>;
export type SecurityEvent = InferSelectModel<typeof securityEvents>;
export type NewSecurityEvent = InferInsertModel<typeof securityEvents>;

// Subscribers
export type Subscriber = InferSelectModel<typeof subscribers>;
export type NewSubscriber = InferInsertModel<typeof subscribers>;
export type SubscriberAnalytic = InferSelectModel<typeof subscriberAnalytics>;
export type NewSubscriberAnalytic = InferInsertModel<typeof subscriberAnalytics>;

// History & Status
export type AdminActionHistory = InferSelectModel<typeof adminActionHistory>;
export type NewAdminActionHistory = InferInsertModel<typeof adminActionHistory>;
export type SystemStatus = InferSelectModel<typeof systemStatus>;
export type NewSystemStatus = InferInsertModel<typeof systemStatus>;
export type DataChangeHistory = InferSelectModel<typeof dataChangeHistory>;
export type NewDataChangeHistory = InferInsertModel<typeof dataChangeHistory>;

// ====================================
// RE-EXPORT PRODUCT SCHEMAS
// ====================================
export * from "./schema/products";

// ====================================
// RE-EXPORT ORDER SCHEMAS
// ====================================
export * from "./schema/orders";