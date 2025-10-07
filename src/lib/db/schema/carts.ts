import {
  pgTable,
  uuid,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { InferSelectModel, InferInsertModel, relations } from "drizzle-orm";
import { subscribers } from "../schema";

// ====================================
// CARTS TABLE
// ====================================

/**
 * Shopping carts for online orders
 *
 * Design Decisions:
 * 1. One cart per subscriber (enforced by UNIQUE constraint on subscriber_id)
 * 2. Items stored as JSONB for flexibility and atomic updates
 * 3. 48-hour default expiration for cart abandonment cleanup
 * 4. Cascade delete when subscriber is deleted (cleanup)
 * 5. Member pricing captured at time of cart addition
 */
export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Subscriber Reference (One-to-One)
  subscriberId: uuid("subscriber_id")
    .notNull()
    .unique()
    .references(() => subscribers.id, { onDelete: "cascade" }),

  // Cart Items (JSONB for flexibility)
  items: jsonb("items").notNull().$type<Array<CartItem>>().default([]),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),

  // Expiration for abandoned cart cleanup (default: 48 hours)
  expiresAt: timestamp("expires_at")
    .notNull()
    .$defaultFn(() => {
      const date = new Date();
      date.setHours(date.getHours() + 48);
      return date;
    }),
}, (table) => ({
  // Primary subscriber lookup (unique constraint already creates index)
  subscriberIdx: uniqueIndex("carts_subscriber_idx").on(table.subscriberId),

  // Expiration queries for cleanup jobs
  expiresAtIdx: index("carts_expires_at_idx").on(table.expiresAt),

  // Composite index for active cart lookups
  subscriberExpiresIdx: index("carts_subscriber_expires_idx")
    .on(table.subscriberId, table.expiresAt),
}));

// ====================================
// CART ITEM TYPE
// ====================================

/**
 * Cart item structure stored in JSONB
 *
 * Design Decisions:
 * 1. Denormalize product details for cart stability (product changes don't affect cart)
 * 2. Capture member price at time of addition (price locked for 48 hours)
 * 3. Store SKU for inventory tracking
 * 4. Include addedAt timestamp for cart item analytics
 */
export interface CartItem {
  productId: string;          // UUID of product
  productName: string;         // Product name (denormalized)
  productSku?: string;         // SKU for inventory tracking
  quantity: number;            // Quantity selected
  price: number;               // Member price in cents (locked at addition time)
  subtotal: number;            // quantity * price in cents
  addedAt: string;             // ISO timestamp when item was added
}

// ====================================
// RELATIONS
// ====================================

export const cartsRelations = relations(carts, ({ one }) => ({
  subscriber: one(subscribers, {
    fields: [carts.subscriberId],
    references: [subscribers.id],
  }),
}));

// ====================================
// TYPE EXPORTS
// ====================================

export type Cart = InferSelectModel<typeof carts>;
export type NewCart = InferInsertModel<typeof carts>;

// ====================================
// HELPER TYPES
// ====================================

/**
 * Cart with calculated totals
 */
export interface CartWithTotals extends Cart {
  itemCount: number;
  subtotal: number;
  tax: number;
  total: number;
}

/**
 * Cart item validation result
 */
export interface CartItemValidation {
  isValid: boolean;
  error?: string;
  maxQuantity?: number;
}
