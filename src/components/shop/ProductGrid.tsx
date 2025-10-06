"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ProductCard } from "./ProductCard";
import { ProductSkeleton } from "./ProductSkeleton";
import type { ProductWithCategory } from "@/types/products";
import { Package } from "lucide-react";

interface ProductGridProps {
  products: ProductWithCategory[];
  isMember?: boolean;
  loading?: boolean;
  onAddToCart?: (product: ProductWithCategory) => void;
  className?: string;
  showCategoryHeaders?: boolean;
}

interface GroupedProducts {
  [category: string]: ProductWithCategory[];
}

export function ProductGrid({
  products,
  isMember = false,
  loading = false,
  onAddToCart,
  className,
  showCategoryHeaders = true,
}: ProductGridProps) {
  // Group products by category
  const groupedProducts = React.useMemo(() => {
    if (!showCategoryHeaders) return { "All Products": products };

    return products.reduce<GroupedProducts>((acc, product) => {
      const categoryName = product.category?.name || "Other";
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(product);
      return acc;
    }, {});
  }, [products, showCategoryHeaders]);

  // Sort categories by priority
  const categoryOrder = ["Pre-rolls", "Dabs", "Edibles", "THC Vapes", "Flower", "Concentrates", "Other"];
  const sortedCategories = Object.keys(groupedProducts).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  if (loading) {
    return (
      <div className={cn("space-y-12", className)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <ProductSkeleton count={8} />
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-16 px-4", className)}>
        <Package className="h-16 w-16 text-zinc-600 mb-4" />
        <h3 className="text-xl font-semibold text-zinc-300 mb-2">No Products Available</h3>
        <p className="text-zinc-400 text-center max-w-md">
          We're currently updating our inventory. Please check back soon for amazing cannabis products.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-12", className)}>
      {sortedCategories.map((category) => {
        const categoryProducts = groupedProducts[category];
        if (!categoryProducts || categoryProducts.length === 0) return null;

        // Create a slug from category name for use as ID
        const categorySlug = category.toLowerCase().replace(/\s+/g, "-");

        return (
          <section
            key={category}
            id={`category-${categorySlug}`}
            className="space-y-6 scroll-mt-24"
          >
            {showCategoryHeaders && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white">{category}</h2>
                  <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-sm rounded-full">
                    {categoryProducts.length} {categoryProducts.length === 1 ? "product" : "products"}
                  </span>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent ml-6" />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {categoryProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isMember={isMember}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function SimpleProductGrid({
  products,
  isMember = false,
  loading = false,
  onAddToCart,
  className,
}: Omit<ProductGridProps, "showCategoryHeaders">) {
  if (loading) {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6", className)}>
        <ProductSkeleton count={8} />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-16 px-4", className)}>
        <Package className="h-16 w-16 text-zinc-600 mb-4" />
        <h3 className="text-xl font-semibold text-zinc-300 mb-2">No Products Found</h3>
        <p className="text-zinc-400 text-center max-w-md">
          Try adjusting your filters or browse all products to find what you're looking for.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6", className)}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isMember={isMember}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
}