"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PriceDisplay } from "./PriceDisplay";
import { MemberLoginModal } from "./MemberLoginModal";
import {
  ShoppingCart,
  Crown,
  Sparkles,
  Loader2,
  ArrowDown,
} from "lucide-react";
import {
  getProductIcon,
  getProductTypeLabel,
  getStrainType,
  getStrainTypeLabel,
  strainIcons,
  typeColors,
  strainColors,
  getAnimationClasses,
  getIconSize,
} from "@/lib/product-icons";
import type { ProductWithCategory } from "@/types/products";

interface ProductCardProps {
  product: ProductWithCategory;
  isMember?: boolean;
  onAddToCart?: (product: ProductWithCategory) => void;
  className?: string;
}

export function ProductCard({
  product,
  isMember = false,
  onAddToCart,
  className,
}: ProductCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const router = useRouter();
  const isInStock = product.quantity > 0;
  const categoryName = product.category?.name || "Cannabis";

  // Get dynamic icon based on product type and ID
  const ProductIcon = getProductIcon(product.productType, product.id);
  const productTypeColor = typeColors[product.productType] || typeColors.accessory;

  // Get strain information if available
  const strainType = product.strain ? getStrainType(product.strain) : null;
  const StrainIcon = strainType ? strainIcons[strainType] : null;
  const strainColor = strainType ? strainColors[strainType] : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onAddToCart && isMember && isInStock) {
      onAddToCart(product);
    }
  };

  const handleSubscribeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);
    router.push("/subscribe");
  };

  return (
    <TooltipProvider>
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
          {product.imageUrl ? (
            <>
              {/* Product Image */}
              <img
                src={product.imageUrl}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Gradient overlay for better badge visibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
            </>
          ) : (
            <>
              {/* Fallback gradient background with product type colors */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-30",
                productTypeColor.gradient
              )} />
              {/* Large Product Type Icon as background */}
              <div className="absolute inset-0 flex items-center justify-center">
                <ProductIcon className={cn("w-24 h-24 opacity-10", productTypeColor.text)} />
              </div>
            </>
          )}

          {/* Enhanced Product Type Icon Badge with Tooltip */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "absolute top-4 left-4 p-2.5 rounded-xl z-10 transition-all duration-200",
                "bg-gradient-to-br backdrop-blur-sm border border-white/10",
                productTypeColor.gradient,
                "shadow-lg",
                productTypeColor.shadow,
                "group-hover:scale-110 group-hover:rotate-3",
                getAnimationClasses(product.isNew, product.isFeatured)
              )}>
                <ProductIcon
                  className={cn(
                    "text-white",
                    getIconSize("badge")
                  )}
                  aria-label={`${getProductTypeLabel(product.productType)} product`}
                />
                {/* Strain indicator (small secondary icon) */}
                {StrainIcon && strainColor && (
                  <StrainIcon
                    className="w-3 h-3 text-white/80 absolute -bottom-1 -right-1 bg-black/50 rounded-full p-0.5"
                    aria-label={getStrainTypeLabel(product.strain || "")}
                  />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-medium">{getProductTypeLabel(product.productType)}</p>
                {product.strain && (
                  <p className="text-xs text-muted-foreground">
                    {getStrainTypeLabel(product.strain)}
                  </p>
                )}
                {product.potency && (
                  <p className="text-xs text-muted-foreground">
                    Potency: {product.potency}
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Status Badges with enhanced styling */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            {product.isNew && (
              <Badge className={cn(
                "bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0",
                "shadow-lg shadow-emerald-500/30",
                "animate-pulse"
              )}>
                <Sparkles className="h-3 w-3 mr-1" />
                New
              </Badge>
            )}
            {product.isFeatured && (
              <Badge className={cn(
                "bg-gradient-to-r from-amber-500 to-yellow-600 text-white border-0",
                "shadow-lg shadow-amber-500/30",
                "shadow-[0_0_15px_rgba(251,191,36,0.5)]"
              )}>
                <Crown className="h-3 w-3 mr-1" />
                Featured
              </Badge>
            )}
            {!isInStock && (
              <Badge variant="destructive">Out of Stock</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {/* Badges Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Badge with gradient */}
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-medium text-white border-0",
                "bg-gradient-to-r",
                productTypeColor.gradient,
                "shadow-sm",
                productTypeColor.shadow
              )}
            >
              {categoryName}
            </Badge>

            {/* Member Exclusive Badge */}
            {isMember && (
              <Badge
                variant="outline"
                className="text-xs font-medium bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-400 border-emerald-500/30"
              >
                <Crown className="h-3 w-3 mr-1" />
                Member Exclusive
              </Badge>
            )}

            {/* Savings Badge for high discount items */}
            {product.comparePrice && product.comparePrice > product.price && (
              (() => {
                const savingsPercentage = Math.round(
                  ((product.comparePrice - product.price) / product.comparePrice) * 100
                );
                if (savingsPercentage >= 30) {
                  return (
                    <Badge
                      variant="outline"
                      className="text-xs font-medium bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-400 border-red-500/30 animate-pulse"
                    >
                      <ArrowDown className="h-3 w-3 mr-1" />
                      {savingsPercentage}% OFF
                    </Badge>
                  );
                }
                return null;
              })()
            )}
          </div>

          {/* Product Name */}
          <h3 className="font-semibold text-lg text-white line-clamp-2 min-h-[3.5rem]">
            {product.name}
          </h3>

          {/* Description */}
          {product.shortDescription && (
            <p className="text-sm text-zinc-300 line-clamp-2 min-h-[2.5rem]">
              {product.shortDescription}
            </p>
          )}

          {/* Enhanced Product Attributes with colors */}
          <div className="flex flex-wrap gap-2">
            {product.weight && (
              <Badge variant="secondary" className="text-xs bg-zinc-800 border-zinc-600 text-zinc-200">
                {product.weight}
              </Badge>
            )}
            {product.potency && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="text-xs bg-violet-900/50 border-violet-700 text-violet-200">
                    {product.potency}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">THC/CBD Content</p>
                </TooltipContent>
              </Tooltip>
            )}
            {product.strain && strainColor && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs border transition-all duration-200",
                      "hover:scale-105",
                      "text-white",
                      "bg-gradient-to-r opacity-90",
                      strainColor.gradient
                    )}
                  >
                    <StrainIcon className="w-3 h-3 mr-1" />
                    {product.strain}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{getStrainTypeLabel(product.strain)}</p>
                </TooltipContent>
              </Tooltip>
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
          onLoginClick={() => setLoginModalOpen(true)}
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
          <Button
            onClick={() => setLoginModalOpen(true)}
            className={cn(
              "w-full bg-amber-600 hover:bg-amber-500 text-white transition-all duration-200"
            )}
          >
            Subscribe to Purchase
          </Button>
        )}
        </CardFooter>
      </Card>

      {/* Login Modal */}
      <MemberLoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </TooltipProvider>
  );
}