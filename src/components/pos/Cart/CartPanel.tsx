'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useCart } from '../CartContext';
import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';
import { EmptyCart } from './EmptyCart';
import { ShoppingCart, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CartPanelProps {
  customerSection: React.ReactNode;
  checkoutSection: React.ReactNode;
  className?: string;
}

export function CartPanel({ customerSection, checkoutSection, className }: CartPanelProps) {
  const { items, subtotal, tax, total, itemCount, updateQuantity, removeItem } = useCart();

  return (
    <div className={cn('pos-cart-panel flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-green-400" />
            Shopping Cart
          </h2>
          {itemCount > 0 && (
            <Badge className="bg-green-950/50 text-green-400 border-green-800">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Badge>
          )}
        </div>
      </div>

      {/* Customer Verification Section */}
      <div className="p-4 border-b border-slate-700 bg-slate-800/30">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-medium text-slate-300">Customer Verification</h3>
        </div>
        {customerSection}
      </div>

      {/* Cart Items - Scrollable with overflow hidden */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pos-scrollbar">
          <div className="p-4 space-y-3">
            {items.length === 0 ? (
              <EmptyCart />
            ) : (
              items.map((item) => (
                <CartItem
                  key={item.product.id}
                  item={item}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeItem}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Summary & Checkout */}
      {items.length > 0 && (
        <div className="border-t border-slate-700 p-4 space-y-4">
          <CartSummary subtotal={subtotal} tax={tax} total={total} />
          <Separator className="bg-slate-700" />
          {checkoutSection}
        </div>
      )}
    </div>
  );
}