'use client';

import { useState } from 'react';
import { PendingOrder } from '@/app/actions/pos';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '../CartContext';
import { formatDistanceToNow } from 'date-fns';
import { Package, Clock, ShoppingCart, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PendingOrderCardProps {
  order: PendingOrder;
  onOrderLoaded: (orderId: string) => void;
  className?: string;
}

export function PendingOrderCard({
  order,
  onOrderLoaded,
  className
}: PendingOrderCardProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { loadPendingOrder } = useCart();

  const handleLoadToCart = async () => {
    try {
      setLoading(true);

      // Load the order to POS cart
      const success = await loadPendingOrder(order.id);

      if (success) {
        toast({
          title: 'Order Loaded',
          description: `Order ${order.orderNumber} has been loaded to cart. Proceed to checkout.`,
          variant: 'default'
        });

        // Notify parent that order was loaded
        onOrderLoaded(order.id);
      } else {
        toast({
          title: 'Failed to Load Order',
          description: 'Could not load this order. Please try again.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error loading order to cart:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getExpirationStatus = () => {
    if (!order.expiresAt) return null;

    const now = new Date();
    const expiresAt = new Date(order.expiresAt);
    const hoursRemaining = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursRemaining < 0) {
      return { text: 'Expired', variant: 'destructive' as const, urgent: true };
    } else if (hoursRemaining < 2) {
      return {
        text: `Expires in ${Math.round(hoursRemaining * 60)} min`,
        variant: 'destructive' as const,
        urgent: true
      };
    } else if (hoursRemaining < 12) {
      return {
        text: `Expires in ${Math.round(hoursRemaining)}h`,
        variant: 'secondary' as const,
        urgent: false
      };
    } else {
      return {
        text: formatDistanceToNow(expiresAt, { addSuffix: true }),
        variant: 'outline' as const,
        urgent: false
      };
    }
  };

  const expirationStatus = getExpirationStatus();

  return (
    <Card
      className={cn(
        'p-4 bg-slate-800/50 border-slate-700 hover:bg-slate-800 transition-colors',
        expirationStatus?.urgent && 'border-amber-800',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-white">{order.orderNumber}</h3>
            <Badge variant="outline" className="bg-amber-950/50 text-amber-400 border-amber-800">
              Pending
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Created {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
          </p>
        </div>

        {/* Expiration Badge */}
        {expirationStatus && (
          <Badge
            variant={expirationStatus.variant}
            className={cn(
              'flex items-center gap-1',
              expirationStatus.urgent && 'animate-pulse'
            )}
          >
            <Clock className="w-3 h-3" />
            {expirationStatus.text}
          </Badge>
        )}
      </div>

      {/* Items Summary */}
      <div className="space-y-2 mb-4">
        <div className="text-sm text-slate-300">
          <span className="font-medium">{order.items.length}</span> item(s):
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {order.items.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-sm bg-slate-900/50 rounded px-3 py-2"
            >
              <span className="text-slate-300 flex-1 truncate">
                {item.productName}
              </span>
              <span className="text-slate-400 ml-2">
                x{item.quantity}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Order Total */}
      <div className="border-t border-slate-700 pt-3 mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-slate-400">Subtotal:</span>
          <span className="text-slate-300">R{(order.subtotal / 100).toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-slate-400">Tax (15%):</span>
          <span className="text-slate-300">R{(order.tax / 100).toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between font-semibold">
          <span className="text-white">Total:</span>
          <span className="text-emerald-400 text-lg">R{(order.total / 100).toFixed(2)}</span>
        </div>
      </div>

      {/* Actions */}
      <Button
        onClick={handleLoadToCart}
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <ShoppingCart className="w-4 h-4 mr-2" />
            Load to Cart
          </>
        )}
      </Button>
    </Card>
  );
}
