'use client';

import { useState, useEffect } from 'react';
import { Subscriber } from '@/lib/db/schema';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { User, Phone, Mail, CheckCircle2, AlertTriangle, X, Package } from 'lucide-react';
import { PendingOrdersList } from './PendingOrdersList';

interface CustomerCardProps {
  customer: Subscriber;
  isVerified: boolean;
  onActivate?: () => void;
  onRemove?: () => void;
  className?: string;
}

export function CustomerCard({
  customer,
  isVerified,
  onActivate,
  onRemove,
  className
}: CustomerCardProps) {
  const [pendingOrdersOpen, setPendingOrdersOpen] = useState(false);
  const [pendingOrderCount, setPendingOrderCount] = useState<number | null>(null);

  // Fetch pending order count on mount
  useEffect(() => {
    const fetchPendingOrderCount = async () => {
      try {
        const { getPendingOrdersBySubscriber } = await import('@/app/actions/pos');
        const result = await getPendingOrdersBySubscriber(customer.id);

        if (result.success) {
          setPendingOrderCount(result.orders.length);
        }
      } catch (error) {
        console.error('Error fetching pending order count:', error);
      }
    };

    fetchPendingOrderCount();
  }, [customer.id]);

  const hasPendingOrders = pendingOrderCount !== null && pendingOrderCount > 0;

  return (
    <>
      <Card
        className={cn(
          'p-4 bg-slate-800/50 border',
          isVerified ? 'border-green-800' : 'border-yellow-800',
          className
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            {/* Customer Name & Status */}
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-white">
                  {customer.name} {customer.surname}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {isVerified ? (
                    <Badge className="bg-green-950/50 text-green-400 border-green-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-950/50 text-yellow-400 border-yellow-800">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Requires OTP
                    </Badge>
                  )}
                  {hasPendingOrders && (
                    <Badge className="bg-amber-950/50 text-amber-400 border-amber-800">
                      <Package className="w-3 h-3 mr-1" />
                      {pendingOrderCount} Pending Order{pendingOrderCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-1 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Phone className="w-3 h-3" />
                <span>{customer.mobile}</span>
              </div>
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3 h-3" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRemove}
                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Activation Button */}
        {!isVerified && onActivate && (
          <Button
            onClick={onActivate}
            size="sm"
            className="w-full mt-3 bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            <Phone className="w-4 h-4 mr-2" />
            Activate with OTP
          </Button>
        )}

        {/* View Pending Orders Button */}
        {isVerified && hasPendingOrders && (
          <Button
            onClick={() => setPendingOrdersOpen(true)}
            size="sm"
            variant="outline"
            className="w-full mt-3 border-amber-800 text-amber-400 hover:bg-amber-950/50"
          >
            <Package className="w-4 h-4 mr-2" />
            View Pending Orders ({pendingOrderCount})
          </Button>
        )}
      </Card>

      {/* Pending Orders Sheet */}
      <Sheet open={pendingOrdersOpen} onOpenChange={setPendingOrdersOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl bg-slate-900 border-slate-700 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Pending Orders for {customer.name} {customer.surname}</SheetTitle>
          </SheetHeader>
          <PendingOrdersList
            subscriberId={customer.id}
            subscriberName={`${customer.name} ${customer.surname}`}
            subscriberMobile={customer.mobile}
            onClose={() => setPendingOrdersOpen(false)}
            onOrderLoaded={() => {
              setPendingOrdersOpen(false);
              // Refresh pending order count
              setPendingOrderCount(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
            }}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}