"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PriceDisplay } from "./PriceDisplay";
import {
  Package,
  Zap,
  Sparkles,
  ShoppingCart,
  Eye,
  Cannabis,
  Cookie,
  Cigarette,
  Droplet,
} from "lucide-react";
import type { ProductWithCategory } from "@/types/products";

interface ProductCardProps {
  product: ProductWithCategory;
  isMember?: boolean;
  onAddToCart?: (product: ProductWithCategory) => void;
  className?: string;
}

// Icon mapping for product types
const productTypeIcons: Record<string, React.ReactNode> = {
  flower: <Cannabis className="h-4 w-4" />,
  "pre_roll": <Cigarette className="h-4 w-4" />,
  edible: <Cookie className="h-4 w-4" />,
  concentrate: <Droplet className="h-4 w-4" />,
  vape: <Zap className="h-4 w-4" />,
  accessory: <Package className="h-4 w-4" />,
};

export function ProductCard({
  product,
  isMember = false,
  onAddToCart,
  className,
}: ProductCardProps) {
  const isInStock = product.quantity > 0;
  const categoryName = product.category?.name || "Cannabis";
  const typeIcon = productTypeIcons[product.productType] || <Package className="h-4 w-4" />;

  // Generate gradient based on category
  const getCategoryGradient = (category: string) => {
    const gradients: Record<string, string> = {
      "Pre-rolls": "from-amber-600 to-orange-600",
      "Dabs": "from-purple-600 to-pink-600",
      "Edibles": "from-green-600 to-emerald-600",
      "THC Vapes": "from-blue-600 to-cyan-600",
      "Flower": "from-lime-600 to-green-600",
      "Concentrates": "from-indigo-600 to-purple-600",
    };
    return gradients[category] || "from-zinc-600 to-zinc-700";
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onAddToCart && isMember && isInStock) {
      onAddToCart(product);
    }
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-zinc-800 bg-zinc-900/50 backdrop-blur-sm transition-all duration-300",
        "hover:border-zinc-700 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-1",
        !isMember && "cursor-pointer",
        className
      )}
    >
      {/* Image/Icon Section */}
      <CardHeader className="relative p-0 h-48 bg-gradient-to-br from-zinc-900 to-zinc-800 overflow-hidden">
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-20",
          getCategoryGradient(categoryName)
        )} />

        {/* Product Type Icon */}
        <div className="absolute top-4 left-4 p-2 bg-black/50 backdrop-blur-sm rounded-lg">
          {typeIcon}
        </div>

        {/* Status Badges */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          {product.isNew && (
            <Badge className="bg-emerald-500/90 text-white border-0">
              <Sparkles className="h-3 w-3 mr-1" />
              New
            </Badge>
          )}
          {product.isFeatured && (
            <Badge className="bg-amber-500/90 text-white border-0">
              <Zap className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          )}
          {!isInStock && (
            <Badge variant="destructive">Out of Stock</Badge>
          )}
        </div>

        {/* Membership Overlay */}
        {!isMember && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="text-center space-y-2">
              <Eye className="h-8 w-8 mx-auto text-amber-500" />
              <p className="text-sm font-medium text-white">Join to View Prices</p>
            </div>
          </div>
        )}

        {/* Product Image Placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-6xl opacity-10">{typeIcon}</div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* Category Badge */}
        <Badge
          variant="outline"
          className={cn(
            "w-fit text-xs font-medium bg-gradient-to-r text-white border-0",
            getCategoryGradient(categoryName),
            "bg-opacity-10"
          )}
        >
          {categoryName}
        </Badge>

        {/* Product Name */}
        <h3 className="font-semibold text-lg text-white line-clamp-2 min-h-[3.5rem]">
          {product.name}
        </h3>

        {/* Description */}
        {product.shortDescription && (
          <p className="text-sm text-zinc-400 line-clamp-2 min-h-[2.5rem]">
            {product.shortDescription}
          </p>
        )}

        {/* Product Attributes */}
        <div className="flex flex-wrap gap-2">
          {product.weight && (
            <Badge variant="secondary" className="text-xs">
              {product.weight}
            </Badge>
          )}
          {product.potency && (
            <Badge variant="secondary" className="text-xs">
              {product.potency}
            </Badge>
          )}
          {product.strain && (
            <Badge variant="secondary" className="text-xs">
              {product.strain}
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex flex-col gap-3">
        {/* Price Display */}
        <PriceDisplay
          price={product.price}
          comparePrice={product.comparePrice}
          isMember={isMember}
          size="md"
          className="w-full"
        />

        {/* Action Button */}
        {isMember ? (
          <Button
            onClick={handleAddToCart}
            disabled={!isInStock}
            className={cn(
              "w-full transition-all duration-200",
              isInStock
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
          >
            {isInStock ? (
              <>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </>
            ) : (
              "Out of Stock"
            )}
          </Button>
        ) : (
          <Link href="/register" className="w-full">
            <Button className="w-full bg-amber-600 hover:bg-amber-500 text-white">
              Join to Purchase
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}