"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

interface PriceDisplayProps {
  price: number | null;
  comparePrice?: number | null;
  isMember?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  showCurrency?: boolean;
  className?: string;
}

export function PriceDisplay({
  price,
  comparePrice,
  isMember = false,
  size = "md",
  showCurrency = true,
  className,
}: PriceDisplayProps) {
  // Format price in Rands
  const formatPrice = (amount: number) => {
    const formatted = new Intl.NumberFormat("en-ZA", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

    return showCurrency ? `R${formatted}` : formatted;
  };

  // Size classes
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
  };

  const priceSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  // If not a member, show locked state
  if (!isMember || price === null) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-lg backdrop-blur-sm">
          <Lock className="h-3.5 w-3.5 text-amber-500" />
          <span className={cn("font-medium text-zinc-400", sizeClasses[size])}>
            Members Only
          </span>
        </div>
      </div>
    );
  }

  // Member can see prices
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {comparePrice && comparePrice > price && (
        <span
          className={cn(
            "text-zinc-500 line-through",
            sizeClasses[size]
          )}
        >
          {formatPrice(comparePrice)}
        </span>
      )}
      <span
        className={cn(
          "font-bold text-white",
          priceSizeClasses[size],
          comparePrice && comparePrice > price && "text-emerald-500"
        )}
      >
        {formatPrice(price)}
      </span>
      {comparePrice && comparePrice > price && (
        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-xs font-semibold rounded-full border border-emerald-500/20">
          {Math.round(((comparePrice - price) / comparePrice) * 100)}% OFF
        </span>
      )}
    </div>
  );
}