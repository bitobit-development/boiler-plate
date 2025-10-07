"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface CartSummaryProps {
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
  className?: string;
}

export const CartSummary = ({
  subtotal,
  tax,
  total,
  itemCount,
  className,
}: CartSummaryProps) => {
  return (
    <div
      className={cn("space-y-3", className)}
      role="region"
      aria-label="Order summary"
    >
      {/* Item Count */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-600">
          Items ({itemCount})
        </span>
        <span className="font-medium text-zinc-900">
          R{(subtotal / 100).toFixed(2)}
        </span>
      </div>

      {/* Tax (15% VAT) */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-600">
          Tax (15% VAT)
        </span>
        <span className="font-medium text-zinc-900">
          R{(tax / 100).toFixed(2)}
        </span>
      </div>

      <Separator className="my-3" />

      {/* Total */}
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-zinc-900">
          Total
        </span>
        <span
          className="text-xl font-bold text-emerald-600"
          aria-label={`Total: R${(total / 100).toFixed(2)}`}
        >
          R{(total / 100).toFixed(2)}
        </span>
      </div>

      {/* Member Pricing Badge */}
      <div className="pt-2">
        <p className="text-xs text-emerald-600 font-medium">
          Member pricing applied
        </p>
      </div>
    </div>
  );
};
