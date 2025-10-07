"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExpirationTimer } from "./ExpirationTimer";
import { PendingOrder } from "@/app/actions/orders";
import {
  ShoppingBag,
  AlertCircle,
  X,
  Package,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface PendingOrderCardProps {
  order: PendingOrder;
  onCancel: (orderId: string) => Promise<void>;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format currency in South African Rand
 */
function formatCurrency(cents: number): string {
  const rand = cents / 100;
  return `R ${rand.toFixed(2)}`;
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Calculate total items in order
 */
function getTotalItems(order: PendingOrder): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

// ============================================================================
// Component
// ============================================================================

export function PendingOrderCard({
  order,
  onCancel,
  className,
}: PendingOrderCardProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleCancelClick = () => {
    setShowCancelDialog(true);
  };

  const handleCancelConfirm = async () => {
    setIsCancelling(true);
    try {
      await onCancel(order.id);
      setShowCancelDialog(false);
    } catch (error) {
      console.error("Cancel order error:", error);
      // Error handling is done in parent component
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancelDialogClose = () => {
    if (!isCancelling) {
      setShowCancelDialog(false);
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const totalItems = getTotalItems(order);

  return (
    <>
      <Card
        className={cn(
          "group relative overflow-hidden border-zinc-800/50 transition-all duration-300",
          "bg-gradient-to-br from-zinc-900/95 to-zinc-950/95",
          "hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/10",
          "backdrop-blur-sm",
          "animate-in fade-in-50 slide-in-from-bottom-4 duration-500",
          className
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <CardTitle className="text-lg font-semibold">
                <span className="sr-only">Order number</span>
                {order.orderNumber}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 text-sm">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                <time dateTime={order.createdAt.toISOString()}>
                  {formatDate(order.createdAt)}
                </time>
              </CardDescription>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "shrink-0 border-amber-500/30 bg-amber-500/10 text-amber-500 transition-all duration-300",
                "hover:bg-amber-500/20 hover:shadow-lg hover:shadow-amber-500/20",
                "animate-pulse"
              )}
            >
              <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
              Pending
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pb-3">
          {/* Order Summary */}
          <div className={cn(
            "flex items-center justify-between rounded-lg p-3 transition-all duration-300",
            "border border-zinc-800/50 bg-gradient-to-r from-zinc-800/30 to-zinc-900/30",
            "group-hover:border-emerald-500/20 group-hover:bg-gradient-to-r group-hover:from-zinc-800/40 group-hover:to-zinc-900/40"
          )}>
            <div className="flex items-center gap-2">
              <ShoppingBag
                className="h-4 w-4 text-emerald-500"
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-zinc-200">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </span>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-zinc-100">
                {formatCurrency(order.total)}
              </p>
              <p className="text-xs text-zinc-400">
                incl. {formatCurrency(order.tax)} tax
              </p>
            </div>
          </div>

          {/* Expiration Timer */}
          <div className={cn(
            "flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 p-3",
            "transition-all duration-300 group-hover:border-amber-500/30 group-hover:bg-amber-500/10"
          )}>
            <span className="text-sm font-medium text-amber-500">Expires in:</span>
            <ExpirationTimer expiresAt={order.expiresAt} />
          </div>

          {/* Order Items - Collapsible */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={toggleExpand}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                "border border-zinc-800/50 bg-zinc-800/20 hover:border-zinc-700 hover:bg-zinc-800/40",
                "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950"
              )}
              aria-expanded={isExpanded}
              aria-controls={`order-items-${order.id}`}
            >
              <span className="flex items-center gap-2 text-zinc-200">
                <Package className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                Order Details
              </span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              )}
            </button>

            {isExpanded && (
              <div
                id={`order-items-${order.id}`}
                className={cn(
                  "space-y-2 rounded-lg border border-zinc-800/50 bg-zinc-900/50 p-3",
                  "animate-in fade-in-50 slide-in-from-top-2 duration-300"
                )}
              >
                {order.items.map((item, index) => (
                  <div key={index}>
                    {index > 0 && <Separator className="my-2" />}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-tight">
                          {item.productName}
                        </p>
                        {item.productSku && (
                          <p className="text-xs text-muted-foreground">
                            SKU: {item.productSku}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity} × {formatCurrency(item.price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatCurrency(item.subtotal)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                <Separator className="my-3" />

                {/* Order Totals */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tax (15%)</span>
                    <span>{formatCurrency(order.tax)}</span>
                  </div>
                  <Separator className="my-1.5" />
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className={cn(
          "flex-col gap-2 border-t border-zinc-800/50 bg-zinc-900/30 pt-4 sm:flex-row",
          "backdrop-blur-sm"
        )}>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleCancelClick}
            className={cn(
              "w-full gap-2 transition-all duration-200 sm:w-auto",
              "hover:shadow-lg hover:shadow-red-500/20"
            )}
            aria-label={`Cancel order ${order.orderNumber}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Cancel Order
          </Button>
        </CardFooter>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={handleCancelDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle
                className="h-6 w-6 text-destructive"
                aria-hidden="true"
              />
            </div>
            <DialogTitle className="text-center">Cancel Order?</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to cancel order{" "}
              <span className="font-semibold text-foreground">
                {order.orderNumber}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Items</span>
                <span className="font-medium">
                  {totalItems} {totalItems === 1 ? "item" : "items"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={isCancelling}
              className="w-full gap-2 sm:w-auto"
            >
              {isCancelling ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Cancelling...
                </>
              ) : (
                <>
                  <X className="h-4 w-4" aria-hidden="true" />
                  Yes, Cancel Order
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelDialogClose}
              disabled={isCancelling}
              className="w-full sm:w-auto"
            >
              Keep Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
