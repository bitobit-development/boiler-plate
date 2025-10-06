"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Cannabis,
  Cookie,
  Cigarette,
  Droplet,
  Zap,
  Package,
  Sparkles,
} from "lucide-react";
import type { ProductCategory } from "@/types/products";

interface CategoryFilterProps {
  categories: ProductCategory[];
  selectedCategory?: string;
  onCategoryChange: (category: string | undefined) => void;
  productCounts?: Record<string, number>;
  className?: string;
  scrollMode?: boolean;
}

// Icon mapping for categories
const categoryIcons: Record<string, React.ReactNode> = {
  "all": <Sparkles className="h-4 w-4" />,
  "pre-rolls": <Cigarette className="h-4 w-4" />,
  "dabs": <Droplet className="h-4 w-4" />,
  "edibles": <Cookie className="h-4 w-4" />,
  "thc-vapes": <Zap className="h-4 w-4" />,
  "flower": <Cannabis className="h-4 w-4" />,
  "concentrates": <Droplet className="h-4 w-4" />,
};

export function CategoryFilter({
  categories,
  selectedCategory,
  onCategoryChange,
  productCounts = {},
  className,
}: CategoryFilterProps) {
  // Add "All Products" option
  const allCategories = [
    { id: "all", name: "All Products", slug: undefined },
    ...categories,
  ];

  const handleCategoryChange = (value: string) => {
    if (value === "all") {
      onCategoryChange(undefined);
    } else {
      onCategoryChange(value);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <Tabs
        value={selectedCategory || "all"}
        onValueChange={handleCategoryChange}
        className="w-full"
      >
        <TabsList className="w-full flex-wrap h-auto p-1 bg-zinc-900/50 border border-zinc-800">
          {allCategories.map((category) => {
            const icon = categoryIcons[category.slug || "all"] || <Package className="h-4 w-4" />;
            const count = category.id === "all"
              ? Object.values(productCounts).reduce((sum, count) => sum + count, 0)
              : productCounts[category.slug || ""] || 0;

            return (
              <TabsTrigger
                key={category.id}
                value={category.slug || "all"}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5",
                  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-600 data-[state=active]:to-orange-600",
                  "data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/25",
                  "hover:bg-zinc-800 transition-all duration-200"
                )}
              >
                {icon}
                <span className="font-medium">{category.name}</span>
                {count > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "ml-1 h-5 px-1.5 min-w-[1.25rem] text-xs",
                      selectedCategory === category.slug && "bg-white/20 text-white"
                    )}
                  >
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}

interface SimpleCategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  className?: string;
}

export function SimpleCategoryFilter({
  categories,
  selectedCategory,
  onCategoryChange,
  className,
}: SimpleCategoryFilterProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {categories.map((category) => {
        const isActive = selectedCategory === category;
        const icon = categoryIcons[category.toLowerCase().replace(/\s+/g, "-")] || <Package className="h-4 w-4" />;

        return (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200",
              "border hover:shadow-lg",
              isActive
                ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white border-transparent shadow-lg shadow-amber-500/25"
                : "bg-zinc-900/50 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50"
            )}
          >
            {icon}
            <span>{category}</span>
          </button>
        );
      })}
    </div>
  );
}