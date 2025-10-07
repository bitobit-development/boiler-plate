"use server";

import { db } from "@/lib/db";
import {
  carts,
  products,
  memberPricing,
  subscribers,
  orders,
  adminUsers,
  type Cart,
  type CartItem,
  type NewCart,
} from "@/lib/db/schema";
import { eq, and, sql, lte, gte } from "drizzle-orm";
import { z } from "zod";
import { sendSMS } from "@/lib/services/sms";

// ====================================
// TYPE DEFINITIONS
// ====================================

export interface AddToCartResult {
  success: boolean;
  cart?: Cart;
  message: string;
  error?: string;
}

export interface GetCartResult {
  success: boolean;
  cart?: Cart & { itemCount: number; subtotal: number; tax: number; total: number };
  message?: string;
}

export interface CreateOrderResult {
  success: boolean;
  order?: any;
  orderNumber?: string;
  message: string;
  error?: string;
  smsStatus?: "sent" | "failed" | "skipped";
  smsMessage?: string;
}

// ====================================
// VALIDATION SCHEMAS
// ====================================

const addToCartSchema = z.object({
  subscriberId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().positive().max(100),
});

const updateCartItemSchema = z.object({
  subscriberId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().min(0).max(100),
});

const removeFromCartSchema = z.object({
  subscriberId: z.string().uuid(),
  productId: z.string().uuid(),
});

const clearCartSchema = z.object({
  subscriberId: z.string().uuid(),
});

const getCartSchema = z.object({
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
 * Gets member pricing for a product
 */
async function getMemberPrice(productId: string): Promise<number | null> {
  const [pricing] = await db
    .select()
    .from(memberPricing)
    .where(
      and(
        eq(memberPricing.productId, productId),
        eq(memberPricing.isActive, true),
        lte(memberPricing.validFrom, new Date()),
        eq(memberPricing.membershipTier, "basic") // Default to basic tier
      )
    )
    .limit(1);

  return pricing?.memberPrice ?? null;
}

/**
 * Gets product details with stock validation
 */
async function getProductDetails(productId: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.id, productId),
        eq(products.status, "active"),
        eq(products.isVisible, true)
      )
    )
    .limit(1);

  return product;
}

/**
 * Calculates available stock (quantity - reservedQuantity)
 */
function getAvailableStock(product: any): number {
  if (!product.trackQuantity) return 999; // No tracking
  return Math.max(0, product.quantity - (product.reservedQuantity || 0));
}

/**
 * Validates cart expiration (48 hours)
 */
function isCartExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt);
}

/**
 * Updates cart expiration to NOW() + 48 hours
 */
function getNewExpirationTime(): Date {
  const date = new Date();
  date.setHours(date.getHours() + 48);
  return date;
}

/**
 * Calculates cart totals
 */
function calculateCartTotals(items: CartItem[]) {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = Math.round(subtotal * 0.15); // 15% VAT
  const total = subtotal + tax;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { subtotal, tax, total, itemCount };
}

// ====================================
// CART ACTIONS
// ====================================

/**
 * Add product to cart or update quantity if already exists
 */
export async function addToCart(
  subscriberId: string,
  productId: string,
  quantity: number
): Promise<AddToCartResult> {
  try {
    // Validate input
    const validated = addToCartSchema.parse({ subscriberId, productId, quantity });

    // Validate subscriber
    const isValidSubscriber = await validateSubscriber(validated.subscriberId);
    if (!isValidSubscriber) {
      return {
        success: false,
        message: "Invalid subscriber or subscription not active",
        error: "INVALID_SUBSCRIBER",
      };
    }

    // Get product details
    const product = await getProductDetails(validated.productId);
    if (!product) {
      return {
        success: false,
        message: "Product not found or not available",
        error: "PRODUCT_NOT_FOUND",
      };
    }

    // Check stock availability
    const availableStock = getAvailableStock(product);
    if (availableStock < validated.quantity) {
      return {
        success: false,
        message: `Only ${availableStock} units available`,
        error: "INSUFFICIENT_STOCK",
      };
    }

    // Get member pricing
    const memberPrice = await getMemberPrice(validated.productId);
    const price = memberPrice ?? product.price;

    // Get or create cart
    const [existingCart] = await db
      .select()
      .from(carts)
      .where(eq(carts.subscriberId, validated.subscriberId))
      .limit(1);

    let currentItems: CartItem[] = [];

    if (existingCart) {
      // Check if cart expired
      if (isCartExpired(existingCart.expiresAt)) {
        // Clear expired cart
        currentItems = [];
      } else {
        currentItems = (existingCart.items as CartItem[]) || [];
      }
    }

    // Check if product already in cart
    const existingItemIndex = currentItems.findIndex(
      (item) => item.productId === validated.productId
    );

    if (existingItemIndex >= 0) {
      // Update existing item quantity
      const newQuantity = currentItems[existingItemIndex].quantity + validated.quantity;

      // Check stock for new quantity
      if (availableStock < newQuantity) {
        return {
          success: false,
          message: `Cannot add ${validated.quantity} more. Only ${availableStock} units available total`,
          error: "INSUFFICIENT_STOCK",
        };
      }

      currentItems[existingItemIndex] = {
        ...currentItems[existingItemIndex],
        quantity: newQuantity,
        subtotal: newQuantity * price,
      };
    } else {
      // Add new item
      const newItem: CartItem = {
        productId: validated.productId,
        productName: product.name,
        productSku: product.sku || undefined,
        quantity: validated.quantity,
        price,
        subtotal: validated.quantity * price,
        addedAt: new Date().toISOString(),
      };
      currentItems.push(newItem);
    }

    // Update or create cart
    const newExpiresAt = getNewExpirationTime();

    let updatedCart: Cart;

    if (existingCart) {
      [updatedCart] = await db
        .update(carts)
        .set({
          items: currentItems as any,
          updatedAt: new Date(),
          expiresAt: newExpiresAt,
        })
        .where(eq(carts.id, existingCart.id))
        .returning();
    } else {
      const newCart: NewCart = {
        subscriberId: validated.subscriberId,
        items: currentItems as any,
        expiresAt: newExpiresAt,
      };

      [updatedCart] = await db.insert(carts).values(newCart).returning();
    }

    return {
      success: true,
      cart: updatedCart,
      message: "Product added to cart",
    };
  } catch (error) {
    console.error("Error adding to cart:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: `Validation error: ${error.errors[0].message}`,
        error: "VALIDATION_ERROR",
      };
    }

    return {
      success: false,
      message: "Failed to add product to cart",
      error: "INTERNAL_ERROR",
    };
  }
}

/**
 * Update cart item quantity
 */
export async function updateCartItem(
  subscriberId: string,
  productId: string,
  quantity: number
): Promise<AddToCartResult> {
  try {
    // Validate input
    const validated = updateCartItemSchema.parse({ subscriberId, productId, quantity });

    // If quantity is 0, remove item
    if (validated.quantity === 0) {
      return await removeFromCart(validated.subscriberId, validated.productId);
    }

    // Validate subscriber
    const isValidSubscriber = await validateSubscriber(validated.subscriberId);
    if (!isValidSubscriber) {
      return {
        success: false,
        message: "Invalid subscriber or subscription not active",
        error: "INVALID_SUBSCRIBER",
      };
    }

    // Get cart
    const [existingCart] = await db
      .select()
      .from(carts)
      .where(eq(carts.subscriberId, validated.subscriberId))
      .limit(1);

    if (!existingCart) {
      return {
        success: false,
        message: "Cart not found",
        error: "CART_NOT_FOUND",
      };
    }

    // Check expiration
    if (isCartExpired(existingCart.expiresAt)) {
      await db.delete(carts).where(eq(carts.id, existingCart.id));
      return {
        success: false,
        message: "Cart has expired",
        error: "CART_EXPIRED",
      };
    }

    const currentItems: CartItem[] = (existingCart.items as CartItem[]) || [];

    // Find item in cart
    const itemIndex = currentItems.findIndex((item) => item.productId === validated.productId);

    if (itemIndex === -1) {
      return {
        success: false,
        message: "Product not found in cart",
        error: "ITEM_NOT_FOUND",
      };
    }

    // Check stock availability
    const product = await getProductDetails(validated.productId);
    if (!product) {
      return {
        success: false,
        message: "Product no longer available",
        error: "PRODUCT_NOT_FOUND",
      };
    }

    const availableStock = getAvailableStock(product);
    if (availableStock < validated.quantity) {
      return {
        success: false,
        message: `Only ${availableStock} units available`,
        error: "INSUFFICIENT_STOCK",
      };
    }

    // Update item
    currentItems[itemIndex] = {
      ...currentItems[itemIndex],
      quantity: validated.quantity,
      subtotal: validated.quantity * currentItems[itemIndex].price,
    };

    // Update cart
    const newExpiresAt = getNewExpirationTime();

    const [updatedCart] = await db
      .update(carts)
      .set({
        items: currentItems as any,
        updatedAt: new Date(),
        expiresAt: newExpiresAt,
      })
      .where(eq(carts.id, existingCart.id))
      .returning();

    return {
      success: true,
      cart: updatedCart,
      message: "Cart updated",
    };
  } catch (error) {
    console.error("Error updating cart item:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: `Validation error: ${error.errors[0].message}`,
        error: "VALIDATION_ERROR",
      };
    }

    return {
      success: false,
      message: "Failed to update cart",
      error: "INTERNAL_ERROR",
    };
  }
}

/**
 * Remove item from cart
 */
export async function removeFromCart(
  subscriberId: string,
  productId: string
): Promise<AddToCartResult> {
  try {
    // Validate input
    const validated = removeFromCartSchema.parse({ subscriberId, productId });

    // Get cart
    const [existingCart] = await db
      .select()
      .from(carts)
      .where(eq(carts.subscriberId, validated.subscriberId))
      .limit(1);

    if (!existingCart) {
      return {
        success: false,
        message: "Cart not found",
        error: "CART_NOT_FOUND",
      };
    }

    const currentItems: CartItem[] = (existingCart.items as CartItem[]) || [];

    // Remove item
    const updatedItems = currentItems.filter((item) => item.productId !== validated.productId);

    if (updatedItems.length === currentItems.length) {
      return {
        success: false,
        message: "Product not found in cart",
        error: "ITEM_NOT_FOUND",
      };
    }

    // If cart is empty, delete it
    if (updatedItems.length === 0) {
      await db.delete(carts).where(eq(carts.id, existingCart.id));
      return {
        success: true,
        message: "Item removed. Cart is now empty",
      };
    }

    // Update cart
    const newExpiresAt = getNewExpirationTime();

    const [updatedCart] = await db
      .update(carts)
      .set({
        items: updatedItems as any,
        updatedAt: new Date(),
        expiresAt: newExpiresAt,
      })
      .where(eq(carts.id, existingCart.id))
      .returning();

    return {
      success: true,
      cart: updatedCart,
      message: "Item removed from cart",
    };
  } catch (error) {
    console.error("Error removing from cart:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: `Validation error: ${error.errors[0].message}`,
        error: "VALIDATION_ERROR",
      };
    }

    return {
      success: false,
      message: "Failed to remove item from cart",
      error: "INTERNAL_ERROR",
    };
  }
}

/**
 * Clear all items from cart
 */
export async function clearCart(
  subscriberId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Validate input
    const validated = clearCartSchema.parse({ subscriberId });

    // Delete cart
    const result = await db
      .delete(carts)
      .where(eq(carts.subscriberId, validated.subscriberId))
      .returning();

    if (result.length === 0) {
      return {
        success: true,
        message: "Cart is already empty",
      };
    }

    return {
      success: true,
      message: "Cart cleared",
    };
  } catch (error) {
    console.error("Error clearing cart:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: `Validation error: ${error.errors[0].message}`,
      };
    }

    return {
      success: false,
      message: "Failed to clear cart",
    };
  }
}

/**
 * Get subscriber's cart with calculated totals
 */
export async function getSubscriberCart(subscriberId: string): Promise<GetCartResult> {
  try {
    // Validate input
    const validated = getCartSchema.parse({ subscriberId });

    // Get cart
    const [cart] = await db
      .select()
      .from(carts)
      .where(eq(carts.subscriberId, validated.subscriberId))
      .limit(1);

    if (!cart) {
      return {
        success: true,
        message: "No active cart",
      };
    }

    // Check expiration
    if (isCartExpired(cart.expiresAt)) {
      await db.delete(carts).where(eq(carts.id, cart.id));
      return {
        success: true,
        message: "Cart has expired",
      };
    }

    const items: CartItem[] = (cart.items as CartItem[]) || [];

    // Calculate totals
    const { subtotal, tax, total, itemCount } = calculateCartTotals(items);

    return {
      success: true,
      cart: {
        ...cart,
        itemCount,
        subtotal,
        tax,
        total,
      },
    };
  } catch (error) {
    console.error("Error getting cart:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: `Validation error: ${error.errors[0].message}`,
      };
    }

    return {
      success: false,
      message: "Failed to get cart",
    };
  }
}

/**
 * Send pending order confirmation SMS
 *
 * SMS Template includes:
 * - Order number for reference
 * - Item count and total in Rands
 * - 48-hour collection reminder
 * - Shop location (from SHOP_ADDRESS env var)
 * - Shop contact phone (from SHOP_PHONE env var)
 *
 * Character count: ~220 characters (within SMS limits)
 *
 * Error Handling:
 * - SMS failures do NOT prevent order creation
 * - Returns success/failure status for logging
 * - Tested with South African and international numbers
 *
 * @param mobile - Subscriber mobile in E.164 format (e.g., +27823291893)
 * @param orderNumber - Generated order number (e.g., WEB-1234567890-ABC12)
 * @param itemCount - Total number of items in order
 * @param total - Order total in cents (converted to Rands for display)
 * @returns Promise with success status and message
 */
async function sendPendingOrderSMS(
  mobile: string,
  orderNumber: string,
  itemCount: number,
  total: number
): Promise<{ success: boolean; message: string }> {
  try {
    // Get shop info from environment variables
    const shopAddress = process.env.SHOP_ADDRESS || "123 Cannabis St, Cape Town";
    const shopPhone = process.env.SHOP_PHONE || "+27 21 123 4567";

    // Format total as Rands (divide cents by 100)
    const totalRands = (total / 100).toFixed(0);

    // Build SMS message
    const message = `BIGG BUZZ - Order Confirmed!

Order #: ${orderNumber}
Items: ${itemCount} product(s)
Total: R${totalRands}

Please collect within 48 hours from our shop.

Location: ${shopAddress}

Questions? Call ${shopPhone}`;

    // Send SMS
    const result = await sendSMS({
      to: mobile,
      message,
      channel: "sms",
    });

    return result;
  } catch (error) {
    console.error("Error sending pending order SMS:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to send SMS",
    };
  }
}

/**
 * Create pending order from cart
 * NOTE: Stock is validated but NOT reserved - final check happens at POS
 */
export async function createPendingOrder(subscriberId: string): Promise<CreateOrderResult> {
  try {
    // Validate subscriber
    const isValidSubscriber = await validateSubscriber(subscriberId);
    if (!isValidSubscriber) {
      return {
        success: false,
        message: "Invalid subscriber or subscription not active",
        error: "INVALID_SUBSCRIBER",
      };
    }

    // Get cart
    const [cart] = await db
      .select()
      .from(carts)
      .where(eq(carts.subscriberId, subscriberId))
      .limit(1);

    if (!cart) {
      return {
        success: false,
        message: "Cart is empty",
        error: "CART_EMPTY",
      };
    }

    // Check cart expiration
    if (isCartExpired(cart.expiresAt)) {
      await db.delete(carts).where(eq(carts.id, cart.id));
      return {
        success: false,
        message: "Cart has expired",
        error: "CART_EXPIRED",
      };
    }

    const cartItems: CartItem[] = (cart.items as CartItem[]) || [];

    if (cartItems.length === 0) {
      return {
        success: false,
        message: "Cart is empty",
        error: "CART_EMPTY",
      };
    }

    // Validate stock for all items (no reservation)
    for (const item of cartItems) {
      const product = await getProductDetails(item.productId);
      if (!product) {
        return {
          success: false,
          message: `Product "${item.productName}" is no longer available`,
          error: "PRODUCT_NOT_AVAILABLE",
        };
      }

      const availableStock = getAvailableStock(product);
      if (availableStock < item.quantity) {
        return {
          success: false,
          message: `Insufficient stock for "${item.productName}". Only ${availableStock} available`,
          error: "INSUFFICIENT_STOCK",
        };
      }
    }

    // Get subscriber details for order
    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.id, subscriberId))
      .limit(1);

    if (!subscriber) {
      return {
        success: false,
        message: "Subscriber not found",
        error: "SUBSCRIBER_NOT_FOUND",
      };
    }

    // Calculate totals
    const { subtotal, tax, total, itemCount } = calculateCartTotals(cartItems);

    // Generate order number
    const orderNumber = `WEB-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Set order expiration (48 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // Get system admin user for online orders (will be replaced when order is processed at POS)
    const [systemAdmin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, "admin@biggbuzz.com"))
      .limit(1);

    if (!systemAdmin) {
      return {
        success: false,
        message: "System configuration error",
        error: "SYSTEM_ADMIN_NOT_FOUND",
      };
    }

    // Convert cart items to order items format (JSONB)
    const orderItemsData = cartItems.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku || undefined,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
    }));

    // Create pending order in transaction
    const result = await db.transaction(async (tx) => {
      // Create order with items stored in JSONB field
      const [newOrder] = await tx
        .insert(orders)
        .values({
          orderNumber,
          subscriberId,
          customerName: `${subscriber.name} ${subscriber.surname}`,
          customerMobile: subscriber.mobile,
          shopUserId: systemAdmin.id, // System admin, will be updated at POS
          shopUserName: "Online Order System", // Will be updated to actual staff at POS
          items: orderItemsData as any, // Store items in JSONB field
          subtotal,
          tax,
          total,
          status: "pending",
          orderType: "online",
          paymentStatus: "pending",
          expiresAt,
        })
        .returning();

      // Clear cart after successful order creation
      await tx.delete(carts).where(eq(carts.id, cart.id));

      return newOrder;
    });

    // Send SMS notification (non-blocking - order succeeds even if SMS fails)
    let smsStatus: "sent" | "failed" | "skipped" = "skipped";
    let smsMessage = "";

    try {
      const smsResult = await sendPendingOrderSMS(
        subscriber.mobile,
        result.orderNumber,
        itemCount,
        total
      );

      if (smsResult.success) {
        smsStatus = "sent";
        smsMessage = "SMS confirmation sent successfully";
        console.log(`Order SMS sent successfully to ${subscriber.mobile}`);
      } else {
        smsStatus = "failed";
        smsMessage = `SMS failed: ${smsResult.message}`;
        console.warn(`Order SMS failed for ${subscriber.mobile}:`, smsResult.message);
      }
    } catch (smsError) {
      smsStatus = "failed";
      smsMessage = smsError instanceof Error ? smsError.message : "SMS service error";
      console.error("SMS sending error:", smsError);
    }

    return {
      success: true,
      order: result,
      orderNumber: result.orderNumber,
      message: smsStatus === "sent"
        ? "Order created successfully. SMS confirmation sent."
        : smsStatus === "failed"
        ? "Order created successfully. Note: SMS confirmation failed to send."
        : "Order created successfully.",
      smsStatus,
      smsMessage,
    };
  } catch (error) {
    console.error("Error creating pending order:", error);

    return {
      success: false,
      message: "Failed to create order",
      error: "INTERNAL_ERROR",
    };
  }
}
