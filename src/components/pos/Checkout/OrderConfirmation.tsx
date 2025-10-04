'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Receipt,
  MessageSquare,
  ShoppingBag,
  User,
  Calendar,
  Loader2
} from 'lucide-react';
import { sendReceiptSMS, type ReceiptData } from '@/app/actions/pos';
import { toast } from 'sonner';

interface OrderDetails {
  orderNumber: string;
  customerName: string;
  customerMobile?: string;
  customerEmail?: string;
  wasOverridden?: boolean;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  timestamp: Date;
}

interface OrderConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderDetails: OrderDetails | null;
  onNewOrder: () => void;
  onPrintReceipt?: () => void;
}

export function OrderConfirmation({
  open,
  onOpenChange,
  orderDetails,
  onNewOrder,
  onPrintReceipt
}: OrderConfirmationProps) {
  const [sendSMS, setSendSMS] = useState(true); // Default to checked
  const [sendEmail, setSendEmail] = useState(false); // Default to unchecked
  const [isSending, setIsSending] = useState(false);
  const [smsSent, setSmsSent] = useState(false);

  if (!orderDetails) return null;

  const handleSendReceipt = async () => {
    if (!orderDetails.customerMobile) {
      toast.error('Customer mobile number not available');
      return;
    }

    setIsSending(true);
    try {
      const receiptData: ReceiptData = {
        orderNumber: orderDetails.orderNumber,
        customerName: orderDetails.customerName,
        customerMobile: orderDetails.customerMobile,
        items: orderDetails.items,
        subtotal: orderDetails.subtotal,
        tax: orderDetails.tax,
        total: orderDetails.total,
        paymentMethod: orderDetails.paymentMethod,
        timestamp: orderDetails.timestamp
      };

      const result = await sendReceiptSMS(receiptData);

      if (result.success) {
        setSmsSent(true);
        toast.success('Receipt sent successfully via SMS');
      } else {
        toast.error(result.message || 'Failed to send receipt');
      }
    } catch (error) {
      console.error('Error sending receipt:', error);
      toast.error('Failed to send receipt');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
            Order Complete!
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Transaction processed successfully
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Number - Large and Prominent */}
          <div className="text-center p-6 bg-green-950/30 border-2 border-green-800 rounded-lg">
            <p className="text-sm text-green-400 mb-2">Order Number</p>
            <p className="text-4xl font-bold text-white">{orderDetails.orderNumber}</p>
          </div>

          {/* Customer & Payment Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <User className="w-4 h-4" />
                <span>Customer</span>
              </div>
              <p className="font-medium text-white">{orderDetails.customerName}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Calendar className="w-4 h-4" />
                <span>Date & Time</span>
              </div>
              <p className="font-medium text-white">
                {orderDetails.timestamp.toLocaleString()}
              </p>
            </div>
          </div>

          <Separator className="bg-slate-700" />

          {/* Order Summary */}
          <div className="space-y-3">
            <h3 className="font-medium text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Order Summary
            </h3>

            {/* Items */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {orderDetails.items.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between text-sm p-2 bg-slate-800/50 rounded"
                >
                  <div className="flex-1">
                    <span className="text-white">{item.name}</span>
                    <span className="text-slate-400 ml-2">x{item.quantity}</span>
                  </div>
                  <span className="text-white font-medium">
                    R{(item.subtotal / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-2 p-3 bg-slate-800/30 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Subtotal</span>
                <span className="text-white">R{(orderDetails.subtotal / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">VAT (15%)</span>
                <span className="text-white">R{(orderDetails.tax / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <Separator className="bg-slate-600" />
              <div className="flex justify-between items-center">
                <span className="font-semibold text-white">Total</span>
                <span className="text-xl font-bold text-green-400">
                  R{(orderDetails.total / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
              <span className="text-sm text-slate-400">Payment Method</span>
              <Badge className="bg-blue-950/50 text-blue-400 border-blue-800">
                {orderDetails.paymentMethod}
              </Badge>
            </div>
          </div>
        </div>

        {/* Receipt Options Section */}
        {(orderDetails.customerMobile || orderDetails.customerEmail) && !orderDetails.wasOverridden && (
          <div className="py-3 px-1">
            <Separator className="bg-slate-700 mb-4" />
            <div className="space-y-3">
              {/* SMS Receipt */}
              {orderDetails.customerMobile && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="send-sms"
                      checked={sendSMS}
                      onCheckedChange={(checked) => setSendSMS(checked as boolean)}
                      disabled={isSending || smsSent}
                      className="border-slate-500 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                    />
                    <Label
                      htmlFor="send-sms"
                      className="text-sm font-medium text-slate-200 cursor-pointer"
                    >
                      Send receipt via SMS
                    </Label>
                  </div>
                  {sendSMS && !smsSent && (
                    <Button
                      onClick={handleSendReceipt}
                      disabled={isSending}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="mr-2 h-3 w-3" />
                          Send SMS
                        </>
                      )}
                    </Button>
                  )}
                  {smsSent && (
                    <Badge className="bg-green-950/50 text-green-400 border-green-800">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      SMS Sent
                    </Badge>
                  )}
                </div>
              )}

              {/* Email Receipt (Disabled for now) */}
              {orderDetails.customerEmail && (
                <div className="flex items-center justify-between opacity-50">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="send-email"
                      checked={sendEmail}
                      disabled={true}
                      className="border-slate-500 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                    />
                    <Label
                      htmlFor="send-email"
                      className="text-sm font-medium text-slate-400"
                    >
                      Send receipt via Email (Coming Soon)
                    </Label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            onClick={() => {
              onNewOrder();
              onOpenChange(false);
              setSmsSent(false);
              setSendSMS(true);
              setSendEmail(false);
            }}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            New Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}