"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Crown, ArrowDown, Tag, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PriceDisplayProps {
  price: number | null;
  comparePrice?: number | null;
  isMember?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  showCurrency?: boolean;
  onLoginClick?: () => void;
  className?: string;
}

export function PriceDisplay({
  price,
  comparePrice,
  isMember = false,
  size = "md",
  showCurrency = true,
  onLoginClick,
  className,
}: PriceDisplayProps) {
  // Handle login click
  const handleLoginClick = () => {
    if (onLoginClick) {
      onLoginClick();
    }
  };

  // Format price in Rands (convert from cents)
  const formatPrice = (amount: number) => {
    // Convert from cents to rands
    const rands = amount / 100;

    // Use en-US for consistent formatting (uses commas, which is what we want)
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(rands);

    return showCurrency ? `R${formatted}` : formatted;
  };

  // Calculate member price (20% discount for members)
  const getMemberPrice = (regularPrice: number) => {
    return Math.round(regularPrice * 0.8); // 20% off for members
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

  const smallerPriceSizeClasses = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
    xl: "text-2xl",
  };

  // If price is null, show placeholder
  if (price === null) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-lg backdrop-blur-sm">
          <span className={cn("font-medium text-zinc-400", sizeClasses[size])}>
            Price Not Available
          </span>
        </div>
      </div>
    );
  }

  const memberPrice = getMemberPrice(price);
  const savings = price - memberPrice;
  const savingsPercentage = Math.round((savings / price) * 100);

  // Show differentiated pricing for members vs non-members
  if (isMember) {
    // Member view - show member price prominently
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <div className="flex items-center gap-2">
          {/* Member price badge */}
          <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-full border border-emerald-500/30">
            <Crown className="h-3 w-3 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400">Member Price</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Original price (struck through) */}
          <span className={cn("text-zinc-500 line-through", smallerPriceSizeClasses[size])}>
            {formatPrice(price)}
          </span>
          {/* Member price */}
          <span
            className={cn(
              "font-bold text-emerald-500",
              priceSizeClasses[size],
              "drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            )}
          >
            {formatPrice(memberPrice)}
          </span>
          {/* Savings badge */}
          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-xs font-semibold rounded-full border border-emerald-500/20">
            Save {savingsPercentage}%
          </span>
        </div>
      </div>
    );
  } else {
    // Non-member view - hide prices, show login prompt
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {/* Login prompt button */}
        <Button
          onClick={handleLoginClick}
          variant="outline"
          className={cn(
            "w-full border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-yellow-500/10",
            "hover:from-amber-500/20 hover:to-yellow-500/20",
            "text-amber-400 hover:text-amber-300",
            "transition-all duration-200"
          )}
        >
          <Lock className="h-4 w-4 mr-2" />
          Login to See Price
        </Button>

        {/* Teaser text */}
        <p className="text-xs text-center text-zinc-400">
          Members save <span className="text-amber-400 font-semibold">20%</span> on all products
        </p>
      </div>
    );
  }
}