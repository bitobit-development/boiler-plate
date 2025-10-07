"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, Loader2 } from "lucide-react";
import type { CartItem as CartItemType } from "@/lib/db/schema";

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (productId: string, quantity: number) => Promise<void>;
  onRemove: (productId: string) => Promise<void>;
  loading?: boolean;
  className?: string;
}

export const CartItem = ({
  item,
  onUpdateQuantity,
  onRemove,
  loading = false,
  className,
}: CartItemProps) => {
  const [localLoading, setLocalLoading] = useState(false);

  const handleIncrement = async () => {
    if (loading || localLoading) return;
    setLocalLoading(true);
    try {
      await onUpdateQuantity(item.productId, item.quantity + 1);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDecrement = async () => {
    if (loading || localLoading || item.quantity <= 1) return;
    setLocalLoading(true);
    try {
      await onUpdateQuantity(item.productId, item.quantity - 1);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleRemove = async () => {
    if (loading || localLoading) return;
    setLocalLoading(true);
    try {
      await onRemove(item.productId);
    } finally {
      setLocalLoading(false);
    }
  };

  const isLoading = loading || localLoading;

  return (
    <div
      className={cn(
        "flex gap-3 py-4 border-b border-zinc-200 last:border-0",
        "transition-opacity duration-200",
        isLoading && "opacity-50",
        className
      )}
      role="listitem"
      aria-label={`${item.productName}, quantity ${item.quantity}`}
    >
      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-zinc-900 line-clamp-2 mb-1">
          {item.productName}
        </h4>

        {item.productSku && (
          <p className="text-xs text-zinc-500 mb-2">
            SKU: {item.productSku}
          </p>
        )}

        <p className="text-sm font-semibold text-emerald-600">
          R{(item.price / 100).toFixed(2)}
        </p>
      </div>

      {/* Quantity Controls */}
      <div className="flex flex-col items-end gap-2">
        <div
          className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1"
          role="group"
          aria-label="Quantity controls"
        >
          <Button
            onClick={handleDecrement}
            disabled={isLoading || item.quantity <= 1}
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 hover:bg-zinc-200"
            aria-label="Decrease quantity"
          >
            <Minus className="h-3 w-3" aria-hidden="true" />
          </Button>

          <span
            className="w-8 text-center text-sm font-medium text-zinc-900"
            aria-label={`Quantity: ${item.quantity}`}
          >
            {item.quantity}
          </span>

          <Button
            onClick={handleIncrement}
            disabled={isLoading}
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 hover:bg-zinc-200"
            aria-label="Increase quantity"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-3 w-3" aria-hidden="true" />
            )}
          </Button>
        </div>

        {/* Remove Button */}
        <Button
          onClick={handleRemove}
          disabled={isLoading}
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
          aria-label={`Remove ${item.productName} from cart`}
        >
          <Trash2 className="h-3 w-3 mr-1" aria-hidden="true" />
          Remove
        </Button>

        {/* Item Subtotal */}
        <p className="text-xs font-medium text-zinc-600">
          R{(item.subtotal / 100).toFixed(2)}
        </p>
      </div>
    </div>
  );
};
