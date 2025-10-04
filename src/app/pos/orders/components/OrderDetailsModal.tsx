'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';
import type { OrderWithRelations } from '../page';
import { User, Phone, CreditCard, Clock, Store, AlertCircle } from 'lucide-react';

interface OrderDetailsModalProps {
  order: OrderWithRelations;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderDetailsModal({ order, isOpen, onClose }: OrderDetailsModalProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'fulfilled':
        return 'success';
      case 'cancelled':
        return 'destructive';
      case 'draft':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPaymentStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'refunded':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Order Details - {order.orderNumber}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 mt-2">
            <Badge variant={getStatusVariant(order.status)}>
              {order.status}
            </Badge>
            <Badge variant={getPaymentStatusVariant(order.paymentStatus)}>
              Payment: {order.paymentStatus}
            </Badge>
            {order.wasOtpOverridden && (
              <Badge variant="warning">OTP Override</Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Customer Information */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <p className="font-medium">{order.customerName || 'Guest Customer'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Mobile:</span>
                <p className="font-medium flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {order.customerMobile || 'N/A'}
                </p>
              </div>
              {order.subscriber && (
                <>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{order.subscriber.email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Verification:</span>
                    <Badge variant={order.subscriber.mobileVerified ? 'success' : 'warning'}>
                      {order.subscriber.mobileVerified ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Order Items */}
          <div className="space-y-3">
            <h3 className="font-semibold">Order Items</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
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
                          <div className="text-xs text-muted-foreground">
                            SKU: {item.productSku}
                          </div>
                        )}
                        {item.metadata?.strain && (
                          <div className="text-xs text-muted-foreground">
                            Strain: {item.metadata.strain}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.price)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.subtotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Separator />

          {/* Financial Summary */}
          <div className="space-y-3">
            <h3 className="font-semibold">Payment Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax:</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="text-red-600">-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total:</span>
                <span className="text-lg">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment & Processing Information */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Details
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Method:</span>
                  <p className="font-medium capitalize">
                    {order.paymentMethod || 'N/A'}
                  </p>
                </div>
                {order.paymentReference && (
                  <div>
                    <span className="text-muted-foreground">Reference:</span>
                    <p className="font-medium">{order.paymentReference}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Store className="h-4 w-4" />
                Processing Info
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Cashier:</span>
                  <p className="font-medium">{order.shopUserName}</p>
                </div>
                {order.kioskId && (
                  <div>
                    <span className="text-muted-foreground">Kiosk ID:</span>
                    <p className="font-medium">{order.kioskId}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Timestamps */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timestamps
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Created:</span>
                <p className="font-medium">{formatDateTime(order.createdAt)}</p>
              </div>
              {order.completedAt && (
                <div>
                  <span className="text-muted-foreground">Completed:</span>
                  <p className="font-medium">{formatDateTime(order.completedAt)}</p>
                </div>
              )}
              {order.cancelledAt && (
                <div>
                  <span className="text-muted-foreground">Cancelled:</span>
                  <p className="font-medium">{formatDateTime(order.cancelledAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* OTP Override Information */}
          {order.wasOtpOverridden && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  OTP Override Information
                </h3>
                <div className="space-y-2 text-sm bg-amber-50 p-3 rounded-lg">
                  <div>
                    <span className="text-muted-foreground">Reason:</span>
                    <p className="font-medium">{order.overrideReason || 'Not specified'}</p>
                  </div>
                  {order.overrideExplanation && (
                    <div>
                      <span className="text-muted-foreground">Explanation:</span>
                      <p className="font-medium">{order.overrideExplanation}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {(order.notes || order.customerNotes) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold">Notes</h3>
                {order.notes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Internal Notes:</span>
                    <p className="mt-1">{order.notes}</p>
                  </div>
                )}
                {order.customerNotes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Customer Notes:</span>
                    <p className="mt-1">{order.customerNotes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}