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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Package, ShieldAlert } from 'lucide-react';

interface InsufficientStockItem {
  productId: string;
  productName: string;
  available: number;
  requested: number;
  allowBackorder?: boolean;
}

interface InventoryOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insufficientStock: InsufficientStockItem[];
  onOverride: (reason: string, explanation: string) => void;
  onCancel: () => void;
}

export function InventoryOverrideDialog({
  open,
  onOpenChange,
  insufficientStock,
  onOverride,
  onCancel
}: InventoryOverrideDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [reason, setReason] = useState('');
  const [explanation, setExplanation] = useState('');

  // Separate items that can be backordered from those that cannot
  const backorderableItems = insufficientStock.filter(item => item.allowBackorder);
  const unavailableItems = insufficientStock.filter(item => !item.allowBackorder);

  const canOverride = backorderableItems.length > 0 && acknowledged && reason.trim().length > 0;

  const handleOverride = () => {
    if (!canOverride) return;
    onOverride(reason, explanation);
    // Reset state
    setAcknowledged(false);
    setReason('');
    setExplanation('');
  };

  const handleCancel = () => {
    onCancel();
    // Reset state
    setAcknowledged(false);
    setReason('');
    setExplanation('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Insufficient Stock Alert
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Some items in the order have insufficient stock.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* List of items with insufficient stock */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-200">Affected Items:</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {insufficientStock.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-start gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700"
                >
                  <Package className={`h-4 w-4 mt-0.5 ${item.allowBackorder ? 'text-yellow-500' : 'text-red-500'}`} />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.productName}</p>
                    <div className="flex gap-4 mt-1 text-xs text-slate-400">
                      <span>Available: <span className="text-yellow-400">{item.available}</span></span>
                      <span>Requested: <span className="text-orange-400">{item.requested}</span></span>
                      <span>Short by: <span className="text-red-400">{item.requested - item.available}</span></span>
                    </div>
                    {item.allowBackorder && (
                      <p className="text-xs text-green-400 mt-1">✓ Backorder allowed</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warning for items that cannot be backordered */}
          {unavailableItems.length > 0 && (
            <Alert className="bg-red-950/50 border-red-800">
              <ShieldAlert className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">
                <strong>{unavailableItems.length} item(s)</strong> cannot be backordered and must be removed from the order.
              </AlertDescription>
            </Alert>
          )}

          {/* Override section (only if some items can be backordered) */}
          {backorderableItems.length > 0 && (
            <>
              <div className="space-y-3 pt-2 border-t border-slate-700">
                <h4 className="text-sm font-medium text-slate-200">Override Authorization</h4>

                {/* Reason selection */}
                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-slate-300">
                    Reason for Override <span className="text-red-400">*</span>
                  </Label>
                  <select
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a reason...</option>
                    <option value="customer_urgent">Customer Urgent Request</option>
                    <option value="restock_tomorrow">Restock Expected Tomorrow</option>
                    <option value="special_order">Special Order</option>
                    <option value="vip_customer">VIP Customer</option>
                    <option value="manager_approval">Manager Approval</option>
                  </select>
                </div>

                {/* Additional explanation */}
                <div className="space-y-2">
                  <Label htmlFor="explanation" className="text-slate-300">
                    Additional Notes (Optional)
                  </Label>
                  <Textarea
                    id="explanation"
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Provide any additional context..."
                    className="min-h-[60px] bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>

                {/* Acknowledgment checkbox */}
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="acknowledge"
                    checked={acknowledged}
                    onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
                    className="border-slate-600 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                  />
                  <Label
                    htmlFor="acknowledge"
                    className="text-sm text-slate-300 cursor-pointer"
                  >
                    I acknowledge that this will create a backorder and the customer has been informed
                  </Label>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            {unavailableItems.length > 0 ? 'Remove Unavailable Items' : 'Cancel Order'}
          </Button>
          {backorderableItems.length > 0 && (
            <Button
              onClick={handleOverride}
              disabled={!canOverride}
              className="bg-yellow-600 hover:bg-yellow-700 text-black font-medium disabled:opacity-50"
            >
              Override & Continue
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}