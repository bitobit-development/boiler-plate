"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CategoryFilter } from "./CategoryFilter";
import type { ProductCategory } from "@/types/products";

interface CategoryFilterWrapperProps {
  categories: ProductCategory[];
  productCounts: Record<string, number>;
}

export function CategoryFilterWrapper({
  categories,
  productCounts,
}: CategoryFilterWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get("category") || undefined;

  const handleCategoryChange = (category: string | undefined) => {
    const params = new URLSearchParams(searchParams);
    if (category) {
      params.set("category", category);
    } else {
      params.delete("category");
    }
    router.push(`/specials${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <CategoryFilter
      categories={categories}
      selectedCategory={selectedCategory}
      onCategoryChange={handleCategoryChange}
      productCounts={productCounts}
    />
  );
}