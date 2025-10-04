'use client';

import { OrderWithRelations } from '@/app/pos/orders/page';
import { formatCurrency, formatDateTime, formatPhone } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle2, Printer, User, Phone, CreditCard, Store, Shield } from 'lucide-react';

interface OrderDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderWithRelations | null;
}

export function OrderDetailsModal({
  open,
  onOpenChange,
  order,
}: OrderDetailsModalProps) {
  if (!order) return null;

  const getStatusVariant = (status: string): 'default' | 'destructive' | 'secondary' => {
    switch (status) {
      case 'confirmed':
      case 'fulfilled':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getPaymentVariant = (method: string): 'default' | 'secondary' | 'outline' => {
    switch (method) {
      case 'cash':
        return 'default';
      case 'card':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Order #{order.orderNumber}</span>
            <Badge variant={getStatusVariant(order.status)}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {formatDateTime(order.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Customer Information
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {order.customerName || order.subscriber?.name || 'Walk-in Customer'}
                  </p>
                  {order.subscriber && (
                    <p className="text-sm text-muted-foreground">
                      {order.subscriber.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {formatPhone(order.customerMobile || order.subscriber?.mobile || 'No mobile')}
                  </p>
                  {order.subscriber?.mobileVerified && (
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-green-600">Verified</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Order Items */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Order Items
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.productName}</div>
                        {item.productSku && (
                          <div className="text-sm text-muted-foreground">
                            SKU: {item.productSku}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.subtotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>Subtotal</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(order.subtotal)}
                  </TableCell>
                </TableRow>
                {order.discount > 0 && (
                  <TableRow>
                    <TableCell colSpan={3}>Discount</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      -{formatCurrency(order.discount)}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell colSpan={3}>VAT (15%)</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(order.tax)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} className="font-semibold">
                    Total
                  </TableCell>
                  <TableCell className="text-right text-lg font-bold">
                    {formatCurrency(order.total)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          <Separator />

          {/* Payment & Shop Information */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Payment Information
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Method:</span>
                    {order.paymentMethod ? (
                      <Badge variant={getPaymentVariant(order.paymentMethod)}>
                        {order.paymentMethod.toUpperCase()}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not specified</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Status:</span>
                    <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                      {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Shop Information
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm">
                      {order.shopUser?.firstName && order.shopUser?.lastName
                        ? `${order.shopUser.firstName} ${order.shopUser.lastName}`
                        : order.shopUser?.email || order.shopUserName || 'Unknown'}
                    </p>
                  </div>
                </div>
                {order.kioskId && (
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4" />
                    <p className="text-sm text-muted-foreground">
                      Kiosk ID: {order.kioskId}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* OTP Override Information */}
          {order.wasOtpOverridden && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-yellow-500" />
                  <h3 className="text-sm font-semibold text-yellow-600 uppercase tracking-wider">
                    OTP Override Applied
                  </h3>
                </div>
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium text-yellow-800">
                        Reason: {order.overrideReason || 'Not specified'}
                      </p>
                      {order.overrideExplanation && (
                        <p className="text-sm text-yellow-700">
                          Explanation: {order.overrideExplanation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {(order.notes || order.customerNotes) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Notes
                </h3>
                {order.customerNotes && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Customer Notes:</p>
                    <p className="text-sm text-muted-foreground">{order.customerNotes}</p>
                  </div>
                )}
                {order.notes && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Internal Notes:</p>
                    <p className="text-sm text-muted-foreground">{order.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
          <Button
            variant="default"
            onClick={() => {
              // Reprint receipt functionality to be implemented
              console.log('Reprint receipt for order:', order.orderNumber);
            }}
            className="w-full sm:w-auto"
          >
            <Printer className="mr-2 h-4 w-4" />
            Reprint Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}