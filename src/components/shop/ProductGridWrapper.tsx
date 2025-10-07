"use client";

import React from "react";
import { toast } from "sonner";
import { ProductGrid } from "./ProductGrid";
import { useOnlineCart } from "@/contexts/OnlineCartContext";
import type { ProductWithCategory } from "@/types/products";

interface ProductGridWrapperProps {
  products: ProductWithCategory[];
  isMember: boolean;
}

export function ProductGridWrapper({
  products,
  isMember,
}: ProductGridWrapperProps) {
  const { addToCart } = useOnlineCart();

  const handleAddToCart = async (product: ProductWithCategory) => {
    if (!product.id) {
      return;
    }

    try {
      const success = await addToCart(product.id, 1);

      if (success) {
        // Success toast shown by context
        console.log("Added to cart:", product.name);
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart", {
        description: "Please try again",
      });
    }
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