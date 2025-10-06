import {
  pgTable,
  uuid,
  integer,
  decimal,
  timestamp,
  index,
  uniqueIndex,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import { InferSelectModel, InferInsertModel, relations } from "drizzle-orm";
import { products, membershipTierEnum } from "./products";
import { adminUsers } from "../schema";

// ====================================
// MEMBER PRICING
// ====================================

export const memberPricing = pgTable("member_pricing", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Product Reference
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),

  // Member Price (in cents)
  memberPrice: integer("member_price").notNull(), // Member selling price

  // Discount Information
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }), // e.g., 20.00 for 20%
  discountAmount: integer("discount_amount"), // Fixed discount amount in cents

  // Membership Tier (which tier gets this price)
  membershipTier: membershipTierEnum("membership_tier").notNull().default("basic"),

  // Bulk Pricing
  minQuantity: integer("min_quantity").notNull().default(1), // Minimum quantity for this price
  maxQuantity: integer("max_quantity"), // Maximum quantity for this price (null = unlimited)

  // Status
  isActive: boolean("is_active").notNull().default(true),

  // Validity Period
  validFrom: timestamp("valid_from").defaultNow().notNull(),
  validUntil: timestamp("valid_until"),

  // Priority (higher priority prices override lower ones)
  priority: integer("priority").notNull().default(0),

  // Notes
  notes: varchar("notes", { length: 500 }),

  // Audit
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
  updatedBy: uuid("updated_by").references(() => adminUsers.id, { onDelete: "set null" }),
}, (table) => ({
  // Performance Indexes
  productIdx: index("member_pricing_product_idx").on(table.productId),
  tierIdx: index("member_pricing_tier_idx").on(table.membershipTier),
  activeIdx: index("member_pricing_active_idx").on(table.isActive),
  validityIdx: index("member_pricing_validity_idx").on(table.validFrom, table.validUntil),
  priorityIdx: index("member_pricing_priority_idx").on(table.priority),

  // Unique constraint: one price per product-tier-quantity combination
  uniquePricingIdx: uniqueIndex("member_pricing_unique_idx").on(
    table.productId,
    table.membershipTier,
    table.minQuantity
  ),
}));

// ====================================
// RELATIONS
// ====================================

export const memberPricingRelations = relations(memberPricing, ({ one }) => ({
  product: one(products, {
    fields: [memberPricing.productId],
    references: [products.id],
  }),
  createdByUser: one(adminUsers, {
    fields: [memberPricing.createdBy],
    references: [adminUsers.id],
  }),
  updatedByUser: one(adminUsers, {
    fields: [memberPricing.updatedBy],
    references: [adminUsers.id],
  }),
}));

// ====================================
// TYPE EXPORTS
// ====================================

export type MemberPricing = InferSelectModel<typeof memberPricing>;
export type NewMemberPricing = InferInsertModel<typeof memberPricing>;