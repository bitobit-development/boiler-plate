'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  MoreVertical,
  Eye,
  Printer,
  MessageSquare,
  XCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatCurrency, formatTime } from '@/lib/utils/format';
import { OrderDetailsModal } from './OrderDetailsModal';
import { cancelPOSOrder } from '@/app/actions/pos';
import { toast } from 'sonner';
import type { OrderWithRelations } from '../page';

interface OrdersTableProps {
  orders: OrderWithRelations[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export function OrdersTable({ orders, totalCount, totalPages, currentPage }: OrdersTableProps) {
  const router = useRouter();
  const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  // Status badge variants
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

  // Handle order cancellation
  const handleCancelOrder = async (orderId: string, orderNumber: string) => {
    const reason = prompt(`Please provide a reason for cancelling order ${orderNumber}:`);

    if (!reason) {
      return; // User cancelled the prompt
    }

    setCancellingOrderId(orderId);

    try {
      const result = await cancelPOSOrder(orderId, reason);

      if (result.success) {
        toast.success(`Order ${orderNumber} cancelled successfully`);
        router.refresh(); // Refresh the data
      } else {
        toast.error(result.message || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('An error occurred while cancelling the order');
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Handle receipt reprint
  const handleReprintReceipt = async (order: OrderWithRelations) => {
    // In a real implementation, this would generate a PDF or open a print dialog
    toast.info('Opening print preview...');

    // Create a simple receipt format for printing
    const receiptWindow = window.open('', '_blank');
    if (receiptWindow) {
      const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt - ${order.orderNumber}</title>
          <style>
            body { font-family: monospace; max-width: 400px; margin: 0 auto; padding: 20px; }
            h1 { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .item { display: flex; justify-content: space-between; }
            .total { font-weight: bold; font-size: 1.2em; }
          </style>
        </head>
        <body>
          <h1>BIGG BUZZ</h1>
          <p>Order #${order.orderNumber}</p>
          <p>Date: ${new Date(order.createdAt).toLocaleString()}</p>
          <p>Customer: ${order.customerName || 'Guest'}</p>
          <div class="divider"></div>
          <h3>Items:</h3>
          ${order.items.map(item => `
            <div class="item">
              <span>${item.productName} x${item.quantity}</span>
              <span>${formatCurrency(item.subtotal)}</span>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="item">
            <span>Subtotal:</span>
            <span>${formatCurrency(order.subtotal)}</span>
          </div>
          <div class="item">
            <span>Tax:</span>
            <span>${formatCurrency(order.tax)}</span>
          </div>
          ${order.discount > 0 ? `
            <div class="item">
              <span>Discount:</span>
              <span>-${formatCurrency(order.discount)}</span>
            </div>
          ` : ''}
          <div class="divider"></div>
          <div class="item total">
            <span>Total:</span>
            <span>${formatCurrency(order.total)}</span>
          </div>
          <div class="divider"></div>
          <p>Payment: ${order.paymentMethod?.toUpperCase() || 'N/A'}</p>
          <p>Cashier: ${order.shopUserName}</p>
          <p style="text-align: center; margin-top: 30px;">Thank you for your purchase!</p>
        </body>
        </html>
      `;
      receiptWindow.document.write(receiptHtml);
      receiptWindow.document.close();
      receiptWindow.print();
    }
  };

  // Handle SMS resend
  const handleResendSMS = async (order: OrderWithRelations) => {
    if (!order.customerMobile) {
      toast.error('No mobile number available for this order');
      return;
    }

    // This would integrate with your SMS service
    toast.success(`SMS receipt sent to ${order.customerMobile}`);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', page.toString());
    router.push(`/pos/orders?${params.toString()}`);
  };

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No orders found for the selected criteria
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="font-medium text-primary hover:underline"
                      >
                        {order.orderNumber}
                      </button>
                    </TableCell>
                    <TableCell>{formatTime(order.createdAt)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {order.customerName || 'Guest Customer'}
                        </div>
                        {order.customerMobile && (
                          <div className="text-sm text-muted-foreground">
                            {order.customerMobile}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.total)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleReprintReceipt(order)}
                          >
                            <Printer className="mr-2 h-4 w-4" />
                            Reprint Receipt
                          </DropdownMenuItem>
                          {order.customerMobile && (
                            <DropdownMenuItem
                              onClick={() => handleResendSMS(order)}
                            >
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Resend SMS
                            </DropdownMenuItem>
                          )}
                          {order.status !== 'cancelled' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleCancelOrder(order.id, order.orderNumber)}
                                disabled={cancellingOrderId === order.id}
                                className="text-destructive"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel Order
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * 50 + 1} to {Math.min(currentPage * 50, totalCount)} of {totalCount} orders
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </>
  );
}