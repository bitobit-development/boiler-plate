'use client';

import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface CartSummaryProps {
  subtotal: number;
  tax: number;
  total: number;
  className?: string;
}

export function CartSummary({ subtotal, tax, total, className }: CartSummaryProps) {
  return (
    <div className={cn('space-y-3 p-4 bg-slate-800/30 rounded-lg', className)}>
      {/* Subtotal */}
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Subtotal</span>
        <span className="text-white font-medium">R{(subtotal / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>

      {/* Tax */}
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">VAT (15%)</span>
        <span className="text-white font-medium">R{(tax / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>

      <Separator className="bg-slate-700" />

      {/* Total */}
      <div className="flex justify-between items-center">
        <span className="text-lg font-semibold text-white">Total</span>
        <span className="text-2xl font-bold text-green-400">
          R{(total / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}