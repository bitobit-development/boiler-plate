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
  decimal,
} from "drizzle-orm/pg-core";
import { InferSelectModel, InferInsertModel, relations } from "drizzle-orm";
import { adminUsers } from "../schema";

// ====================================
// ENUMS
// ====================================

export const productTypeEnum = pgEnum("product_type", [
  "pre_roll",
  "dab",
  "edible",
  "vape",
  "flower",
  "concentrate",
  "accessory",
]);

export const productStatusEnum = pgEnum("product_status", [
  "draft",
  "active",
  "archived",
  "out_of_stock",
]);

export const membershipTierEnum = pgEnum("membership_tier", [
  "basic",
  "premium",
  "vip",
  "founding",
]);

// ====================================
// PRODUCT CATEGORIES
// ====================================

export const productCategories = pgTable("product_categories", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Category Information
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),

  // Hierarchy Support
  parentId: uuid("parent_id").references((): any => productCategories.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  depth: integer("depth").notNull().default(0), // 0 for root, 1 for child, etc.

  // Display
  imageUrl: text("image_url"),
  iconName: varchar("icon_name", { length: 50 }), // Lucide icon name
  color: varchar("color", { length: 7 }), // Hex color for UI accents

  // Status
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),

  // SEO
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),

  // Analytics
  productCount: integer("product_count").notNull().default(0), // Denormalized for performance
  viewCount: integer("view_count").notNull().default(0),

  // Metadata
  customFields: jsonb("custom_fields").$type<Record<string, any>>(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
  updatedBy: uuid("updated_by").references(() => adminUsers.id, { onDelete: "set null" }),
}, (table) => ({
  slugIdx: uniqueIndex("product_categories_slug_idx").on(table.slug),
  parentIdx: index("product_categories_parent_idx").on(table.parentId),
  sortOrderIdx: index("product_categories_sort_order_idx").on(table.sortOrder),
  activeIdx: index("product_categories_active_idx").on(table.isActive),
  featuredIdx: index("product_categories_featured_idx").on(table.isFeatured),
}));

// ====================================
// PRODUCTS
// ====================================

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Product Information
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  shortDescription: varchar("short_description", { length: 500 }),

  // Category & Classification
  categoryId: uuid("category_id").notNull().references(() => productCategories.id, { onDelete: "restrict" }),
  sku: varchar("sku", { length: 100 }).unique(),
  barcode: varchar("barcode", { length: 100 }),
  productType: productTypeEnum("product_type").notNull(),

  // Pricing (stored in cents for precision - R250.00 = 25000)
  price: integer("price").notNull(), // Current selling price
  comparePrice: integer("compare_price"), // Original price (for showing discounts)
  costPrice: integer("cost_price"), // Internal cost for profit tracking

  // Variant Information (for products like "Indoor x1", "Indoor x2", etc.)
  variantOf: uuid("variant_of"), // Parent product ID for variants
  variantLabel: varchar("variant_label", { length: 100 }), // e.g., "x1", "x2", "x3"
  sortVariantOrder: integer("sort_variant_order").default(0),

  // Inventory Management
  quantity: integer("quantity").notNull().default(0),
  reservedQuantity: integer("reserved_quantity").notNull().default(0), // For pending orders
  trackQuantity: boolean("track_quantity").notNull().default(true),
  allowBackorder: boolean("allow_backorder").notNull().default(false),
  lowStockThreshold: integer("low_stock_threshold").default(5),

  // Status & Visibility
  status: productStatusEnum("status").notNull().default("draft"),
  isVisible: boolean("is_visible").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  isNew: boolean("is_new").notNull().default(false),

  // Cannabis-Specific Attributes
  weight: varchar("weight", { length: 50 }), // e.g., "1g", "2g", "2 joints"
  potency: varchar("potency", { length: 50 }), // e.g., "THC 20%", "40mg THC"
  strain: varchar("strain", { length: 100 }), // e.g., "Sativa", "Indica", "Hybrid"
  thcContent: decimal("thc_content", { precision: 5, scale: 2 }), // e.g., 20.50 for 20.5%
  cbdContent: decimal("cbd_content", { precision: 5, scale: 2 }), // e.g., 0.50 for 0.5%
  terpenes: jsonb("terpenes").$type<string[]>(), // List of terpenes
  effects: jsonb("effects").$type<string[]>(), // Expected effects
  flavorProfile: jsonb("flavor_profile").$type<string[]>(), // Flavor notes

  // Media
  imageUrl: text("image_url"), // Primary image
  images: jsonb("images").$type<Array<{
    url: string;
    alt?: string;
    order?: number;
  }>>().default([]),

  // SEO & Marketing
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  keywords: jsonb("keywords").$type<string[]>().default([]),

  // Membership Requirements
  requiresMembership: boolean("requires_membership").notNull().default(true),
  membershipTiers: jsonb("membership_tiers").$type<string[]>().default(["basic"]), // Which tiers can access

  // Supplier Information
  supplier: varchar("supplier", { length: 255 }),
  supplierSku: varchar("supplier_sku", { length: 100 }),

  // Analytics & Metrics
  viewCount: integer("view_count").notNull().default(0),
  purchaseCount: integer("purchase_count").notNull().default(0),
  rating: decimal("rating", { precision: 3, scale: 2 }), // e.g., 4.50
  reviewCount: integer("review_count").notNull().default(0),

  // Tags & Custom Data
  tags: jsonb("tags").$type<string[]>().default([]),
  customFields: jsonb("custom_fields").$type<Record<string, any>>(),

  // Compliance & Regulatory
  ageRestricted: boolean("age_restricted").notNull().default(true),
  complianceNotes: text("compliance_notes"),
  labTestResults: jsonb("lab_test_results").$type<{
    testDate?: string;
    labName?: string;
    certificateUrl?: string;
    results?: Record<string, any>;
  }>(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  publishedAt: timestamp("published_at"),
  archivedAt: timestamp("archived_at"),

  // Audit Trail
  createdBy: uuid("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
  updatedBy: uuid("updated_by").references(() => adminUsers.id, { onDelete: "set null" }),
}, (table) => ({
  // Performance Indexes
  slugIdx: uniqueIndex("products_slug_idx").on(table.slug),
  skuIdx: uniqueIndex("products_sku_idx").on(table.sku),
  categoryIdx: index("products_category_idx").on(table.categoryId),
  statusIdx: index("products_status_idx").on(table.status),
  visibleIdx: index("products_visible_idx").on(table.isVisible, table.status),
  featuredIdx: index("products_featured_idx").on(table.isFeatured),
  priceIdx: index("products_price_idx").on(table.price),
  quantityIdx: index("products_quantity_idx").on(table.quantity),
  productTypeIdx: index("products_type_idx").on(table.productType),
  variantOfIdx: index("products_variant_of_idx").on(table.variantOf),
  createdAtIdx: index("products_created_at_idx").on(table.createdAt),
  publishedAtIdx: index("products_published_at_idx").on(table.publishedAt),

  // Composite indexes for common queries
  activeProductsIdx: index("products_active_idx").on(table.status, table.isVisible, table.publishedAt),
  categoryActiveIdx: index("products_category_active_idx").on(table.categoryId, table.status, table.isVisible),
}));

// ====================================
// PRICE HISTORY (AUDIT TRAIL)
// ====================================

export const priceHistory = pgTable("price_history", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Product Reference
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  productName: varchar("product_name", { length: 255 }).notNull(), // Denormalized for immutability
  productSku: varchar("product_sku", { length: 100 }), // Denormalized for immutability

  // Price Change Details
  oldPrice: integer("old_price").notNull(),
  newPrice: integer("new_price").notNull(),
  priceDifference: integer("price_difference").notNull(), // newPrice - oldPrice
  percentageChange: decimal("percentage_change", { precision: 5, scale: 2 }), // e.g., 10.50 for 10.5%

  // Cost Price Tracking
  oldCostPrice: integer("old_cost_price"),
  newCostPrice: integer("new_cost_price"),

  // Context
  reason: text("reason"),
  changeType: varchar("change_type", { length: 50 }), // manual, bulk_update, promotion, cost_adjustment
  promotionId: uuid("promotion_id"), // If price change is due to promotion

  // Batch Updates
  batchId: uuid("batch_id"), // For grouping bulk price updates
  batchNote: text("batch_note"),

  // Approval Workflow (if needed)
  requiresApproval: boolean("requires_approval").notNull().default(false),
  approvedBy: uuid("approved_by").references(() => adminUsers.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  approvalNote: text("approval_note"),

  // Audit Fields
  changedBy: uuid("changed_by").notNull().references(() => adminUsers.id, { onDelete: "set null" }),
  changedByName: varchar("changed_by_name", { length: 255 }).notNull(), // Denormalized
  changedByRole: varchar("changed_by_role", { length: 50 }), // Denormalized

  // Request Context
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  sessionId: uuid("session_id"),

  // Effectiveness
  effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
  effectiveUntil: timestamp("effective_until"),

  // Metadata
  metadata: jsonb("metadata").$type<Record<string, any>>(),

  // Immutable timestamp
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  productIdx: index("price_history_product_idx").on(table.productId),
  changedByIdx: index("price_history_changed_by_idx").on(table.changedBy),
  createdAtIdx: index("price_history_created_at_idx").on(table.createdAt),
  batchIdx: index("price_history_batch_idx").on(table.batchId),
  changeTypeIdx: index("price_history_change_type_idx").on(table.changeType),
  effectiveFromIdx: index("price_history_effective_from_idx").on(table.effectiveFrom),
}));

// ====================================
// INVENTORY MOVEMENTS (OPTIONAL - FOR TRACKING)
// ====================================

export const inventoryMovements = pgTable("inventory_movements", {
  id: uuid("id").primaryKey().defaultRandom(),

  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),

  // Movement Details
  movementType: varchar("movement_type", { length: 50 }).notNull(), // addition, removal, adjustment, reservation, release
  quantity: integer("quantity").notNull(), // Positive for additions, negative for removals
  previousQuantity: integer("previous_quantity").notNull(),
  newQuantity: integer("new_quantity").notNull(),

  // Context
  reason: text("reason"),
  referenceType: varchar("reference_type", { length: 50 }), // order, return, adjustment, damaged
  referenceId: uuid("reference_id"), // Order ID, Return ID, etc.

  // Batch/Lot Tracking
  batchNumber: varchar("batch_number", { length: 100 }),
  expiryDate: timestamp("expiry_date"),

  // Audit
  performedBy: uuid("performed_by").references(() => adminUsers.id, { onDelete: "set null" }),
  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  productIdx: index("inventory_movements_product_idx").on(table.productId),
  movementTypeIdx: index("inventory_movements_type_idx").on(table.movementType),
  createdAtIdx: index("inventory_movements_created_at_idx").on(table.createdAt),
  referenceIdx: index("inventory_movements_reference_idx").on(table.referenceType, table.referenceId),
}));

// ====================================
// PRODUCT ATTRIBUTES (FOR EXTENSIBILITY)
// ====================================

export const productAttributes = pgTable("product_attributes", {
  id: uuid("id").primaryKey().defaultRandom(),

  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),

  attributeKey: varchar("attribute_key", { length: 100 }).notNull(),
  attributeValue: text("attribute_value").notNull(),
  attributeType: varchar("attribute_type", { length: 50 }), // text, number, boolean, json

  displayOrder: integer("display_order").default(0),
  isVisible: boolean("is_visible").notNull().default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  productIdx: index("product_attributes_product_idx").on(table.productId),
  keyIdx: index("product_attributes_key_idx").on(table.attributeKey),
  productKeyIdx: uniqueIndex("product_attributes_product_key_idx").on(table.productId, table.attributeKey),
}));

// ====================================
// RELATIONS
// ====================================

export const productCategoriesRelations = relations(productCategories, ({ many, one }) => ({
  products: many(products),
  parentCategory: one(productCategories, {
    fields: [productCategories.parentId],
    references: [productCategories.id],
  }),
  childCategories: many(productCategories),
  createdByUser: one(adminUsers, {
    fields: [productCategories.createdBy],
    references: [adminUsers.id],
  }),
  updatedByUser: one(adminUsers, {
    fields: [productCategories.updatedBy],
    references: [adminUsers.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  priceHistory: many(priceHistory),
  inventoryMovements: many(inventoryMovements),
  attributes: many(productAttributes),
  parentProduct: one(products, {
    fields: [products.variantOf],
    references: [products.id],
  }),
  variants: many(products),
  createdByUser: one(adminUsers, {
    fields: [products.createdBy],
    references: [adminUsers.id],
  }),
  updatedByUser: one(adminUsers, {
    fields: [products.updatedBy],
    references: [adminUsers.id],
  }),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  product: one(products, {
    fields: [priceHistory.productId],
    references: [products.id],
  }),
  changedByUser: one(adminUsers, {
    fields: [priceHistory.changedBy],
    references: [adminUsers.id],
  }),
  approvedByUser: one(adminUsers, {
    fields: [priceHistory.approvedBy],
    references: [adminUsers.id],
  }),
}));

export const inventoryMovementsRelations = relations(inventoryMovements, ({ one }) => ({
  product: one(products, {
    fields: [inventoryMovements.productId],
    references: [products.id],
  }),
  performedByUser: one(adminUsers, {
    fields: [inventoryMovements.performedBy],
    references: [adminUsers.id],
  }),
}));

export const productAttributesRelations = relations(productAttributes, ({ one }) => ({
  product: one(products, {
    fields: [productAttributes.productId],
    references: [products.id],
  }),
}));

// ====================================
// TYPE EXPORTS
// ====================================

// Categories
export type ProductCategory = InferSelectModel<typeof productCategories>;
export type NewProductCategory = InferInsertModel<typeof productCategories>;

// Products
export type Product = InferSelectModel<typeof products>;
export type NewProduct = InferInsertModel<typeof products>;

// Price History
export type PriceHistory = InferSelectModel<typeof priceHistory>;
export type NewPriceHistory = InferInsertModel<typeof priceHistory>;

// Inventory
export type InventoryMovement = InferSelectModel<typeof inventoryMovements>;
export type NewInventoryMovement = InferInsertModel<typeof inventoryMovements>;

// Attributes
export type ProductAttribute = InferSelectModel<typeof productAttributes>;
export type NewProductAttribute = InferInsertModel<typeof productAttributes>;

// Enums as Types
export type ProductType = typeof productTypeEnum.enumValues[number];
export type ProductStatus = typeof productStatusEnum.enumValues[number];
export type MembershipTier = typeof membershipTierEnum.enumValues[number];