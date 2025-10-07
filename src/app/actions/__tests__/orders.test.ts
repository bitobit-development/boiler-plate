import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  getSubscriberPendingOrders,
  cancelPendingOrder,
  getPendingOrderDetails,
  cleanupExpiredOrders,
  type PendingOrder,
} from '../orders';
import { db } from '@/lib/db';
import { orders, subscribers, products } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// Mock the database
jest.mock('@/lib/db', () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    insert: jest.fn(),
  },
}));

// Helper to create mock subscriber
const createMockSubscriber = (overrides = {}) => ({
  id: 'sub-123',
  mobile: '+27123456789',
  name: 'Test',
  surname: 'User',
  email: 'test@example.com',
  status: 'active',
  mobileVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Helper to create mock order
const createMockOrder = (overrides = {}) => ({
  id: 'order-123',
  orderNumber: 'WEB-123',
  subscriberId: 'sub-123',
  customerName: 'Test User',
  customerMobile: '+27123456789',
  items: [
    {
      productId: 'prod-1',
      productName: 'Test Product',
      quantity: 2,
      price: 10000,
      subtotal: 20000,
    },
  ],
  subtotal: 20000,
  tax: 3000,
  total: 23000,
  status: 'pending',
  orderType: 'online',
  paymentStatus: 'pending',
  createdAt: new Date(),
  updatedAt: new Date(),
  expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
  shopUserId: 'shop-user-1',
  shopUserName: 'Shop User',
  ...overrides,
});

// Helper to create mock product
const createMockProduct = (overrides = {}) => ({
  id: 'prod-1',
  name: 'Test Product',
  sku: 'TEST-001',
  price: 10000,
  quantity: 100,
  reservedQuantity: 0,
  trackQuantity: true,
  status: 'active',
  isVisible: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('Order Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSubscriberPendingOrders', () => {
    it('should return empty array when subscriber has no pending orders', async () => {
      // Mock subscriber validation
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([createMockSubscriber()]),
      });

      // Mock orders query - no orders
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([]),
      });

      const result = await getSubscriberPendingOrders('sub-123');

      expect(result.success).toBe(true);
      expect(result.orders).toEqual([]);
      expect(result.message).toBe('No pending orders');
    });

    it('should return valid pending orders', async () => {
      const mockOrder = createMockOrder();

      // Mock subscriber validation
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([createMockSubscriber()]),
      });

      // Mock orders query
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([mockOrder]),
      });

      const result = await getSubscriberPendingOrders('sub-123');

      expect(result.success).toBe(true);
      expect(result.orders.length).toBe(1);
      expect(result.orders[0].orderNumber).toBe('WEB-123');
      expect(result.orders[0].status).toBe('pending');
    });

    it('should filter out expired orders and auto-cancel them', async () => {
      const expiredOrder = createMockOrder({
        id: 'expired-order',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      const validOrder = createMockOrder({
        id: 'valid-order',
      });

      // Mock subscriber validation
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([createMockSubscriber()]),
      });

      // Mock orders query
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([expiredOrder, validOrder]),
      });

      // Mock update for auto-cancellation
      (db.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      });

      const result = await getSubscriberPendingOrders('sub-123');

      expect(result.success).toBe(true);
      expect(result.orders.length).toBe(1);
      expect(result.orders[0].id).toBe('valid-order');
      expect(db.update).toHaveBeenCalledTimes(1);
    });

    it('should return error for invalid subscriber', async () => {
      // Mock invalid subscriber
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      const result = await getSubscriberPendingOrders('invalid-sub');

      expect(result.success).toBe(false);
      expect(result.orders).toEqual([]);
      expect(result.message).toBe('Invalid subscriber or subscription not active');
    });

    it('should handle database errors gracefully', async () => {
      // Mock subscriber validation
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([createMockSubscriber()]),
      });

      // Mock orders query error
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      const result = await getSubscriberPendingOrders('sub-123');

      expect(result.success).toBe(false);
      expect(result.orders).toEqual([]);
      expect(result.message).toBe('Failed to fetch pending orders');
    });

    it('should validate UUID format', async () => {
      const result = await getSubscriberPendingOrders('invalid-uuid');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Validation error');
    });
  });

  describe('cancelPendingOrder', () => {
    it('should successfully cancel a pending order', async () => {
      const mockOrder = createMockOrder();

      // Mock subscriber validation
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([createMockSubscriber()]),
      });

      // Mock order fetch
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockOrder]),
      });

      // Mock update
      (db.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ ...mockOrder, status: 'cancelled' }]),
      });

      const result = await cancelPendingOrder('order-123', 'sub-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Order cancelled successfully');
      expect(db.update).toHaveBeenCalled();
    });

    it('should reject cancellation if order not found', async () => {
      // Mock subscriber validation
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([createMockSubscriber()]),
      });

      // Mock order fetch - not found
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      const result = await cancelPendingOrder('nonexistent-order', 'sub-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Order not found');
    });

    it('should reject cancellation if subscriber does not own order', async () => {
      const mockOrder = createMockOrder({ subscriberId: 'different-sub' });

      // Mock subscriber validation
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([createMockSubscriber()]),
      });

      // Mock order fetch
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockOrder]),
      });

      const result = await cancelPendingOrder('order-123', 'sub-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unauthorized: You do not own this order');
    });

    it('should reject cancellation if order already cancelled', async () => {
      const mockOrder = createMockOrder({ status: 'cancelled' });

      // Mock subscriber validation
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([createMockSubscriber()]),
      });

      // Mock order fetch
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockOrder]),
      });

      const result = await cancelPendingOrder('order-123', 'sub-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Order is already cancelled');
    });

    it('should reject cancellation if order is not pending', async () => {
      const mockOrder = createMockOrder({ status: 'confirmed' });

      // Mock subscriber validation
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([createMockSubscriber()]),
      });

      // Mock order fetch
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockOrder]),
      });

      const result = await cancelPendingOrder('order-123', 'sub-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Only pending orders can be cancelled');
    });

    it('should auto-cancel and inform user if order expired', async () => {
      const mockOrder = createMockOrder({
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      // Mock subscriber validation
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([createMockSubscriber()]),
      });

      // Mock order fetch
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockOrder]),
      });

      // Mock update for auto-cancellation
      (db.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      });

      const result = await cancelPendingOrder('order-123', 'sub-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Order has expired and has been automatically cancelled');
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('getPendingOrderDetails', () => {
    it('should return order details successfully', async () => {
      const mockOrder = createMockOrder();

      // Mock subscriber validation
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([createMockSubscriber()]),
      });

      // Mock order fetch
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockOrder]),
      });

      const result = await getPendingOrderDetails('order-123', 'sub-123');

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.order?.orderNumber).toBe('WEB-123');
      expect(result.order?.items.length).toBe(1);
    });

    it('should reject if order not found', async () => {
      // Mock subscriber validation
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([createMockSubscriber()]),
      });

      // Mock order fetch - not found
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      const result = await getPendingOrderDetails('nonexistent-order', 'sub-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Order not found');
    });

    it('should reject if subscriber does not own order', async () => {
      const mockOrder = createMockOrder({ subscriberId: 'different-sub' });

      // Mock subscriber validation
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([createMockSubscriber()]),
      });

      // Mock order fetch
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockOrder]),
      });

      const result = await getPendingOrderDetails('order-123', 'sub-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unauthorized: You do not own this order');
    });

    it('should reject if order is not pending', async () => {
      const mockOrder = createMockOrder({ status: 'confirmed' });

      // Mock subscriber validation
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([createMockSubscriber()]),
      });

      // Mock order fetch
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockOrder]),
      });

      const result = await getPendingOrderDetails('order-123', 'sub-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Order is not pending');
    });

    it('should auto-cancel if order expired', async () => {
      const mockOrder = createMockOrder({
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      // Mock subscriber validation
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([createMockSubscriber()]),
      });

      // Mock order fetch
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockOrder]),
      });

      // Mock update for auto-cancellation
      (db.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      });

      const result = await getPendingOrderDetails('order-123', 'sub-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Order has expired and has been automatically cancelled');
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredOrders', () => {
    it('should auto-cancel all expired orders', async () => {
      const expiredOrder1 = createMockOrder({
        id: 'expired-1',
        expiresAt: new Date(Date.now() - 1000),
      });

      const expiredOrder2 = createMockOrder({
        id: 'expired-2',
        expiresAt: new Date(Date.now() - 2000),
      });

      // Mock expired orders query
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([expiredOrder1, expiredOrder2]),
      });

      // Mock update for auto-cancellation
      (db.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      });

      await cleanupExpiredOrders();

      expect(db.update).toHaveBeenCalledTimes(2);
    });

    it('should handle no expired orders', async () => {
      // Mock expired orders query - no results
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      });

      await cleanupExpiredOrders();

      expect(db.update).not.toHaveBeenCalled();
    });

    it('should throw error on database failure', async () => {
      // Mock database error
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      await expect(cleanupExpiredOrders()).rejects.toThrow('Database error');
    });
  });
});
