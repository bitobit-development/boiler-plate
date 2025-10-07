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
} from "drizzle-orm/pg-core";
import { InferSelectModel, InferInsertModel, relations } from "drizzle-orm";
import { adminUsers, subscribers } from "../schema";

// ====================================
// ENUMS
// ====================================

export const orderTypeEnum = pgEnum("order_type", [
  "pos",
  "online",
  "phone"
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "card",
  "eft",
  "voucher"
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "refunded",
  "cancelled"
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",    // Added for online orders awaiting POS confirmation
  "draft",
  "confirmed",
  "fulfilled",
  "cancelled"
]);

export const otpOverrideReasonEnum = pgEnum("otp_override_reason", [
  "sms_delivery_failure",
  "network_issues",
  "customer_phone_issues",
  "international_number",
  "elderly_assistance",
  "disability_accommodation",
  "technical_error",
  "manager_approval"
]);

// ====================================
// ORDERS TABLE
// ====================================

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Order Identification
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(), // e.g., "POS-20250104-001"
  orderType: orderTypeEnum("order_type").notNull().default("pos"),

  // Customer Reference
  subscriberId: uuid("subscriber_id").references(() => subscribers.id, { onDelete: "restrict" }),
  customerName: varchar("customer_name", { length: 255 }), // Denormalized for quick access
  customerMobile: varchar("customer_mobile", { length: 20 }), // Denormalized for display

  // Shop/Teller Reference
  shopUserId: uuid("shop_user_id").notNull().references(() => adminUsers.id, { onDelete: "restrict" }),
  shopUserName: varchar("shop_user_name", { length: 255 }).notNull(), // Denormalized for immutability
  kioskId: varchar("kiosk_id", { length: 100 }), // Terminal/Kiosk identifier

  // Order Details (JSONB for flexibility and performance)
  items: jsonb("items").notNull().$type<Array<{
    productId: string;
    productName: string;
    productSku?: string;
    quantity: number;
    price: number; // Unit price in cents
    subtotal: number; // Quantity * price in cents
    discount?: number; // Item-level discount in cents
    metadata?: Record<string, any>; // Additional product info (strain, weight, etc.)
  }>>().default([]),

  // Financial Summary (all amounts in cents for precision)
  subtotal: integer("subtotal").notNull().default(0), // Sum of all item subtotals
  tax: integer("tax").notNull().default(0), // Tax amount
  discount: integer("discount").notNull().default(0), // Total discount amount
  total: integer("total").notNull().default(0), // Final amount (subtotal + tax - discount)

  // Payment Information
  paymentMethod: paymentMethodEnum("payment_method"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  paymentReference: varchar("payment_reference", { length: 100 }), // External payment ID

  // Order Status
  status: orderStatusEnum("status").notNull().default("draft"),
  notes: text("notes"), // Internal notes
  customerNotes: text("customer_notes"), // Customer-provided notes

  // OTP Override Tracking
  wasOtpOverridden: boolean("was_otp_overridden").notNull().default(false),
  overrideReason: varchar("override_reason", { length: 100 }), // Quick reference to enum value
  overrideExplanation: text("override_explanation"), // Detailed explanation

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"), // When order was fulfilled
  cancelledAt: timestamp("cancelled_at"), // When order was cancelled
  expiresAt: timestamp("expires_at"), // When pending order expires (online orders only)

  // Additional metadata
  metadata: jsonb("metadata").$type<Record<string, any>>(), // Flexible field for future extensions
}, (table) => ({
  // Performance indexes
  orderNumberIdx: uniqueIndex("orders_order_number_idx").on(table.orderNumber),
  subscriberIdx: index("orders_subscriber_idx").on(table.subscriberId),
  shopUserIdx: index("orders_shop_user_idx").on(table.shopUserId),
  kioskIdx: index("orders_kiosk_idx").on(table.kioskId),
  statusIdx: index("orders_status_idx").on(table.status),
  paymentStatusIdx: index("orders_payment_status_idx").on(table.paymentStatus),
  createdAtIdx: index("orders_created_at_idx").on(table.createdAt),
  completedAtIdx: index("orders_completed_at_idx").on(table.completedAt),
  // Composite indexes for common queries
  shopUserStatusIdx: index("orders_shop_user_status_idx").on(table.shopUserId, table.status),
  kioskCreatedIdx: index("orders_kiosk_created_idx").on(table.kioskId, table.createdAt),
  subscriberCreatedIdx: index("orders_subscriber_created_idx").on(table.subscriberId, table.createdAt),
  // Expiration indexes for pending orders
  expiresAtIdx: index("orders_expires_at_idx").on(table.expiresAt),
  statusExpiresIdx: index("orders_status_expires_idx").on(table.status, table.expiresAt),
  subscriberStatusIdx: index("orders_subscriber_status_idx").on(table.subscriberId, table.status),
}));

// ====================================
// OTP OVERRIDE LOGS TABLE
// ====================================

export const otpOverrideLogs = pgTable("otp_override_logs", {
  id: uuid("id").primaryKey().defaultRandom(),

  // References
  subscriberId: uuid("subscriber_id").notNull().references(() => subscribers.id, { onDelete: "cascade" }),
  shopUserId: uuid("shop_user_id").references(() => adminUsers.id, { onDelete: "restrict" }), // Nullable - teller name in explanation if null
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }),

  // Override Details
  reason: otpOverrideReasonEnum("reason").notNull(),
  explanation: text("explanation").notNull(), // Detailed explanation required for audit
  wasSuccessful: boolean("was_successful").notNull().default(true),

  // Context Information
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  kioskId: varchar("kiosk_id", { length: 100 }),
  userAgent: text("user_agent"),

  // Additional Audit Fields
  deviceFingerprint: varchar("device_fingerprint", { length: 255 }), // For tracking device patterns
  sessionId: uuid("session_id"), // Link to admin session if available

  // Risk Assessment
  riskScore: integer("risk_score").default(0), // 0-100 scale for monitoring suspicious patterns
  flaggedForReview: boolean("flagged_for_review").notNull().default(false),
  reviewedBy: uuid("reviewed_by").references(() => adminUsers.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),

  // Immutable timestamp
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Performance indexes
  subscriberIdx: index("otp_override_logs_subscriber_idx").on(table.subscriberId),
  shopUserIdx: index("otp_override_logs_shop_user_idx").on(table.shopUserId),
  orderIdx: index("otp_override_logs_order_idx").on(table.orderId),
  reasonIdx: index("otp_override_logs_reason_idx").on(table.reason),
  createdAtIdx: index("otp_override_logs_created_at_idx").on(table.createdAt),
  flaggedIdx: index("otp_override_logs_flagged_idx").on(table.flaggedForReview),
  // Composite indexes for analytics
  shopUserReasonIdx: index("otp_override_logs_shop_user_reason_idx").on(table.shopUserId, table.reason),
  subscriberCreatedIdx: index("otp_override_logs_subscriber_created_idx").on(table.subscriberId, table.createdAt),
}));

// ====================================
// KIOSK SESSIONS TABLE
// ====================================

export const kioskSessions = pgTable("kiosk_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Session Identification
  shopUserId: uuid("shop_user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  kioskId: varchar("kiosk_id", { length: 100 }).notNull(),

  // Session Lifecycle
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  isActive: boolean("is_active").notNull().default(true),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),

  // Device Information
  deviceFingerprint: varchar("device_fingerprint", { length: 255 }), // Unique device identifier
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  userAgent: text("user_agent"),
  browserName: varchar("browser_name", { length: 50 }),
  osName: varchar("os_name", { length: 50 }),
  deviceType: varchar("device_type", { length: 50 }), // desktop, tablet, mobile

  // Session Metrics (Denormalized for performance)
  ordersProcessed: integer("orders_processed").notNull().default(0),
  totalSales: integer("total_sales").notNull().default(0), // Total sales in cents
  averageOrderValue: integer("average_order_value").default(0), // In cents
  otpOverridesCount: integer("otp_overrides_count").notNull().default(0),

  // Security & Monitoring
  suspiciousActivity: boolean("suspicious_activity").notNull().default(false),
  suspiciousActivityNotes: text("suspicious_activity_notes"),
  terminatedBy: uuid("terminated_by").references(() => adminUsers.id, { onDelete: "set null" }),
  terminationReason: text("termination_reason"),

  // Location Context
  locationName: varchar("location_name", { length: 255 }), // Store/branch name
  locationCode: varchar("location_code", { length: 50 }), // Store/branch code

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Performance indexes
  shopUserIdx: index("kiosk_sessions_shop_user_idx").on(table.shopUserId),
  kioskIdx: index("kiosk_sessions_kiosk_idx").on(table.kioskId),
  activeIdx: index("kiosk_sessions_active_idx").on(table.isActive),
  startedAtIdx: index("kiosk_sessions_started_at_idx").on(table.startedAt),
  lastActivityIdx: index("kiosk_sessions_last_activity_idx").on(table.lastActivityAt),
  // Composite indexes for common queries
  activeKioskIdx: index("kiosk_sessions_active_kiosk_idx").on(table.kioskId, table.isActive),
  shopUserActiveIdx: index("kiosk_sessions_shop_user_active_idx").on(table.shopUserId, table.isActive),
  kioskStartedIdx: index("kiosk_sessions_kiosk_started_idx").on(table.kioskId, table.startedAt),
}));

// ====================================
// RELATIONS
// ====================================

export const ordersRelations = relations(orders, ({ one, many }) => ({
  subscriber: one(subscribers, {
    fields: [orders.subscriberId],
    references: [subscribers.id],
  }),
  shopUser: one(adminUsers, {
    fields: [orders.shopUserId],
    references: [adminUsers.id],
  }),
  otpOverrideLogs: many(otpOverrideLogs),
}));

export const otpOverrideLogsRelations = relations(otpOverrideLogs, ({ one }) => ({
  subscriber: one(subscribers, {
    fields: [otpOverrideLogs.subscriberId],
    references: [subscribers.id],
  }),
  shopUser: one(adminUsers, {
    fields: [otpOverrideLogs.shopUserId],
    references: [adminUsers.id],
  }),
  order: one(orders, {
    fields: [otpOverrideLogs.orderId],
    references: [orders.id],
  }),
  reviewedByUser: one(adminUsers, {
    fields: [otpOverrideLogs.reviewedBy],
    references: [adminUsers.id],
  }),
}));

export const kioskSessionsRelations = relations(kioskSessions, ({ one }) => ({
  shopUser: one(adminUsers, {
    fields: [kioskSessions.shopUserId],
    references: [adminUsers.id],
  }),
  terminatedByUser: one(adminUsers, {
    fields: [kioskSessions.terminatedBy],
    references: [adminUsers.id],
  }),
}));

// ====================================
// TYPE EXPORTS
// ====================================

// Orders
export type Order = InferSelectModel<typeof orders>;
export type NewOrder = InferInsertModel<typeof orders>;

// OTP Override Logs
export type OtpOverrideLog = InferSelectModel<typeof otpOverrideLogs>;
export type NewOtpOverrideLog = InferInsertModel<typeof otpOverrideLogs>;

// Kiosk Sessions
export type KioskSession = InferSelectModel<typeof kioskSessions>;
export type NewKioskSession = InferInsertModel<typeof kioskSessions>;

// Enum Types
export type OrderType = typeof orderTypeEnum.enumValues[number];
export type PaymentMethod = typeof paymentMethodEnum.enumValues[number];
export type PaymentStatus = typeof paymentStatusEnum.enumValues[number];
export type OrderStatus = typeof orderStatusEnum.enumValues[number];
export type OtpOverrideReason = typeof otpOverrideReasonEnum.enumValues[number];

// Item Type for Orders
export interface OrderItem {
  productId: string;
  productName: string;
  productSku?: string;
  quantity: number;
  price: number;
  subtotal: number;
  discount?: number;
  metadata?: Record<string, any>;
}