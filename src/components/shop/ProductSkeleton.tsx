import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

interface ProductSkeletonProps {
  count?: number;
}

export function ProductSkeleton({ count = 1 }: ProductSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={index}
          className="overflow-hidden border-zinc-800 bg-zinc-900/50 backdrop-blur-sm"
        >
          <CardHeader className="p-0">
            <Skeleton className="h-48 w-full rounded-t-lg bg-zinc-800" />
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {/* Category Badge */}
            <Skeleton className="h-5 w-20 rounded-full bg-zinc-800" />

            {/* Product Name */}
            <Skeleton className="h-6 w-3/4 bg-zinc-800" />

            {/* Description */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full bg-zinc-800" />
              <Skeleton className="h-4 w-5/6 bg-zinc-800" />
            </div>

            {/* Attributes */}
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-md bg-zinc-800" />
              <Skeleton className="h-6 w-20 rounded-md bg-zinc-800" />
              <Skeleton className="h-6 w-14 rounded-md bg-zinc-800" />
            </div>
          </CardContent>

          <CardFooter className="p-4 pt-0 space-y-3">
            {/* Price */}
            <Skeleton className="h-8 w-32 bg-zinc-800" />

            {/* Button */}
            <Skeleton className="h-10 w-full bg-zinc-800" />
          </CardFooter>
        </Card>
      ))}
    </>
  );
}

export function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <ProductSkeleton count={8} />
    </div>
  );
}