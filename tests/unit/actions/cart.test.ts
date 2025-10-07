import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import {
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getSubscriberCart,
  createPendingOrder,
} from "@/app/actions/cart";
import { db } from "@/lib/db";

// Mock the database
jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    transaction: jest.fn(),
  },
}));

describe("Cart Actions", () => {
  const mockSubscriberId = "00000000-0000-0000-0000-000000000001";
  const mockProductId = "00000000-0000-0000-0000-000000000002";
  const mockCartId = "00000000-0000-0000-0000-000000000003";
  const mockOrderId = "00000000-0000-0000-0000-000000000004";

  const mockSubscriber = {
    id: mockSubscriberId,
    name: "Test",
    surname: "User",
    email: "test@example.com",
    mobile: "+27821234567",
    status: "active",
    mobileVerified: true,
    ageVerified: true,
    emailVerified: true,
  };

  const mockProduct = {
    id: mockProductId,
    name: "Test Product",
    slug: "test-product",
    sku: "TEST-001",
    price: 10000, // R100.00 in cents
    quantity: 50,
    reservedQuantity: 0,
    status: "active",
    isVisible: true,
    trackQuantity: true,
  };

  const mockMemberPricing = {
    id: "00000000-0000-0000-0000-000000000005",
    productId: mockProductId,
    memberPrice: 8000, // R80.00 member price
    isActive: true,
    validFrom: new Date("2024-01-01"),
    membershipTier: "basic",
  };

  const mockCart = {
    id: mockCartId,
    subscriberId: mockSubscriberId,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("addToCart", () => {
    it("should add a product to cart successfully", async () => {
      // Mock database calls
      const mockDbChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockSubscriber]),
      };

      jest.mocked(db.select).mockReturnValue(mockDbChain as any);

      // Mock member pricing query
      jest.mocked(db.select).mockReturnValueOnce(mockDbChain as any); // subscriber
      jest.mocked(db.select).mockReturnValueOnce({
        ...mockDbChain,
        limit: jest.fn().mockResolvedValue([mockProduct]),
      } as any); // product
      jest.mocked(db.select).mockReturnValueOnce({
        ...mockDbChain,
        limit: jest.fn().mockResolvedValue([mockMemberPricing]),
      } as any); // pricing
      jest.mocked(db.select).mockReturnValueOnce({
        ...mockDbChain,
        limit: jest.fn().mockResolvedValue([]), // No existing cart
      } as any);

      // Mock cart insert
      jest.mocked(db.insert).mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            {
              ...mockCart,
              items: [
                {
                  productId: mockProductId,
                  productName: mockProduct.name,
                  productSku: mockProduct.sku,
                  quantity: 2,
                  price: mockMemberPricing.memberPrice,
                  subtotal: mockMemberPricing.memberPrice * 2,
                  addedAt: new Date().toISOString(),
                },
              ],
            },
          ]),
        }),
      } as any);

      const result = await addToCart(mockSubscriberId, mockProductId, 2);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Product added to cart");
      expect(result.cart).toBeDefined();
    });

    it("should reject invalid subscriber", async () => {
      const mockDbChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]), // No subscriber found
      };

      jest.mocked(db.select).mockReturnValue(mockDbChain as any);

      const result = await addToCart(mockSubscriberId, mockProductId, 2);

      expect(result.success).toBe(false);
      expect(result.error).toBe("INVALID_SUBSCRIBER");
    });

    it("should reject invalid product", async () => {
      const mockDbChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockSubscriber]),
      };

      jest.mocked(db.select)
        .mockReturnValueOnce(mockDbChain as any) // subscriber
        .mockReturnValueOnce({
          ...mockDbChain,
          limit: jest.fn().mockResolvedValue([]), // No product
        } as any);

      const result = await addToCart(mockSubscriberId, mockProductId, 2);

      expect(result.success).toBe(false);
      expect(result.error).toBe("PRODUCT_NOT_FOUND");
    });

    it("should reject when insufficient stock", async () => {
      const mockDbChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockSubscriber]),
      };

      const lowStockProduct = { ...mockProduct, quantity: 1, reservedQuantity: 0 };

      jest.mocked(db.select)
        .mockReturnValueOnce(mockDbChain as any) // subscriber
        .mockReturnValueOnce({
          ...mockDbChain,
          limit: jest.fn().mockResolvedValue([lowStockProduct]),
        } as any); // product

      const result = await addToCart(mockSubscriberId, mockProductId, 5);

      expect(result.success).toBe(false);
      expect(result.error).toBe("INSUFFICIENT_STOCK");
    });

    it("should validate quantity input", async () => {
      const result = await addToCart(mockSubscriberId, mockProductId, 0);

      expect(result.success).toBe(false);
      expect(result.error).toBe("VALIDATION_ERROR");
    });

    it("should validate maximum quantity", async () => {
      const result = await addToCart(mockSubscriberId, mockProductId, 150);

      expect(result.success).toBe(false);
      expect(result.error).toBe("VALIDATION_ERROR");
    });
  });

  describe("updateCartItem", () => {
    it("should update cart item quantity successfully", async () => {
      const existingCart = {
        ...mockCart,
        items: [
          {
            productId: mockProductId,
            productName: mockProduct.name,
            productSku: mockProduct.sku,
            quantity: 2,
            price: 8000,
            subtotal: 16000,
            addedAt: new Date().toISOString(),
          },
        ],
      };

      const mockDbChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockSubscriber]),
      };

      jest.mocked(db.select)
        .mockReturnValueOnce(mockDbChain as any) // subscriber
        .mockReturnValueOnce({
          ...mockDbChain,
          limit: jest.fn().mockResolvedValue([existingCart]),
        } as any) // cart
        .mockReturnValueOnce({
          ...mockDbChain,
          limit: jest.fn().mockResolvedValue([mockProduct]),
        } as any); // product

      jest.mocked(db.update).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([
              {
                ...existingCart,
                items: [
                  {
                    productId: mockProductId,
                    productName: mockProduct.name,
                    quantity: 5,
                    price: 8000,
                    subtotal: 40000,
                  },
                ],
              },
            ]),
          }),
        }),
      } as any);

      const result = await updateCartItem(mockSubscriberId, mockProductId, 5);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Cart updated");
    });

    it("should remove item when quantity is 0", async () => {
      const existingCart = {
        ...mockCart,
        items: [
          {
            productId: mockProductId,
            productName: mockProduct.name,
            quantity: 2,
            price: 8000,
            subtotal: 16000,
            addedAt: new Date().toISOString(),
          },
        ],
      };

      const mockDbChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockSubscriber]),
      };

      jest.mocked(db.select)
        .mockReturnValueOnce(mockDbChain as any) // subscriber
        .mockReturnValueOnce({
          ...mockDbChain,
          limit: jest.fn().mockResolvedValue([existingCart]),
        } as any);

      jest.mocked(db.delete).mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([existingCart]),
        }),
      } as any);

      const result = await updateCartItem(mockSubscriberId, mockProductId, 0);

      expect(result.success).toBe(true);
    });

    it("should reject when cart not found", async () => {
      const mockDbChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockSubscriber]),
      };

      jest.mocked(db.select)
        .mockReturnValueOnce(mockDbChain as any)
        .mockReturnValueOnce({
          ...mockDbChain,
          limit: jest.fn().mockResolvedValue([]), // No cart
        } as any);

      const result = await updateCartItem(mockSubscriberId, mockProductId, 5);

      expect(result.success).toBe(false);
      expect(result.error).toBe("CART_NOT_FOUND");
    });

    it("should reject when cart expired", async () => {
      const expiredCart = {
        ...mockCart,
        expiresAt: new Date(Date.now() - 1000), // Expired
        items: [
          {
            productId: mockProductId,
            quantity: 2,
            price: 8000,
          },
        ],
      };

      const mockDbChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockSubscriber]),
      };

      jest.mocked(db.select)
        .mockReturnValueOnce(mockDbChain as any)
        .mockReturnValueOnce({
          ...mockDbChain,
          limit: jest.fn().mockResolvedValue([expiredCart]),
        } as any);

      jest.mocked(db.delete).mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await updateCartItem(mockSubscriberId, mockProductId, 5);

      expect(result.success).toBe(false);
      expect(result.error).toBe("CART_EXPIRED");
    });
  });

  describe("removeFromCart", () => {
    it("should remove item from cart successfully", async () => {
      const existingCart = {
        ...mockCart,
        items: [
          {
            productId: mockProductId,
            productName: mockProduct.name,
            quantity: 2,
            price: 8000,
            subtotal: 16000,
          },
          {
            productId: "other-product-id",
            productName: "Other Product",
            quantity: 1,
            price: 5000,
            subtotal: 5000,
          },
        ],
      };

      const mockDbChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existingCart]),
      };

      jest.mocked(db.select).mockReturnValue(mockDbChain as any);

      jest.mocked(db.update).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([
              {
                ...existingCart,
                items: [existingCart.items[1]],
              },
            ]),
          }),
        }),
      } as any);

      const result = await removeFromCart(mockSubscriberId, mockProductId);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Item removed from cart");
    });

    it("should delete cart when removing last item", async () => {
      const existingCart = {
        ...mockCart,
        items: [
          {
            productId: mockProductId,
            productName: mockProduct.name,
            quantity: 2,
            price: 8000,
          },
        ],
      };

      const mockDbChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existingCart]),
      };

      jest.mocked(db.select).mockReturnValue(mockDbChain as any);

      jest.mocked(db.delete).mockReturnValue({
        where: jest.fn().mockResolvedValue([existingCart]),
      } as any);

      const result = await removeFromCart(mockSubscriberId, mockProductId);

      expect(result.success).toBe(true);
      expect(result.message).toContain("empty");
    });
  });

  describe("clearCart", () => {
    it("should clear cart successfully", async () => {
      jest.mocked(db.delete).mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockCart]),
        }),
      } as any);

      const result = await clearCart(mockSubscriberId);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Cart cleared");
    });

    it("should handle empty cart gracefully", async () => {
      jest.mocked(db.delete).mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await clearCart(mockSubscriberId);

      expect(result.success).toBe(true);
      expect(result.message).toContain("already empty");
    });
  });

  describe("getSubscriberCart", () => {
    it("should return cart with calculated totals", async () => {
      const existingCart = {
        ...mockCart,
        items: [
          {
            productId: mockProductId,
            productName: mockProduct.name,
            quantity: 2,
            price: 10000,
            subtotal: 20000,
          },
        ],
      };

      const mockDbChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existingCart]),
      };

      jest.mocked(db.select).mockReturnValue(mockDbChain as any);

      const result = await getSubscriberCart(mockSubscriberId);

      expect(result.success).toBe(true);
      expect(result.cart).toBeDefined();
      expect(result.cart?.itemCount).toBe(2);
      expect(result.cart?.subtotal).toBe(20000);
      expect(result.cart?.tax).toBe(3000); // 15% of 20000
      expect(result.cart?.total).toBe(23000);
    });

    it("should handle no cart gracefully", async () => {
      const mockDbChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      jest.mocked(db.select).mockReturnValue(mockDbChain as any);

      const result = await getSubscriberCart(mockSubscriberId);

      expect(result.success).toBe(true);
      expect(result.message).toBe("No active cart");
    });

    it("should delete expired cart", async () => {
      const expiredCart = {
        ...mockCart,
        expiresAt: new Date(Date.now() - 1000),
      };

      const mockDbChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([expiredCart]),
      };

      jest.mocked(db.select).mockReturnValue(mockDbChain as any);
      jest.mocked(db.delete).mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await getSubscriberCart(mockSubscriberId);

      expect(result.success).toBe(true);
      expect(result.message).toContain("expired");
    });
  });

  describe("createPendingOrder", () => {
    it("should create pending order successfully", async () => {
      const existingCart = {
        ...mockCart,
        items: [
          {
            productId: mockProductId,
            productName: mockProduct.name,
            productSku: mockProduct.sku,
            quantity: 2,
            price: 10000,
            subtotal: 20000,
          },
        ],
      };

      const mockDbChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockSubscriber]),
      };

      jest.mocked(db.select)
        .mockReturnValueOnce(mockDbChain as any) // subscriber validation
        .mockReturnValueOnce({
          ...mockDbChain,
          limit: jest.fn().mockResolvedValue([existingCart]),
        } as any) // cart
        .mockReturnValueOnce({
          ...mockDbChain,
          limit: jest.fn().mockResolvedValue([mockProduct]),
        } as any) // product for stock validation
        .mockReturnValueOnce({
          ...mockDbChain,
          limit: jest.fn().mockResolvedValue([mockSubscriber]),
        } as any); // subscriber for order

      const mockOrder = {
        id: mockOrderId,
        orderNumber: "WEB-123456789-ABC",
        subscriberId: mockSubscriberId,
        subtotal: 20000,
        tax: 3000,
        total: 23000,
        status: "pending",
        orderType: "pickup",
      };

      jest.mocked(db.transaction).mockImplementation(async (callback) => {
        const tx = {
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([mockOrder]),
            }),
          }),
          delete: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([]),
          }),
        };

        return await callback(tx as any);
      });

      const result = await createPendingOrder(mockSubscriberId);

      expect(result.success).toBe(true);
      expect(result.orderNumber).toBeDefined();
      expect(result.message).toContain("created successfully");
    });

    it("should reject when cart is empty", async () => {
      const mockDbChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockSubscriber]),
      };

      jest.mocked(db.select)
        .mockReturnValueOnce(mockDbChain as any)
        .mockReturnValueOnce({
          ...mockDbChain,
          limit: jest.fn().mockResolvedValue([]), // No cart
        } as any);

      const result = await createPendingOrder(mockSubscriberId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("CART_EMPTY");
    });

    it("should validate stock before creating order", async () => {
      const existingCart = {
        ...mockCart,
        items: [
          {
            productId: mockProductId,
            productName: mockProduct.name,
            quantity: 100,
            price: 10000,
            subtotal: 1000000,
          },
        ],
      };

      const lowStockProduct = { ...mockProduct, quantity: 10 };

      const mockDbChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockSubscriber]),
      };

      jest.mocked(db.select)
        .mockReturnValueOnce(mockDbChain as any)
        .mockReturnValueOnce({
          ...mockDbChain,
          limit: jest.fn().mockResolvedValue([existingCart]),
        } as any)
        .mockReturnValueOnce({
          ...mockDbChain,
          limit: jest.fn().mockResolvedValue([lowStockProduct]),
        } as any);

      const result = await createPendingOrder(mockSubscriberId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("INSUFFICIENT_STOCK");
    });
  });
});
