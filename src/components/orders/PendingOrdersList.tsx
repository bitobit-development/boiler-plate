"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PendingOrderCard } from "./PendingOrderCard";
import { cancelPendingOrder, type PendingOrder } from "@/app/actions/orders";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface PendingOrdersListProps {
  orders: PendingOrder[];
  subscriberId: string;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function PendingOrdersList({
  orders: initialOrders,
  subscriberId,
  className,
}: PendingOrdersListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [orders, setOrders] = useState<PendingOrder[]>(initialOrders);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null
  );

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleCancelOrder = async (orderId: string): Promise<void> => {
    setCancellingOrderId(orderId);

    try {
      const result = await cancelPendingOrder(orderId, subscriberId);

      if (result.success) {
        // Remove order from list
        setOrders((prev) => prev.filter((order) => order.id !== orderId));

        // Show success message
        toast.success(result.message);

        // Refresh the page to update any server-side data
        startTransition(() => {
          router.refresh();
        });
      } else {
        // Show error message
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error("Failed to cancel order. Please try again.");
    } finally {
      setCancellingOrderId(null);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  // Loading state during transition
  if (isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading orders...</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        {orders.map((order) => (
          <PendingOrderCard
            key={order.id}
            order={order}
            onCancel={handleCancelOrder}
            className={
              cancellingOrderId === order.id ? "pointer-events-none opacity-50" : ""
            }
          />
        ))}
      </div>
    </div>
  );
}
