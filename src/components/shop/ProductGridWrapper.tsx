"use client";

import React from "react";
import { toast } from "sonner";
import { ProductGrid } from "./ProductGrid";
import type { ProductWithCategory } from "@/types/products";

interface ProductGridWrapperProps {
  products: ProductWithCategory[];
  isMember: boolean;
}

export function ProductGridWrapper({
  products,
  isMember,
}: ProductGridWrapperProps) {
  const handleAddToCart = (product: ProductWithCategory) => {
    // TODO: Implement cart functionality
    console.log("Add to cart:", product);

    // Show success toast
    toast.success(`${product.name} added to cart!`, {
      description: `R${product.price?.toFixed(0) || 0}`,
      duration: 3000,
    });
  };

  return (
    <ProductGrid
      products={products}
      isMember={isMember}
      onAddToCart={handleAddToCart}
      showCategoryHeaders={true}
    />
  );
}