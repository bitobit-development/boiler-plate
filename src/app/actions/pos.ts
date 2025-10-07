'use server';

import { db } from '@/lib/db';
import {
  subscribers,
  products,
  productCategories,
  orders,
  inventoryMovements,
  type Order,
  type NewOrder,
  type NewInventoryMovement
} from '@/lib/db/schema';
import { eq, and, or, like, gte, gt, sql } from 'drizzle-orm';
import type { Subscriber, Product, ProductCategory } from '@/lib/db/schema';
import { sendSMS } from '@/lib/services/sms';
import crypto from 'crypto';

// Type definitions for POS operations
export interface ProductWithCategory extends Product {
  category?: ProductCategory;
}

export interface CustomerVerificationResult {
  found: boolean;
  customer?: Subscriber;
  isActive: boolean;
  requiresOTP: boolean;
  otpSent?: boolean;
  message?: string;
}

export interface ProductAvailability {
  available: boolean;
  currentStock: number;
  reservedQuantity: number;
  availableQuantity: number;
  message?: string;
}

export interface ReceiptData {
  orderNumber: string;
  customerName: string;
  customerMobile: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  timestamp: Date;
}

// New interfaces for order creation
export interface CreatePOSOrderInput {
  subscriberId: string;
  customerName: string;
  customerMobile: string;
  shopUserId: string;
  shopUserName: string;
  kioskId: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number; // in cents
  }>;
  paymentMethod: 'cash' | 'card' | 'eft' | 'voucher';
  subtotal: number; // in cents
  tax: number; // in cents
  total: number; // in cents
  wasOtpOverridden?: boolean;
  overrideReason?: string;
  overrideExplanation?: string;
}

export interface CreatePOSOrderResult {
  success: boolean;
  order?: Order;
  message: string;
  error?: string;
  insufficientStock?: Array<{
    productId: string;
    productName: string;
    available: number;
    requested: number;
  }>;
}

export interface ValidatedInventoryItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  product: Product;
  availableQuantity: number;
  needsBackorder: boolean;
}

/**
 * Verify customer status for POS transaction
 * Checks if customer exists and whether OTP verification is needed
 */
export async function verifyCustomerStatus(mobile: string): Promise<CustomerVerificationResult> {
  try {
    // Clean mobile number format
    const cleanedMobile = mobile.trim().replace(/\s+/g, '');

    // Find customer by mobile number
    const [customer] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.mobile, cleanedMobile))
      .limit(1);

    if (!customer) {
      return {
        found: false,
        isActive: false,
        requiresOTP: false,
        message: 'Customer not found. Please check the mobile number.'
      };
    }

    // Check if customer is active
    const isActive = customer.status === 'active' && customer.mobileVerified === true;

    // Determine if OTP is required
    const requiresOTP = !customer.mobileVerified || customer.status === 'pending';

    return {
      found: true,
      customer,
      isActive,
      requiresOTP,
      message: isActive
        ? 'Customer verified and ready for purchase'
        : requiresOTP
          ? 'Customer requires OTP verification'
          : 'Customer account is not active'
    };
  } catch (error) {
    console.error('Error verifying customer status:', error);
    return {
      found: false,
      isActive: false,
      requiresOTP: false,
      message: 'Error verifying customer status. Please try again.'
    };
  }
}

/**
 * Search for customers by name, surname, email or mobile
 * Used for customer lookup in POS interface
 */
export async function searchCustomers(query: string): Promise<Subscriber[]> {
  try {
    if (!query || query.length < 2) {
      return [];
    }

    const searchPattern = `%${query.toLowerCase()}%`;

    const customers = await db
      .select()
      .from(subscribers)
      .where(
        or(
          sql`LOWER(${subscribers.name}) LIKE ${searchPattern}`,
          sql`LOWER(${subscribers.surname}) LIKE ${searchPattern}`,
          sql`LOWER(CONCAT(${subscribers.name}, ' ', ${subscribers.surname})) LIKE ${searchPattern}`,
          sql`LOWER(${subscribers.email}) LIKE ${searchPattern}`,
          like(subscribers.mobile, `%${query}%`)
        )
      )
      .limit(20)
      .orderBy(subscribers.name);

    return customers;
  } catch (error) {
    console.error('Error searching customers:', error);
    return [];
  }
}

/**
 * Get active products for POS display
 * Optionally filter by category
 */
export async function getPOSProducts(categoryId?: string): Promise<ProductWithCategory[]> {
  try {
    // Build query
    let query = db
      .select({
        product: products,
        category: productCategories
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(
        and(
          eq(products.status, 'active'),
          eq(products.isVisible, true),
          gt(products.quantity, 0) // Only show products in stock
        )
      );

    // Add category filter if provided
    if (categoryId) {
      query = query.where(
        and(
          eq(products.status, 'active'),
          eq(products.isVisible, true),
          gt(products.quantity, 0),
          eq(products.categoryId, categoryId)
        )
      );
    }

    const results = await query
      .orderBy(products.sortVariantOrder, products.name)
      .limit(100);

    // Transform results to match expected structure
    return results.map(({ product, category }) => ({
      ...product,
      category: category || undefined
    }));
  } catch (error) {
    console.error('Error fetching POS products:', error);
    return [];
  }
}

/**
 * Check product availability and stock levels
 * Considers both current stock and reserved quantities
 */
export async function checkProductStock(
  productId: string,
  requestedQuantity: number
): Promise<ProductAvailability> {
  try {
    // Validate inputs
    if (!productId || requestedQuantity <= 0) {
      return {
        available: false,
        currentStock: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        message: 'Invalid product or quantity'
      };
    }

    // Get product details
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      return {
        available: false,
        currentStock: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        message: 'Product not found'
      };
    }

    // Check if product is active and visible
    if (product.status !== 'active' || !product.isVisible) {
      return {
        available: false,
        currentStock: product.quantity,
        reservedQuantity: product.reservedQuantity || 0,
        availableQuantity: 0,
        message: 'Product is not available for sale'
      };
    }

    // Calculate available quantity
    const availableQuantity = product.quantity - (product.reservedQuantity || 0);

    // Check if requested quantity is available
    const isAvailable = availableQuantity >= requestedQuantity;

    // Handle backorder scenarios
    if (!isAvailable && product.allowBackorder) {
      return {
        available: true,
        currentStock: product.quantity,
        reservedQuantity: product.reservedQuantity || 0,
        availableQuantity,
        message: `Only ${availableQuantity} units available. Backorder allowed.`
      };
    }

    return {
      available: isAvailable,
      currentStock: product.quantity,
      reservedQuantity: product.reservedQuantity || 0,
      availableQuantity,
      message: isAvailable
        ? `${availableQuantity} units available`
        : `Insufficient stock. Only ${availableQuantity} units available`
    };
  } catch (error) {
    console.error('Error checking product stock:', error);
    return {
      available: false,
      currentStock: 0,
      reservedQuantity: 0,
      availableQuantity: 0,
      message: 'Error checking product availability'
    };
  }
}

/**
 * Get all active product categories for POS
 */
export async function getPOSCategories(): Promise<ProductCategory[]> {
  try {
    const categories = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.isActive, true))
      .orderBy(productCategories.sortOrder, productCategories.name);

    return categories;
  } catch (error) {
    console.error('Error fetching POS categories:', error);
    return [];
  }
}

/**
 * Reserve product quantity for pending order
 * This prevents overselling while order is being processed
 */
export async function reserveProductQuantity(
  productId: string,
  quantity: number
): Promise<{ success: boolean; message: string }> {
  try {
    // Check stock availability first
    const availability = await checkProductStock(productId, quantity);

    if (!availability.available) {
      return {
        success: false,
        message: availability.message || 'Product not available'
      };
    }

    // Reserve the quantity
    await db
      .update(products)
      .set({
        reservedQuantity: sql`COALESCE(${products.reservedQuantity}, 0) + ${quantity}`,
        updatedAt: new Date()
      })
      .where(eq(products.id, productId));

    return {
      success: true,
      message: `Reserved ${quantity} units`
    };
  } catch (error) {
    console.error('Error reserving product quantity:', error);
    return {
      success: false,
      message: 'Failed to reserve product quantity'
    };
  }
}

/**
 * Release reserved product quantity
 * Called when order is cancelled or times out
 */
export async function releaseProductQuantity(
  productId: string,
  quantity: number
): Promise<{ success: boolean; message: string }> {
  try {
    await db
      .update(products)
      .set({
        reservedQuantity: sql`GREATEST(COALESCE(${products.reservedQuantity}, 0) - ${quantity}, 0)`,
        updatedAt: new Date()
      })
      .where(eq(products.id, productId));

    return {
      success: true,
      message: `Released ${quantity} units`
    };
  } catch (error) {
    console.error('Error releasing product quantity:', error);
    return {
      success: false,
      message: 'Failed to release product quantity'
    };
  }
}

/**
 * Send order receipt via SMS to customer
 * Formats receipt with order details and sends via SMS
 */
export async function sendReceiptSMS(receiptData: ReceiptData): Promise<{ success: boolean; message: string }> {
  try {
    // Ultra-compact format for SMS (must stay under 160 chars)
    // Abbreviate payment method names
    const paymentAbbrev = receiptData.paymentMethod
      .replace('TERMINAL_YOKO', 'YOKO')
      .replace('TERMINAL_POS', 'POS')
      .replace('CASH', 'Cash');

    // Format items (truncate long names, remove decimals)
    const itemsList = receiptData.items
      .map(item => {
        const name = item.name.length > 15 ? item.name.substring(0, 15) : item.name;
        return `${name} x${item.quantity} R${Math.round(item.subtotal / 100)}`;
      })
      .join('\n');

    // Compact format: no customer name, no subtotal, VAT inline with total
    const message = `BIGG BUZZ\n#${receiptData.orderNumber}\n${itemsList}\nTot: R${Math.round(receiptData.total / 100)}(VAT R${Math.round(receiptData.tax / 100)})\nPaid: ${paymentAbbrev}`;

    // Send SMS (sendSMS function handles number formatting internally)
    const result = await sendSMS({
      to: receiptData.customerMobile,
      message,
      channel: 'sms'
    });

    if (result.success) {
      return {
        success: true,
        message: 'Receipt sent successfully via SMS'
      };
    } else {
      return {
        success: false,
        message: result.error || 'Failed to send receipt'
      };
    }
  } catch (error) {
    console.error('Error sending receipt SMS:', error);
    return {
      success: false,
      message: 'Error sending receipt SMS'
    };
  }
}

// ====================================
// HELPER FUNCTIONS FOR ORDER CREATION
// ====================================

/**
 * Generate unique order number
 * Format: "ORD-{8-char-random}"
 */
function generateOrderNumber(): string {
  const randomBytes = crypto.randomBytes(4);
  const randomString = randomBytes.toString('base64')
    .replace(/[+/=]/g, '')
    .substring(0, 8)
    .toUpperCase();
  return `ORD-${randomString}`;
}

/**
 * Validate inventory for all items
 * Returns validated items with product details and availability
 */
async function validateInventory(
  items: CreatePOSOrderInput['items']
): Promise<{
  success: boolean;
  validatedItems?: ValidatedInventoryItem[];
  insufficientStock?: Array<{
    productId: string;
    productName: string;
    available: number;
    requested: number;
  }>;
}> {
  const validatedItems: ValidatedInventoryItem[] = [];
  const insufficientStock: Array<{
    productId: string;
    productName: string;
    available: number;
    requested: number;
  }> = [];

  // Fetch all products in one query for performance
  const productIds = items.map(item => item.productId);
  const productsData = await db
    .select()
    .from(products)
    .where(sql`${products.id} = ANY(ARRAY[${sql.join(productIds.map(id => sql`${id}::uuid`), sql`, `)}])`);

  // Create a map for quick lookup
  const productMap = new Map(productsData.map(p => [p.id, p]));

  for (const item of items) {
    const product = productMap.get(item.productId);

    if (!product) {
      insufficientStock.push({
        productId: item.productId,
        productName: item.productName,
        available: 0,
        requested: item.quantity
      });
      continue;
    }

    // Check if product is active and visible
    if (product.status !== 'active' || !product.isVisible) {
      insufficientStock.push({
        productId: item.productId,
        productName: item.productName,
        available: 0,
        requested: item.quantity
      });
      continue;
    }

    // Skip inventory check if tracking is disabled
    if (!product.trackQuantity) {
      validatedItems.push({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        product,
        availableQuantity: Infinity, // Unlimited when tracking disabled
        needsBackorder: false
      });
      continue;
    }

    // Calculate available quantity (current stock - reserved)
    const availableQuantity = product.quantity - (product.reservedQuantity || 0);
    const hasEnoughStock = availableQuantity >= item.quantity;

    // Check stock availability
    if (!hasEnoughStock && !product.allowBackorder) {
      // Not enough stock and backorder not allowed
      insufficientStock.push({
        productId: item.productId,
        productName: item.productName,
        available: Math.max(0, availableQuantity),
        requested: item.quantity
      });
    } else {
      // Either has stock or backorder is allowed
      validatedItems.push({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        product,
        availableQuantity,
        needsBackorder: !hasEnoughStock && product.allowBackorder
      });
    }
  }

  return {
    success: insufficientStock.length === 0,
    validatedItems: insufficientStock.length === 0 ? validatedItems : undefined,
    insufficientStock: insufficientStock.length > 0 ? insufficientStock : undefined
  };
}

/**
 * Create inventory movement records
 */
async function createInventoryMovement(
  productId: string,
  quantity: number,
  orderId: string,
  reason: string,
  performedBy?: string
): Promise<void> {
  // Get current product state for tracking
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) return;

  const previousQuantity = product.quantity;
  const newQuantity = previousQuantity - quantity;

  const movementData: NewInventoryMovement = {
    productId,
    movementType: 'removal',
    quantity: -quantity, // Negative for removals
    previousQuantity,
    newQuantity,
    reason,
    referenceType: 'order',
    referenceId: orderId,
    performedBy,
    notes: `POS sale - Order ${orderId}`,
    createdAt: new Date()
  };

  await db.insert(inventoryMovements).values(movementData);
}

/**
 * Create a POS order with atomic transaction
 * Handles inventory management and order creation in a single transaction
 */
export async function createPOSOrder(input: CreatePOSOrderInput): Promise<CreatePOSOrderResult> {
  try {
    // Validate input
    if (!input.items || input.items.length === 0) {
      return {
        success: false,
        message: 'Order must contain at least one item',
        error: 'Invalid order: no items'
      };
    }

    // Validate inventory first (outside transaction for better error reporting)
    const inventoryCheck = await validateInventory(input.items);
    if (!inventoryCheck.success) {
      return {
        success: false,
        message: 'Insufficient stock for some items',
        error: 'Inventory validation failed',
        insufficientStock: inventoryCheck.insufficientStock
      };
    }

    const validatedItems = inventoryCheck.validatedItems!;

    // Use a transaction for atomic operations
    const result = await db.transaction(async (tx) => {
      // Generate unique order number
      const orderNumber = generateOrderNumber();

      // Check if any items need backorder
      const hasBackorderItems = validatedItems.some(item => item.needsBackorder);

      // Prepare order items for JSONB storage
      const orderItems = validatedItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productSku: item.product.sku || undefined,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
        metadata: {
          productType: item.product.productType,
          weight: item.product.weight,
          strain: item.product.strain,
          needsBackorder: item.needsBackorder
        }
      }));

      // Create the order
      const orderData: NewOrder = {
        orderNumber,
        orderType: 'pos',
        subscriberId: input.subscriberId,
        customerName: input.customerName,
        customerMobile: input.customerMobile,
        shopUserId: input.shopUserId,
        shopUserName: input.shopUserName,
        kioskId: input.kioskId,
        items: orderItems,
        subtotal: input.subtotal,
        tax: input.tax,
        discount: 0,
        total: input.total,
        paymentMethod: input.paymentMethod,
        paymentStatus: 'completed',
        status: 'confirmed',
        wasOtpOverridden: input.wasOtpOverridden || hasBackorderItems,
        overrideReason: input.overrideReason || (hasBackorderItems ? 'inventory_backorder' : undefined),
        overrideExplanation: input.overrideExplanation || (hasBackorderItems ? 'Some items were backordered due to insufficient stock' : undefined),
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date()
      };

      const [createdOrder] = await tx
        .insert(orders)
        .values(orderData)
        .returning();

      // Update inventory for each item
      for (const item of validatedItems) {
        // Skip if inventory tracking is disabled
        if (!item.product.trackQuantity) {
          continue;
        }

        // Update product quantity and reserved quantity
        // Using SQL for atomic update with proper constraints
        await tx
          .update(products)
          .set({
            quantity: sql`GREATEST(${products.quantity} - ${item.quantity}, 0)`,
            // Release any reserved quantity for this product
            reservedQuantity: sql`GREATEST(COALESCE(${products.reservedQuantity}, 0) - ${item.quantity}, 0)`,
            updatedAt: new Date()
          })
          .where(eq(products.id, item.productId));

        // Create inventory movement record
        const movementReason = item.needsBackorder
          ? 'POS sale (backorder override)'
          : 'POS sale';

        await createInventoryMovement(
          item.productId,
          item.quantity,
          createdOrder.id,
          movementReason,
          input.shopUserId
        );
      }

      return createdOrder;
    });

    return {
      success: true,
      order: result,
      message: `Order ${result.orderNumber} created successfully`
    };
  } catch (error) {
    console.error('Error creating POS order:', error);

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('concurrent')) {
        return {
          success: false,
          message: 'Order could not be processed due to concurrent updates. Please try again.',
          error: 'Concurrency error'
        };
      }
    }

    return {
      success: false,
      message: 'Failed to create order. Please try again.',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Complete a POS order after payment
 * Updates order status and triggers receipt sending
 */
export async function completePOSOrder(
  orderId: string,
  paymentReference?: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Update order status
    const [updatedOrder] = await db
      .update(orders)
      .set({
        paymentStatus: 'completed',
        status: 'fulfilled',
        paymentReference,
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();

    if (!updatedOrder) {
      return {
        success: false,
        message: 'Order not found'
      };
    }

    return {
      success: true,
      message: 'Order completed successfully'
    };
  } catch (error) {
    console.error('Error completing POS order:', error);
    return {
      success: false,
      message: 'Failed to complete order'
    };
  }
}

/**
 * Cancel a POS order and restore inventory
 */
export async function cancelPOSOrder(
  orderId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Use transaction for atomicity
    await db.transaction(async (tx) => {
      // Get the order details
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status === 'cancelled') {
        throw new Error('Order is already cancelled');
      }

      // Update order status
      await tx
        .update(orders)
        .set({
          status: 'cancelled',
          paymentStatus: 'cancelled',
          cancelledAt: new Date(),
          updatedAt: new Date(),
          notes: reason || 'Order cancelled by POS user'
        })
        .where(eq(orders.id, orderId));

      // Restore inventory for each item
      for (const item of order.items) {
        const [product] = await tx
          .select()
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        if (product && product.trackQuantity) {
          // Restore the quantity
          await tx
            .update(products)
            .set({
              quantity: sql`${products.quantity} + ${item.quantity}`,
              updatedAt: new Date()
            })
            .where(eq(products.id, item.productId));

          // Create reversal inventory movement
          await createInventoryMovement(
            item.productId,
            -item.quantity, // Negative to show addition
            orderId,
            'Order cancellation - inventory restored',
            order.shopUserId
          );
        }
      }
    });

    return {
      success: true,
      message: 'Order cancelled and inventory restored'
    };
  } catch (error) {
    console.error('Error cancelling POS order:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to cancel order'
    };
  }
}

// ====================================
// PENDING ORDERS INTEGRATION
// ====================================

export interface PendingOrder {
  id: string;
  orderNumber: string;
  subscriberId: string;
  customerName: string | null;
  customerMobile: string | null;
  items: Array<{
    productId: string;
    productName: string;
    productSku?: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending';
  createdAt: Date;
  expiresAt: Date | null;
}

export interface ConvertOrderToPOSResult {
  success: boolean;
  cartItems?: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
  order?: Order;
  message: string;
  error?: string;
}

/**
 * Get pending orders for a subscriber
 * Used by POS to display orders waiting for pickup
 */
export async function getPendingOrdersBySubscriber(
  subscriberId: string
): Promise<{ success: boolean; orders: PendingOrder[]; message?: string }> {
  try {
    // Validate subscriber ID
    if (!subscriberId) {
      return {
        success: false,
        orders: [],
        message: 'Subscriber ID is required'
      };
    }

    // Fetch pending orders for this subscriber
    const pendingOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.subscriberId, subscriberId),
          eq(orders.status, 'pending'),
          or(
            sql`${orders.expiresAt} IS NULL`,
            gte(orders.expiresAt, new Date())
          )
        )
      )
      .orderBy(sql`${orders.createdAt} DESC`);

    if (pendingOrders.length === 0) {
      return {
        success: true,
        orders: [],
        message: 'No pending orders found for this customer'
      };
    }

    // Transform to PendingOrder type
    const formattedOrders: PendingOrder[] = pendingOrders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      subscriberId: order.subscriberId!,
      customerName: order.customerName,
      customerMobile: order.customerMobile,
      items: order.items,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      status: 'pending' as const,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt
    }));

    return {
      success: true,
      orders: formattedOrders,
      message: `Found ${formattedOrders.length} pending order(s)`
    };
  } catch (error) {
    console.error('Error fetching pending orders:', error);
    return {
      success: false,
      orders: [],
      message: 'Failed to fetch pending orders'
    };
  }
}

/**
 * Convert a pending order to POS cart
 * Loads order items into POS cart and updates order status to confirmed
 */
export async function convertPendingOrderToPOS(
  orderId: string,
  shopUserId: string
): Promise<ConvertOrderToPOSResult> {
  try {
    // Validate inputs
    if (!orderId || !shopUserId) {
      return {
        success: false,
        message: 'Order ID and Shop User ID are required',
        error: 'Invalid input'
      };
    }

    // Use transaction for atomic operation
    const result = await db.transaction(async (tx) => {
      // Fetch the order
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        throw new Error('Order not found');
      }

      // Verify order is pending
      if (order.status !== 'pending') {
        throw new Error(`Order is not pending (current status: ${order.status})`);
      }

      // Check if order has expired
      if (order.expiresAt && order.expiresAt < new Date()) {
        // Auto-cancel expired order
        await tx
          .update(orders)
          .set({
            status: 'cancelled',
            cancelledAt: new Date(),
            updatedAt: new Date(),
            notes: 'Order expired before POS conversion'
          })
          .where(eq(orders.id, orderId));

        throw new Error('Order has expired and has been cancelled');
      }

      // Validate inventory availability for all items
      const unavailableItems: string[] = [];

      for (const item of order.items) {
        const availability = await checkProductStock(item.productId, item.quantity);

        if (!availability.available) {
          unavailableItems.push(`${item.productName} (requested: ${item.quantity}, available: ${availability.availableQuantity})`);
        }
      }

      if (unavailableItems.length > 0) {
        throw new Error(`Insufficient stock for: ${unavailableItems.join(', ')}`);
      }

      // Update order status to confirmed
      const [updatedOrder] = await tx
        .update(orders)
        .set({
          status: 'confirmed',
          shopUserId: shopUserId,
          updatedAt: new Date(),
          notes: 'Converted from pending online order to POS'
        })
        .where(eq(orders.id, orderId))
        .returning();

      // Extract cart items for POS
      const cartItems = order.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price
      }));

      return {
        updatedOrder,
        cartItems
      };
    });

    return {
      success: true,
      cartItems: result.cartItems,
      order: result.updatedOrder,
      message: 'Order loaded to POS cart successfully'
    };
  } catch (error) {
    console.error('Error converting pending order to POS:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to convert order',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fetch subscriber by ID
 * Used to load customer details from orders
 */
export async function getSubscriberById(
  subscriberId: string
): Promise<{ success: boolean; subscriber?: Subscriber; message?: string }> {
  try {
    if (!subscriberId) {
      return {
        success: false,
        message: 'Subscriber ID is required'
      };
    }

    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.id, subscriberId))
      .limit(1);

    if (!subscriber) {
      return {
        success: false,
        message: 'Subscriber not found'
      };
    }

    return {
      success: true,
      subscriber
    };
  } catch (error) {
    console.error('Error fetching subscriber:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch subscriber'
    };
  }
}