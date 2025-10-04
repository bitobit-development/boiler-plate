'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ShoppingBag, Lock } from 'lucide-react';

interface CheckoutButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  customerVerified?: boolean;
  className?: string;
}

export function CheckoutButton({
  onClick,
  disabled = false,
  loading = false,
  customerVerified = false,
  className
}: CheckoutButtonProps) {
  const isDisabled = disabled || !customerVerified || loading;

  return (
    <Button
      onClick={onClick}
      disabled={isDisabled}
      size="lg"
      className={cn(
        'w-full pos-button h-14 text-lg font-semibold',
        customerVerified
          ? 'bg-green-600 hover:bg-green-700 text-white'
          : 'bg-slate-700 text-slate-400 cursor-not-allowed',
        className
      )}
    >
      {!customerVerified ? (
        <>
          <Lock className="w-5 h-5 mr-2" />
          Verify Customer First
        </>
      ) : loading ? (
        'Processing...'
      ) : (
        <>
          <ShoppingBag className="w-5 h-5 mr-2" />
          Process Payment
        </>
      )}
    </Button>
  );
}