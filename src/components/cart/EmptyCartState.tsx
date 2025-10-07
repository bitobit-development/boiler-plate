"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ShoppingCart, Sparkles } from "lucide-react";

interface EmptyCartStateProps {
  className?: string;
}

export const EmptyCartState = ({ className }: EmptyCartStateProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
      role="status"
      aria-label="Empty cart"
    >
      <div className="relative mb-4">
        <ShoppingCart
          className="h-20 w-20 text-zinc-300"
          aria-hidden="true"
        />
        <Sparkles
          className="absolute -top-2 -right-2 h-8 w-8 text-amber-400 animate-pulse"
          aria-hidden="true"
        />
      </div>

      <h3 className="text-lg font-semibold text-zinc-900 mb-2">
        Your cart is empty
      </h3>

      <p className="text-sm text-zinc-500 max-w-xs">
        Browse our specials and add your favorite products to get started!
      </p>
    </div>
  );
};
