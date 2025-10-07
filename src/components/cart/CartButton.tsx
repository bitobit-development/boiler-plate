"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";

interface CartButtonProps {
  itemCount: number;
  onClick: () => void;
  loading?: boolean;
  className?: string;
}

export const CartButton = ({
  itemCount,
  onClick,
  loading = false,
  className,
}: CartButtonProps) => {
  return (
    <Button
      onClick={onClick}
      disabled={loading}
      aria-label={`Shopping cart with ${itemCount} item${itemCount !== 1 ? 's' : ''}`}
      className={cn(
        "fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg",
        "bg-emerald-600 hover:bg-emerald-500 text-white",
        "transition-all duration-200 hover:scale-110",
        "md:bottom-8 md:right-8 md:h-16 md:w-16",
        "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2",
        loading && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <ShoppingCart className="h-6 w-6 md:h-7 md:w-7" aria-hidden="true" />

      {/* Item count badge */}
      {itemCount > 0 && (
        <Badge
          aria-label={`${itemCount} items in cart`}
          className={cn(
            "absolute -top-2 -right-2 h-6 w-6 rounded-full p-0",
            "flex items-center justify-center",
            "bg-red-500 text-white border-2 border-white",
            "text-xs font-bold",
            "shadow-md",
            "animate-in zoom-in-50 duration-200"
          )}
        >
          {itemCount > 99 ? '99+' : itemCount}
        </Badge>
      )}
    </Button>
  );
};
