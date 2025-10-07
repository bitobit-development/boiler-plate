"use server";

import { db } from "@/lib/db";
import {
  orders,
  products,
  subscribers,
  type Order,
  type OrderItem as OrderItemType,
} from "@/lib/db/schema";
import { eq, and, lte, gte, sql } from "drizzle-orm";
import { z } from "zod";

// ====================================
// TYPE DEFINITIONS
// ====================================

export interface OrderItem {
  productId: string;
  productName: string;
  productSku?: string;
  quantity: number;
  price: number; // Unit price in cents
  subtotal: number; // Quantity * price in cents
  discount?: number;
  metadata?: Record<string, any>;
}

export interface PendingOrder {
  id: string;
  orderNumber: string;
  subscriberId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending';
  createdAt: Date;
  expiresAt: Date;
  customerName?: string;
  customerMobile?: string;
}

export interface GetOrdersResult {
  success: boolean;
  orders: PendingOrder[];
  message?: string;
}

export interface GetOrderResult {
  success: boolean;
  order?: PendingOrder;
  message?: string;
}

export interface CancelOrderResult {
  success: boolean;
  message: string;
}

export interface GetPendingOrdersCountResult {
  success: boolean;
  count: number;
  message?: string;
}

// ====================================
// VALIDATION SCHEMAS
// ====================================

const getOrdersSchema = z.object({
  subscriberId: z.string().uuid(),
});

const cancelOrderSchema = z.object({
  orderId: z.string().uuid(),
  subscriberId: z.string().uuid(),
});

const getOrderDetailsSchema = z.object({
  orderId: z.string().uuid(),
  subscriberId: z.string().uuid(),
});

// ====================================
// HELPER FUNCTIONS
// ====================================

/**
 * Validates subscriber existence and active status
 */
async function validateSubscriber(subscriberId: string): Promise<boolean> {
  const [subscriber] = await db
    .select()
    .from(subscribers)
    .where(
      and(
        eq(subscribers.id, subscriberId),
        eq(subscribers.status, "active"),
        eq(subscribers.mobileVerified, true)
      )
    )
    .limit(1);

  return !!subscriber;
}

/**
 * Checks if an order has expired (48 hours from creation)
 */
function isOrderExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date() > new Date(expiresAt);
}

/**
 * Transforms database order to PendingOrder format
 */
function transformOrderToPendingOrder(order: Order): PendingOrder | null {
  if (order.status !== 'pending') return null;
  if (!order.expiresAt) return null;

  const items = (order.items as OrderItem[]) || [];

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    subscriberId: order.subscriberId!,
    items,
    subtotal: order.subtotal,
    tax: order.tax,
    total: order.total,
    status: 'pending',
    createdAt: order.createdAt,
    expiresAt: order.expiresAt,
    customerName: order.customerName || undefined,
    customerMobile: order.customerMobile || undefined,
  };
}

/**
 * Automatically cancels an expired order
 */
async function autoCancelExpiredOrder(orderId: string): Promise<void> {
  await db
    .update(orders)
    .set({
      status: 'cancelled',
      cancelledAt: new Date(),
      updatedAt: new Date(),
      notes: 'Order automatically cancelled due to 48-hour expiration',
    })
    .where(eq(orders.id, orderId));
}

/**
 * Validates inventory for order items
 */
async function validateOrderInventory(items: OrderItem[]): Promise<{
  valid: boolean;
  message?: string;
}> {
  for (const item of items) {
    const [product] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, item.productId),
          eq(products.status, "active"),
          eq(products.isVisible, true)
        )
      )
      .limit(1);

    if (!product) {
      return {
        valid: false,
        message: `Product "${item.productName}" is no longer available`,
      };
    }

    // Check stock if tracking is enabled
    if (product.trackQuantity) {
      const availableStock = Math.max(
        0,
        product.quantity - (product.reservedQuantity || 0)
      );

      if (availableStock < item.quantity) {
        return {
          valid: false,
          message: `Insufficient stock for "${item.productName}". Only ${availableStock} available`,
        };
      }
    }
  }

  return { valid: true };
}

// ====================================
// ORDER ACTIONS
// ====================================

/**
 * Get all non-expired pending orders for a subscriber
 */
export async function getSubscriberPendingOrders(
  subscriberId: string
): Promise<GetOrdersResult> {
  try {
    // Validate input
    const validated = getOrdersSchema.parse({ subscriberId });

    // Validate subscriber
    const isValidSubscriber = await validateSubscriber(validated.subscriberId);
    if (!isValidSubscriber) {
      return {
        success: false,
        orders: [],
        message: "Invalid subscriber or subscription not active",
      };
    }

    // Fetch all pending orders for subscriber
    const pendingOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.subscriberId, validated.subscriberId),
          eq(orders.status, "pending")
        )
      )
      .orderBy(sql`${orders.createdAt} DESC`);

    // Filter out expired orders and auto-cancel them
    const validOrders: PendingOrder[] = [];
    const expiredOrderIds: string[] = [];

    for (const order of pendingOrders) {
      if (order.expiresAt && isOrderExpired(order.expiresAt)) {
        expiredOrderIds.push(order.id);
      } else {
        const pendingOrder = transformOrderToPendingOrder(order);
        if (pendingOrder) {
          validOrders.push(pendingOrder);
        }
      }
    }

    // Auto-cancel expired orders
    if (expiredOrderIds.length > 0) {
      await Promise.all(
        expiredOrderIds.map((id) => autoCancelExpiredOrder(id))
      );
    }

    return {
      success: true,
      orders: validOrders,
      message: validOrders.length === 0 ? "No pending orders" : undefined,
    };
  } catch (error) {
    console.error("Error fetching pending orders:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        orders: [],
        message: `Validation error: ${error.errors[0].message}`,
      };
    }

    return {
      success: false,
      orders: [],
      message: "Failed to fetch pending orders",
    };
  }
}

/**
 * Cancel a pending order
 */
export async function cancelPendingOrder(
  orderId: string,
  subscriberId: string
): Promise<CancelOrderResult> {
  try {
    // Validate input
    const validated = cancelOrderSchema.parse({ orderId, subscriberId });

    // Validate subscriber
    const isValidSubscriber = await validateSubscriber(validated.subscriberId);
    if (!isValidSubscriber) {
      return {
        success: false,
        message: "Invalid subscriber or subscription not active",
      };
    }

    // Fetch order
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, validated.orderId))
      .limit(1);

    if (!order) {
      return {
        success: false,
        message: "Order not found",
      };
    }

    // Verify ownership
    if (order.subscriberId !== validated.subscriberId) {
      return {
        success: false,
        message: "Unauthorized: You do not own this order",
      };
    }

    // Check if order is already cancelled or completed
    if (order.status === 'cancelled') {
      return {
        success: false,
        message: "Order is already cancelled",
      };
    }

    if (order.status !== 'pending') {
      return {
        success: false,
        message: "Only pending orders can be cancelled",
      };
    }

    // Check if order has expired
    if (order.expiresAt && isOrderExpired(order.expiresAt)) {
      // Auto-cancel and inform user
      await autoCancelExpiredOrder(order.id);
      return {
        success: false,
        message: "Order has expired and has been automatically cancelled",
      };
    }

    // Cancel the order
    await db
      .update(orders)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date(),
        notes: 'Order cancelled by subscriber',
      })
      .where(eq(orders.id, validated.orderId));

    return {
      success: true,
      message: "Order cancelled successfully",
    };
  } catch (error) {
    console.error("Error cancelling order:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: `Validation error: ${error.errors[0].message}`,
      };
    }

    return {
      success: false,
      message: "Failed to cancel order",
    };
  }
}

/**
 * Get detailed information for a specific pending order
 */
export async function getPendingOrderDetails(
  orderId: string,
  subscriberId: string
): Promise<GetOrderResult> {
  try {
    // Validate input
    const validated = getOrderDetailsSchema.parse({ orderId, subscriberId });

    // Validate subscriber
    const isValidSubscriber = await validateSubscriber(validated.subscriberId);
    if (!isValidSubscriber) {
      return {
        success: false,
        message: "Invalid subscriber or subscription not active",
      };
    }

    // Fetch order
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, validated.orderId))
      .limit(1);

    if (!order) {
      return {
        success: false,
        message: "Order not found",
      };
    }

    // Verify ownership
    if (order.subscriberId !== validated.subscriberId) {
      return {
        success: false,
        message: "Unauthorized: You do not own this order",
      };
    }

    // Check if order is pending
    if (order.status !== 'pending') {
      return {
        success: false,
        message: "Order is not pending",
      };
    }

    // Check if order has expired
    if (order.expiresAt && isOrderExpired(order.expiresAt)) {
      // Auto-cancel and inform user
      await autoCancelExpiredOrder(order.id);
      return {
        success: false,
        message: "Order has expired and has been automatically cancelled",
      };
    }

    // Transform to PendingOrder
    const pendingOrder = transformOrderToPendingOrder(order);
    if (!pendingOrder) {
      return {
        success: false,
        message: "Invalid order data",
      };
    }

    return {
      success: true,
      order: pendingOrder,
    };
  } catch (error) {
    console.error("Error fetching order details:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: `Validation error: ${error.errors[0].message}`,
      };
    }

    return {
      success: false,
      message: "Failed to fetch order details",
    };
  }
}

/**
 * Cleanup expired pending orders (to be run via cron job)
 * This function auto-cancels all expired pending orders
 */
export async function cleanupExpiredOrders(): Promise<void> {
  try {
    const now = new Date();

    // Find all expired pending orders
    const expiredOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, "pending"),
          lte(orders.expiresAt, now)
        )
      );

    console.log(`Found ${expiredOrders.length} expired pending orders to clean up`);

    // Cancel each expired order
    for (const order of expiredOrders) {
      await autoCancelExpiredOrder(order.id);
    }

    console.log(`Successfully cancelled ${expiredOrders.length} expired orders`);
  } catch (error) {
    console.error("Error cleaning up expired orders:", error);
    throw error;
  }
}

/**
 * Get count of pending orders for a subscriber
 * Used for navigation badge display
 */
export async function getPendingOrdersCount(
  subscriberId: string
): Promise<GetPendingOrdersCountResult> {
  try {
    // Validate input
    const validated = getOrdersSchema.parse({ subscriberId });

    // Validate subscriber
    const isValidSubscriber = await validateSubscriber(validated.subscriberId);
    if (!isValidSubscriber) {
      return {
        success: false,
        count: 0,
        message: "Invalid subscriber or subscription not active",
      };
    }

    // Count pending orders that haven't expired
    const now = new Date();
    const result = await db
      .select({
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.subscriberId, validated.subscriberId),
          eq(orders.status, "pending"),
          gte(orders.expiresAt, now) // Only count non-expired orders
        )
      );

    const count = result[0]?.count || 0;

    return {
      success: true,
      count,
    };
  } catch (error) {
    console.error("Error fetching pending orders count:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        count: 0,
        message: `Validation error: ${error.errors[0].message}`,
      };
    }

    return {
      success: false,
      count: 0,
      message: "Failed to fetch pending orders count",
    };
  }
}
