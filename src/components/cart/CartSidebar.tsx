"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useOnlineCart } from "@/contexts/OnlineCartContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CartItem } from "./CartItem";
import { CartSummary } from "./CartSummary";
import { CheckoutButton } from "./CheckoutButton";
import { EmptyCartState } from "./EmptyCartState";
import { CartExpirationTimer } from "./CartExpirationTimer";
import { CartSkeleton } from "./CartSkeleton";
import { Trash2 } from "lucide-react";
import type { CartItem as CartItemType } from "@/lib/db/schema";

interface CartSidebarProps {
  open: boolean;
  onClose: () => void;
  className?: string;
}

export const CartSidebar = ({ open, onClose, className }: CartSidebarProps) => {
  const router = useRouter();
  const {
    cart,
    loading,
    itemCount,
    subtotal,
    tax,
    total,
    updateQuantity,
    removeItem,
    clearCart,
    createPendingOrder,
  } = useOnlineCart();

  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const cartItems = (cart?.items as CartItemType[]) || [];
  const hasItems = cartItems.length > 0;

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    await updateQuantity(productId, quantity);
  };

  const handleRemoveItem = async (productId: string) => {
    await removeItem(productId);
  };

  const handleClearCart = async () => {
    if (confirm("Are you sure you want to clear your entire cart?")) {
      await clearCart();
    }
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);

    try {
      const result = await createPendingOrder();

      if (result.success && result.orderNumber) {
        // Close cart sidebar
        onClose();

        // Navigate to orders page
        router.push(`/my-orders?new=${result.orderNumber}`);
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleCartExpired = () => {
    // Cart expired, refresh to clear state
    window.location.reload();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className={cn(
          "w-full sm:max-w-md md:max-w-lg flex flex-col p-0",
          className
        )}
        aria-label="Shopping cart"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-zinc-200">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl font-bold text-zinc-900">
                Shopping Cart
              </SheetTitle>
              <SheetDescription className="text-sm text-zinc-500">
                {hasItems
                  ? `${itemCount} item${itemCount !== 1 ? "s" : ""} in your cart`
                  : "Your cart is empty"}
              </SheetDescription>
            </div>

            {hasItems && !loading && (
              <Button
                onClick={handleClearCart}
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                aria-label="Clear entire cart"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>

          {/* Cart Expiration Timer */}
          {hasItems && cart?.expiresAt && (
            <div className="mt-3">
              <CartExpirationTimer
                expiresAt={cart.expiresAt}
                onExpired={handleCartExpired}
              />
            </div>
          )}
        </SheetHeader>

        {/* Cart Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="px-6 py-4">
              <CartSkeleton itemCount={3} />
            </div>
          ) : !hasItems ? (
            <EmptyCartState />
          ) : (
            <ScrollArea className="h-full px-6">
              <div className="py-4" role="list" aria-label="Cart items">
                {cartItems.map((item) => (
                  <CartItem
                    key={item.productId}
                    item={item}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemove={handleRemoveItem}
                    loading={loading}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer with Summary and Checkout */}
        {hasItems && !loading && (
          <SheetFooter className="px-6 py-4 border-t border-zinc-200 mt-auto">
            <div className="w-full space-y-4">
              <CartSummary
                subtotal={subtotal}
                tax={tax}
                total={total}
                itemCount={itemCount}
              />

              <Separator />

              <CheckoutButton
                disabled={!hasItems || loading}
                loading={isCheckingOut}
                onCheckout={handleCheckout}
              />

              <p className="text-xs text-center text-zinc-500">
                You will receive an SMS confirmation after placing your order.
              </p>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
};
