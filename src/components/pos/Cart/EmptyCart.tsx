'use client';

import { ShoppingCart } from 'lucide-react';

export function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
      <ShoppingCart className="w-16 h-16 mb-4 text-slate-600" />
      <p className="text-lg font-medium">Cart is empty</p>
      <p className="text-sm mt-1">Add products to begin checkout</p>
    </div>
  );
}