'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Cart, CartItem, CartWithTotals } from '@/lib/db/schema';
import {
  addToCart as addToCartAction,
  updateCartItem as updateCartItemAction,
  removeFromCart as removeFromCartAction,
  clearCart as clearCartAction,
  getSubscriberCart,
  createPendingOrder as createPendingOrderAction,
} from '@/app/actions/cart';
import { toast } from '@/hooks/use-toast';

// ====================================
// TYPE DEFINITIONS
// ====================================

interface OnlineCartContextType {
  // Cart State
  cart: Cart | null;
  loading: boolean;
  itemCount: number;
  subtotal: number;
  tax: number;
  total: number;

  // Cart Operations
  addToCart: (productId: string, quantity: number) => Promise<boolean>;
  updateQuantity: (productId: string, quantity: number) => Promise<boolean>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;

  // Checkout
  createPendingOrder: () => Promise<{ success: boolean; orderNumber?: string }>;
}

// ====================================
// CONTEXT CREATION
// ====================================

const OnlineCartContext = createContext<OnlineCartContextType | undefined>(undefined);

// ====================================
// PROVIDER COMPONENT
// ====================================

export function OnlineCartProvider({
  children,
  subscriberId,
}: {
  children: React.ReactNode;
  subscriberId: string | null;
}) {
  // State
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [itemCount, setItemCount] = useState<number>(0);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);

  // ====================================
  // CALCULATED VALUES
  // ====================================

  /**
   * Calculate cart totals from cart items
   */
  const calculateTotals = useCallback((cartData: Cart | null) => {
    if (!cartData || !cartData.items) {
      setItemCount(0);
      setSubtotal(0);
      setTax(0);
      setTotal(0);
      return;
    }

    const items = cartData.items as CartItem[];
    const calculatedSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const calculatedTax = Math.round(calculatedSubtotal * 0.15); // 15% VAT
    const calculatedTotal = calculatedSubtotal + calculatedTax;
    const calculatedItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    setItemCount(calculatedItemCount);
    setSubtotal(calculatedSubtotal);
    setTax(calculatedTax);
    setTotal(calculatedTotal);
  }, []);

  // ====================================
  // CART OPERATIONS
  // ====================================

  /**
   * Fetch cart from server
   */
  const refreshCart = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getSubscriberCart(subscriberId);

      if (result.success && result.cart) {
        setCart(result.cart);
        calculateTotals(result.cart);
      } else {
        // No cart or expired
        setCart(null);
        calculateTotals(null);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      toast({
        title: 'Error',
        description: 'Failed to load cart. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [subscriberId, calculateTotals]);

  /**
   * Add product to cart with optimistic updates
   */
  const addToCart = useCallback(
    async (productId: string, quantity: number): Promise<boolean> => {
      // Store previous state for rollback
      const previousCart = cart;

      try {
        // Optimistic update: Update local state immediately
        if (cart && cart.items) {
          const currentItems = cart.items as CartItem[];
          const existingItemIndex = currentItems.findIndex(
            (item) => item.productId === productId
          );

          let updatedItems: CartItem[];
          if (existingItemIndex >= 0) {
            // Update existing item
            updatedItems = [...currentItems];
            const existingItem = updatedItems[existingItemIndex];
            updatedItems[existingItemIndex] = {
              ...existingItem,
              quantity: existingItem.quantity + quantity,
              subtotal: (existingItem.quantity + quantity) * existingItem.price,
            };
          } else {
            // Note: We don't have product details here for optimistic update
            // So we'll skip optimistic update for new items and let server handle it
            updatedItems = currentItems;
          }

          // Only update if we modified an existing item
          if (existingItemIndex >= 0) {
            const optimisticCart = {
              ...cart,
              items: updatedItems as any,
              updatedAt: new Date(),
            };
            setCart(optimisticCart);
            calculateTotals(optimisticCart);
          }
        }

        // Show immediate feedback
        toast({
          title: 'Adding to cart...',
          description: 'Please wait',
          duration: 1000,
        });

        // Execute server action in background
        const result = await addToCartAction(subscriberId, productId, quantity);

        if (result.success && result.cart) {
          // Update with server response (authoritative)
          setCart(result.cart);
          calculateTotals(result.cart);

          toast({
            title: 'Added to cart',
            description: result.message,
          });

          return true;
        } else {
          // Rollback on failure
          setCart(previousCart);
          calculateTotals(previousCart);

          toast({
            title: 'Error',
            description: result.message || 'Failed to add product to cart',
            variant: 'destructive',
          });

          return false;
        }
      } catch (error) {
        console.error('Error adding to cart:', error);

        // Rollback on error
        setCart(previousCart);
        calculateTotals(previousCart);

        toast({
          title: 'Error',
          description: 'Failed to add product to cart. Please try again.',
          variant: 'destructive',
        });

        return false;
      }
    },
    [subscriberId, calculateTotals, cart]
  );

  /**
   * Update cart item quantity
   */
  const updateQuantity = useCallback(
    async (productId: string, quantity: number): Promise<boolean> => {
      try {
        setLoading(true);

        const result = await updateCartItemAction(subscriberId, productId, quantity);

        if (result.success) {
          if (result.cart) {
            setCart(result.cart);
            calculateTotals(result.cart);
          } else {
            // Cart was deleted (empty)
            setCart(null);
            calculateTotals(null);
          }

          toast({
            title: 'Cart updated',
            description: result.message,
          });

          return true;
        } else {
          toast({
            title: 'Error',
            description: result.message || 'Failed to update cart',
            variant: 'destructive',
          });

          return false;
        }
      } catch (error) {
        console.error('Error updating cart:', error);
        toast({
          title: 'Error',
          description: 'Failed to update cart. Please try again.',
          variant: 'destructive',
        });

        return false;
      } finally {
        setLoading(false);
      }
    },
    [subscriberId, calculateTotals]
  );

  /**
   * Remove item from cart
   */
  const removeItem = useCallback(
    async (productId: string): Promise<void> => {
      try {
        setLoading(true);

        const result = await removeFromCartAction(subscriberId, productId);

        if (result.success) {
          if (result.cart) {
            setCart(result.cart);
            calculateTotals(result.cart);
          } else {
            // Cart was deleted (empty)
            setCart(null);
            calculateTotals(null);
          }

          toast({
            title: 'Item removed',
            description: result.message,
          });
        } else {
          toast({
            title: 'Error',
            description: result.message || 'Failed to remove item',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error removing item:', error);
        toast({
          title: 'Error',
          description: 'Failed to remove item. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [subscriberId, calculateTotals]
  );

  /**
   * Clear entire cart
   */
  const clearCart = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);

      const result = await clearCartAction(subscriberId);

      if (result.success) {
        setCart(null);
        calculateTotals(null);

        toast({
          title: 'Cart cleared',
          description: result.message,
        });
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to clear cart',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear cart. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [subscriberId, calculateTotals]);

  /**
   * Create pending order from cart
   */
  const createPendingOrder = useCallback(async (): Promise<{
    success: boolean;
    orderNumber?: string;
  }> => {
    try {
      setLoading(true);

      const result = await createPendingOrderAction(subscriberId);

      if (result.success) {
        // Clear cart state
        setCart(null);
        calculateTotals(null);

        toast({
          title: 'Order created',
          description: result.message,
        });

        return {
          success: true,
          orderNumber: result.orderNumber,
        };
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to create order',
          variant: 'destructive',
        });

        return {
          success: false,
        };
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: 'Error',
        description: 'Failed to create order. Please try again.',
        variant: 'destructive',
      });

      return {
        success: false,
      };
    } finally {
      setLoading(false);
    }
  }, [subscriberId, calculateTotals]);

  // ====================================
  // LIFECYCLE
  // ====================================

  /**
   * Load cart on mount
   */
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  /**
   * Auto-refresh cart on window focus (optional)
   */
  useEffect(() => {
    const handleFocus = () => {
      refreshCart();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshCart]);

  // ====================================
  // CONTEXT VALUE
  // ====================================

  const contextValue: OnlineCartContextType = {
    // State
    cart,
    loading,
    itemCount,
    subtotal,
    tax,
    total,

    // Operations
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    refreshCart,

    // Checkout
    createPendingOrder,
  };

  return (
    <OnlineCartContext.Provider value={contextValue}>
      {children}
    </OnlineCartContext.Provider>
  );
}

// ====================================
// HOOK
// ====================================

/**
 * Hook to access cart context
 * Must be used within OnlineCartProvider
 */
export function useOnlineCart() {
  const context = useContext(OnlineCartContext);

  if (!context) {
    throw new Error('useOnlineCart must be used within OnlineCartProvider');
  }

  return context;
}

// ====================================
// TYPE EXPORTS
// ====================================

export type { OnlineCartContextType, CartWithTotals };
