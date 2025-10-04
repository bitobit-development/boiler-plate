'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Product } from '@/lib/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Plus,
  Minus,
  ShoppingCart,
  Package2,
  Package,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { useCart } from '../CartContext';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { addItem, getItemQuantity } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const currentCartQuantity = getItemQuantity(product.id);

  const handleAddToCart = async () => {
    setIsAdding(true);
    await addItem(product, quantity);
    setQuantity(1); // Reset quantity after adding
    setIsAdding(false);
  };

  // Stock status calculations
  const stockLevel = product.trackQuantity ? product.quantity : 999;
  const isInStock = stockLevel > 0;
  const isLowStock = stockLevel > 0 && stockLevel <= (product.lowStockThreshold || 5);
  const isOutOfStock = stockLevel === 0;
  const canOverride = product.allowBackorder === true;
  const displayPrice = product.price;

  // Determine stock status for color coding
  const getStockStatus = () => {
    if (!product.trackQuantity) return null;
    if (stockLevel === 0) return 'out';
    if (stockLevel <= 4) return 'critical';
    if (stockLevel <= 10) return 'low';
    return 'good';
  };

  const stockStatus = getStockStatus();

  // Stock badge styles based on status
  const stockBadgeStyles = {
    good: 'bg-green-100 text-green-800 border-green-200',
    low: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    critical: 'bg-red-100 text-red-800 border-red-200',
    out: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <TooltipProvider>
      <Card
        className={cn(
          'pos-product-card h-full flex flex-col transition-all duration-200 relative',
          'hover:shadow-lg hover:scale-[1.02]',
          isOutOfStock && !canOverride && 'opacity-60',
          isLowStock && !isOutOfStock && 'animate-pulse-subtle',
          className
        )}
      >
      <CardContent className="p-4 flex flex-col h-full">
        {/* Product Image */}
        <div className="relative aspect-[16/9] mb-3 bg-slate-800 rounded-lg overflow-hidden">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package2 className="w-12 h-12 text-slate-600" />
            </div>
          )}

          {/* Enhanced Stock Badge with Tooltip */}
          {product.trackQuantity && stockStatus && (
            <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={cn(
                      'cursor-help transition-all',
                      stockBadgeStyles[stockStatus],
                      isLowStock && 'animate-pulse'
                    )}
                  >
                    <Package className="w-3 h-3 mr-1" />
                    {stockStatus === 'out' ? (
                      'Out of Stock'
                    ) : (
                      <>Stock: {stockLevel}</>
                    )}
                    {isLowStock && stockStatus !== 'out' && (
                      <AlertTriangle className="w-3 h-3 ml-1" />
                    )}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="left" className="bg-slate-900 text-white border-slate-700">
                  <div className="space-y-1">
                    <p className="font-semibold">Inventory Status</p>
                    <p className="text-sm">Current Stock: {stockLevel} units</p>
                    {isLowStock && (
                      <p className="text-sm text-yellow-400">
                        Low stock threshold: {product.lowStockThreshold || 5} units
                      </p>
                    )}
                    {canOverride && isOutOfStock && (
                      <p className="text-sm text-blue-400">
                        Backorder allowed for this item
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>

              {/* Override Indicator Badge */}
              {canOverride && (
                <Badge
                  variant="outline"
                  className="bg-blue-100 text-blue-800 border-blue-200 text-xs"
                >
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Override OK
                </Badge>
              )}
            </div>
          )}

          {/* Cart Quantity Badge */}
          {currentCartQuantity > 0 && (
            <Badge className="absolute top-2 left-2 bg-green-950/90 text-green-400 border-green-800">
              <ShoppingCart className="w-3 h-3 mr-1" />
              {currentCartQuantity} in cart
            </Badge>
          )}

          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-lg">
              <div className="text-center space-y-2">
                <div className="bg-gray-900/90 px-4 py-2 rounded-lg">
                  <p className="text-lg font-semibold text-gray-200">Out of Stock</p>
                </div>
                {canOverride && (
                  <Badge className="bg-blue-950/90 text-blue-400 border-blue-800">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Override Available
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-white line-clamp-2">
            {product.name}
          </h3>

          {product.supplier && (
            <p className="text-sm text-slate-400">{product.supplier}</p>
          )}

          {/* THC/CBD Content */}
          {(product.thcContent !== null || product.cbdContent !== null) && (
            <div className="flex gap-2">
              {product.thcContent !== null && (
                <Badge variant="outline" className="bg-green-950/50 border-green-800 text-green-400 text-xs">
                  THC: {product.thcContent}%
                </Badge>
              )}
              {product.cbdContent !== null && (
                <Badge variant="outline" className="bg-blue-950/50 border-blue-800 text-blue-400 text-xs">
                  CBD: {product.cbdContent}%
                </Badge>
              )}
            </div>
          )}

          {/* Price */}
          <div className="pt-2">
            <p className="text-2xl font-bold text-green-400">
              R{(displayPrice / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {product.comparePrice && product.comparePrice > product.price && (
              <p className="text-sm text-slate-500 line-through">
                R{(product.comparePrice / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>
        </div>

        {/* Quantity Controls & Add Button */}
        <div className="mt-4 space-y-2">
          {(isInStock || canOverride) && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="h-10 w-10 border-slate-600 bg-slate-800 hover:bg-slate-700 text-white"
              >
                <Minus className="w-4 h-4" />
              </Button>

              <span className="flex-1 text-center text-lg font-semibold text-white">
                {quantity}
              </span>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
                disabled={!canOverride && product.trackQuantity && quantity >= stockLevel}
                className="h-10 w-10 border-slate-600 bg-slate-800 hover:bg-slate-700 text-white"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}

          <Button
            onClick={handleAddToCart}
            disabled={(!isInStock && !canOverride) || isAdding}
            size="lg"
            className={cn(
              'w-full pos-button',
              canOverride && isOutOfStock
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-green-600 hover:bg-green-700',
              'text-white font-semibold',
              'disabled:bg-slate-700 disabled:text-slate-500'
            )}
          >
            {!isInStock && !canOverride ? (
              'Out of Stock'
            ) : isAdding ? (
              'Adding...'
            ) : canOverride && isOutOfStock ? (
              <>
                <ShieldCheck className="w-4 h-4 mr-2" />
                Add with Override
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Add to Cart
              </>
            )}
          </Button>

          {/* Stock Warning Message */}
          {isLowStock && !isOutOfStock && product.trackQuantity && (
            <p className="text-xs text-yellow-500 text-center flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Only {stockLevel} left in stock
            </p>
          )}
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}