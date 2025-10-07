'use client';

import { useState } from 'react';
import { PendingOrder } from '@/app/actions/pos';
import { PendingOrderCard } from './PendingOrderCard';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Package } from 'lucide-react';

interface PendingOrdersListProps {
  subscriberId: string;
  subscriberName: string;
  subscriberMobile: string;
  onClose: () => void;
  onOrderLoaded?: () => void;
  className?: string;
}

export function PendingOrdersList({
  subscriberId,
  subscriberName,
  subscriberMobile,
  onClose,
  onOrderLoaded,
  className
}: PendingOrdersListProps) {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch pending orders on mount
  useState(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        const { getPendingOrdersBySubscriber } = await import('@/app/actions/pos');
        const result = await getPendingOrdersBySubscriber(subscriberId);

        if (result.success) {
          setOrders(result.orders);
        } else {
          setError(result.message || 'Failed to load orders');
        }
      } catch (err) {
        console.error('Error fetching pending orders:', err);
        setError('An error occurred while loading orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  });

  const handleOrderLoaded = (orderId: string) => {
    // Remove the loaded order from the list
    setOrders(prev => prev.filter(order => order.id !== orderId));

    // Notify parent component
    if (onOrderLoaded) {
      onOrderLoaded();
    }
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="border-b border-slate-700 p-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-amber-500" />
          Pending Orders
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {subscriberName} • {subscriberMobile}
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          <span className="ml-3 text-slate-400">Loading orders...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-4">
          <div className="bg-red-950/50 border border-red-800 rounded-lg p-4 text-center">
            <p className="text-red-400">{error}</p>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && orders.length === 0 && (
        <div className="p-8 text-center">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-1">No pending orders</p>
          <p className="text-sm text-slate-500">
            This customer has no orders waiting for pickup
          </p>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="mt-6"
          >
            Close
          </Button>
        </div>
      )}

      {/* Orders List */}
      {!loading && !error && orders.length > 0 && (
        <>
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="p-4 space-y-4">
              {orders.map((order) => (
                <PendingOrderCard
                  key={order.id}
                  order={order}
                  onOrderLoaded={handleOrderLoaded}
                />
              ))}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-slate-700 p-4 bg-slate-900/50">
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              Close
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
