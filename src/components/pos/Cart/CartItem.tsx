'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Plus, Minus, Trash2, Package2 } from 'lucide-react';
import { CartItem as CartItemType } from '../CartContext';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (productId: string, quantity: number) => Promise<boolean>;
  onRemove: (productId: string) => void;
  className?: string;
}

export function CartItem({ item, onUpdateQuantity, onRemove, className }: CartItemProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { product, quantity } = item;
  const displayPrice = product.memberPrice || product.price;

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity === quantity || isUpdating) return;

    setIsUpdating(true);
    if (newQuantity <= 0) {
      onRemove(product.id);
    } else {
      await onUpdateQuantity(product.id, newQuantity);
    }
    setIsUpdating(false);
  };

  return (
    <div
      className={cn(
        'flex gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700',
        'hover:bg-slate-800/70 transition-colors',
        className
      )}
    >
      {/* Product Image */}
      <div className="relative w-20 h-20 bg-slate-900 rounded-lg overflow-hidden shrink-0">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package2 className="w-8 h-8 text-slate-600" />
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-white text-sm line-clamp-2">
          {product.name}
        </h4>

        {product.brand && (
          <p className="text-xs text-slate-400 mt-1">{product.brand}</p>
        )}

        <div className="flex items-center gap-2 mt-2">
          {/* Quantity Controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={isUpdating || quantity <= 1}
              className="h-7 w-7 p-0 hover:bg-slate-700"
            >
              <Minus className="w-3 h-3 text-slate-400" />
            </Button>

            <span className="w-8 text-center text-sm font-medium text-white">
              {quantity}
            </span>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={isUpdating || quantity >= product.quantity}
              className="h-7 w-7 p-0 hover:bg-slate-700"
            >
              <Plus className="w-3 h-3 text-slate-400" />
            </Button>
          </div>

          <span className="text-slate-500 text-sm">×</span>

          <span className="text-sm text-slate-300">
            R{(displayPrice / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Subtotal & Remove */}
      <div className="flex flex-col items-end justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(product.id)}
          className="h-6 w-6 p-0 hover:bg-red-950/50 text-slate-500 hover:text-red-400"
        >
          <Trash2 className="w-4 h-4" />
        </Button>

        <div className="text-right">
          <p className="text-lg font-semibold text-green-400">
            R{(item.subtotal / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  );
}