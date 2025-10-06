"use client";

import React, { useCallback, useEffect } from "react";
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

  const scrollToCategory = useCallback((categorySlug: string | undefined) => {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      if (!categorySlug || categorySlug === "all") {
        // Scroll to top for "All Products"
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // Find the matching category name from the slug
      const category = categories.find(c => c.slug === categorySlug);
      if (!category) return;

      // Create the ID that matches the category section
      const categoryId = `category-${category.name.toLowerCase().replace(/\s+/g, "-")}`;
      const element = document.getElementById(categoryId);

      if (element) {
        // Calculate the position with offset for fixed headers
        const yOffset = -100; // Adjust this value based on your header height
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;

        // Use smooth scrolling
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 50);
  }, [categories]);

  // Handle scroll on initial load if category is in URL
  useEffect(() => {
    if (selectedCategory) {
      scrollToCategory(selectedCategory);
    }
  }, []); // Only run once on mount

  const handleCategoryChange = (category: string | undefined) => {
    // Don't update URL params, just scroll
    scrollToCategory(category);

    // Optionally update the URL without navigation (for bookmarking)
    const params = new URLSearchParams(searchParams);
    if (category && category !== "all") {
      params.set("category", category);
    } else {
      params.delete("category");
    }

    // Update URL without causing navigation
    const newUrl = `/specials${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", newUrl);
  };

  return (
    <CategoryFilter
      categories={categories}
      selectedCategory={selectedCategory}
      onCategoryChange={handleCategoryChange}
      productCounts={productCounts}
      scrollMode={true}
    />
  );
}