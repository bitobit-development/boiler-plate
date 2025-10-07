"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface CartSkeletonProps {
  itemCount?: number;
  className?: string;
}

export const CartSkeleton = ({ itemCount = 3, className }: CartSkeletonProps) => {
  return (
    <div className={cn("space-y-4", className)} role="status" aria-label="Loading cart">
      {/* Cart Items Skeleton */}
      {Array.from({ length: itemCount }).map((_, index) => (
        <div key={index} className="flex gap-3 py-4 border-b border-zinc-200">
          {/* Product Info */}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>

          {/* Quantity Controls */}
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-7 w-24 rounded-lg" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}

      {/* Summary Skeleton */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-px w-full" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>

      {/* Checkout Button Skeleton */}
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  );
};
