/**
 * OnlineCartContext Tests
 *
 * Tests for the OnlineCartContext provider and hook.
 * These tests verify cart state management, server synchronization,
 * and error handling.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { OnlineCartProvider, useOnlineCart } from '../OnlineCartContext';
import * as cartActions from '@/app/actions/cart';
import { toast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('@/app/actions/cart');
jest.mock('@/hooks/use-toast');

const mockCartActions = cartActions as jest.Mocked<typeof cartActions>;
const mockToast = toast as jest.MockedFunction<typeof toast>;

describe('OnlineCartContext', () => {
  const subscriberId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Provider', () => {
    it('fetches cart on mount', async () => {
      const mockCart = {
        id: 'cart-1',
        subscriberId,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(),
      };

      mockCartActions.getSubscriberCart.mockResolvedValue({
        success: true,
        cart: mockCart,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <OnlineCartProvider subscriberId={subscriberId}>
          {children}
        </OnlineCartProvider>
      );

      const { result } = renderHook(() => useOnlineCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockCartActions.getSubscriberCart).toHaveBeenCalledWith(subscriberId);
      expect(result.current.cart).toEqual(mockCart);
    });

    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useOnlineCart());
      }).toThrow('useOnlineCart must be used within OnlineCartProvider');

      console.error = originalError;
    });
  });

  describe('Cart Calculations', () => {
    it('calculates itemCount correctly', async () => {
      const mockCart = {
        id: 'cart-1',
        subscriberId,
        items: [
          {
            productId: 'prod-1',
            productName: 'Product 1',
            quantity: 2,
            price: 1000,
            subtotal: 2000,
            addedAt: new Date().toISOString(),
          },
          {
            productId: 'prod-2',
            productName: 'Product 2',
            quantity: 3,
            price: 500,
            subtotal: 1500,
            addedAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(),
      };

      mockCartActions.getSubscriberCart.mockResolvedValue({
        success: true,
        cart: mockCart as any,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <OnlineCartProvider subscriberId={subscriberId}>
          {children}
        </OnlineCartProvider>
      );

      const { result } = renderHook(() => useOnlineCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.itemCount).toBe(5); // 2 + 3
    });

    it('calculates subtotal, tax, and total correctly', async () => {
      const mockCart = {
        id: 'cart-1',
        subscriberId,
        items: [
          {
            productId: 'prod-1',
            productName: 'Product 1',
            quantity: 1,
            price: 10000, // R100.00
            subtotal: 10000,
            addedAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(),
      };

      mockCartActions.getSubscriberCart.mockResolvedValue({
        success: true,
        cart: mockCart as any,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <OnlineCartProvider subscriberId={subscriberId}>
          {children}
        </OnlineCartProvider>
      );

      const { result } = renderHook(() => useOnlineCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.subtotal).toBe(10000); // R100.00
      expect(result.current.tax).toBe(1500); // 15% of 10000
      expect(result.current.total).toBe(11500); // 10000 + 1500
    });
  });

  describe('addToCart', () => {
    it('adds product to cart successfully', async () => {
      const mockCart = {
        id: 'cart-1',
        subscriberId,
        items: [
          {
            productId: 'prod-1',
            productName: 'Product 1',
            quantity: 1,
            price: 1000,
            subtotal: 1000,
            addedAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(),
      };

      mockCartActions.getSubscriberCart.mockResolvedValue({
        success: true,
        cart: null,
      });

      mockCartActions.addToCart.mockResolvedValue({
        success: true,
        cart: mockCart as any,
        message: 'Product added to cart',
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <OnlineCartProvider subscriberId={subscriberId}>
          {children}
        </OnlineCartProvider>
      );

      const { result } = renderHook(() => useOnlineCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const success = await result.current.addToCart('prod-1', 1);

      expect(success).toBe(true);
      expect(mockCartActions.addToCart).toHaveBeenCalledWith(subscriberId, 'prod-1', 1);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Added to cart',
        description: 'Product added to cart',
      });
    });

    it('handles add to cart error', async () => {
      mockCartActions.getSubscriberCart.mockResolvedValue({
        success: true,
        cart: null,
      });

      mockCartActions.addToCart.mockResolvedValue({
        success: false,
        message: 'Insufficient stock',
        error: 'INSUFFICIENT_STOCK',
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <OnlineCartProvider subscriberId={subscriberId}>
          {children}
        </OnlineCartProvider>
      );

      const { result } = renderHook(() => useOnlineCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const success = await result.current.addToCart('prod-1', 100);

      expect(success).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Insufficient stock',
        variant: 'destructive',
      });
    });
  });
});
