'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, Subscriber } from '@/lib/db/schema';
import { checkProductStock } from '@/app/actions/pos';
import { toast } from 'sonner';

export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

export interface CartContextType {
  items: CartItem[];
  customer: Subscriber | null;
  customerVerified: boolean;
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;

  // Cart operations
  addItem: (product: Product, quantity?: number) => Promise<boolean>;
  updateQuantity: (productId: string, quantity: number) => Promise<boolean>;
  removeItem: (productId: string) => void;
  clearCart: () => void;

  // Customer operations
  setCustomer: (customer: Subscriber | null) => void;
  setCustomerVerified: (verified: boolean) => void;

  // Pending orders
  loadPendingOrder: (orderId: string) => Promise<boolean>;

  // Utility
  getItemQuantity: (productId: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const TAX_RATE = 0.15; // 15% VAT

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Subscriber | null>(null);
  const [customerVerified, setCustomerVerified] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('pos-cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        setItems(parsed.items || []);
        // Don't restore customer for security reasons
      } catch (error) {
        console.error('Failed to load cart from storage:', error);
      }
    }
  }, []);

  // Save cart to localStorage on change
  useEffect(() => {
    localStorage.setItem('pos-cart', JSON.stringify({ items }));
  }, [items]);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Add item to cart with stock check
  const addItem = useCallback(async (product: Product, quantity = 1): Promise<boolean> => {
    try {
      // Check stock availability
      const stockCheck = await checkProductStock(product.id, quantity);

      if (!stockCheck.available) {
        toast.error(stockCheck.message || 'Product not available');
        return false;
      }

      setItems(currentItems => {
        const existingItem = currentItems.find(item => item.product.id === product.id);

        if (existingItem) {
          // Update existing item quantity
          const newQuantity = existingItem.quantity + quantity;

          // Check if total quantity exceeds stock
          if (newQuantity > stockCheck.availableQuantity) {
            toast.error(`Only ${stockCheck.availableQuantity} units available`);
            return currentItems;
          }

          return currentItems.map(item =>
            item.product.id === product.id
              ? {
                  ...item,
                  quantity: newQuantity,
                  subtotal: newQuantity * (product.memberPrice || product.price)
                }
              : item
          );
        } else {
          // Add new item
          const newItem: CartItem = {
            product,
            quantity,
            subtotal: quantity * (product.memberPrice || product.price)
          };
          return [...currentItems, newItem];
        }
      });

      toast.success(`Added ${product.name} to cart`);
      return true;
    } catch (error) {
      console.error('Failed to add item to cart:', error);
      toast.error('Failed to add item to cart');
      return false;
    }
  }, []);

  // Update item quantity with stock check
  const updateQuantity = useCallback(async (productId: string, quantity: number): Promise<boolean> => {
    if (quantity <= 0) {
      removeItem(productId);
      return true;
    }

    try {
      // Check stock availability
      const stockCheck = await checkProductStock(productId, quantity);

      if (!stockCheck.available && quantity > 0) {
        toast.error(stockCheck.message || 'Insufficient stock');
        return false;
      }

      setItems(currentItems =>
        currentItems.map(item =>
          item.product.id === productId
            ? {
                ...item,
                quantity,
                subtotal: quantity * (item.product.memberPrice || item.product.price)
              }
            : item
        )
      );

      return true;
    } catch (error) {
      console.error('Failed to update quantity:', error);
      toast.error('Failed to update quantity');
      return false;
    }
  }, []);

  // Remove item from cart
  const removeItem = useCallback((productId: string) => {
    setItems(currentItems => currentItems.filter(item => item.product.id !== productId));
    toast.success('Item removed from cart');
  }, []);

  // Clear entire cart
  const clearCart = useCallback(() => {
    setItems([]);
    setCustomer(null);
    setCustomerVerified(false);
    localStorage.removeItem('pos-cart');
    toast.success('Cart cleared');
  }, []);

  // Get quantity of specific item
  const getItemQuantity = useCallback((productId: string): number => {
    const item = items.find(i => i.product.id === productId);
    return item?.quantity || 0;
  }, [items]);

  // Load pending order to cart
  const loadPendingOrder = useCallback(async (orderId: string): Promise<boolean> => {
    try {
      // Get shop user ID from localStorage (POS session)
      const shopUserId = localStorage.getItem('shop_user_id');
      if (!shopUserId) {
        toast.error('Shop user session not found. Please log in again.');
        return false;
      }

      // Convert pending order to POS
      const { convertPendingOrderToPOS } = await import('@/app/actions/pos');
      const result = await convertPendingOrderToPOS(orderId, shopUserId);

      if (!result.success) {
        toast.error(result.message || 'Failed to load order');
        return false;
      }

      // Clear current cart
      setItems([]);

      // Set customer from the order if available
      if (result.order?.subscriberId) {
        try {
          // Fetch the subscriber details via Server Action
          const { getSubscriberById } = await import('@/app/actions/pos');
          const subscriberResult = await getSubscriberById(result.order.subscriberId);

          if (subscriberResult.success && subscriberResult.subscriber) {
            setCustomer(subscriberResult.subscriber);
            setCustomerVerified(true);
          }
        } catch (error) {
          console.error('Failed to load customer from order:', error);
          // Continue with loading the cart items even if customer fetch fails
        }
      }

      // Load order items to cart
      if (result.cartItems && result.cartItems.length > 0) {
        // Fetch full product details for each item
        const { getPOSProducts } = await import('@/app/actions/pos');
        const products = await getPOSProducts();

        // Map cart items to full products
        const newCartItems: CartItem[] = [];

        for (const cartItem of result.cartItems) {
          const product = products.find(p => p.id === cartItem.productId);

          if (product) {
            newCartItems.push({
              product,
              quantity: cartItem.quantity,
              subtotal: cartItem.quantity * cartItem.price
            });
          }
        }

        setItems(newCartItems);
        toast.success(`Order ${result.order?.orderNumber || ''} loaded with ${newCartItems.length} item(s)`);
        return true;
      } else {
        toast.error('Order has no items');
        return false;
      }
    } catch (error) {
      console.error('Failed to load pending order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load order to cart');
      return false;
    }
  }, []);

  const value: CartContextType = {
    items,
    customer,
    customerVerified,
    subtotal,
    tax,
    total,
    itemCount,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    setCustomer,
    setCustomerVerified,
    loadPendingOrder,
    getItemQuantity
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}