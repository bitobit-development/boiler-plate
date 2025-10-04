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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  CreditCard,
  Banknote,
  Smartphone,
  Receipt,
  ArrowRight,
  Loader2
} from 'lucide-react';

export type PaymentMethod = 'cash' | 'card' | 'eft' | 'voucher' | 'terminal_yoko';

interface PaymentSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onConfirm: (method: PaymentMethod, details?: any) => Promise<void>;
}

export function PaymentSelector({
  open,
  onOpenChange,
  total,
  onConfirm
}: PaymentSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [cashAmount, setCashAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Convert total from cents to Rands for calculations
  const totalInRands = total / 100;
  const change = cashAmount ? parseFloat(cashAmount) - totalInRands : 0;

  const handleConfirm = async () => {
    if (!selectedMethod) return;

    setIsProcessing(true);
    try {
      const details = selectedMethod === 'cash' ? {
        amountTendered: parseFloat(cashAmount),
        change
      } : {};

      await onConfirm(selectedMethod, details);
      // Reset state
      setSelectedMethod(null);
      setCashAmount('');
    } catch (error) {
      console.error('Payment processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const paymentMethods = [
    // Temporarily showing only YOKO terminal for testing
    {
      id: 'terminal_yoko' as PaymentMethod,
      label: 'Terminal-POS YOKO',
      icon: CreditCard,
      color: 'text-cyan-400 bg-cyan-950/50 border-cyan-800 hover:bg-cyan-950/70'
    }
    // Disabled for testing - uncomment to re-enable
    // {
    //   id: 'cash' as PaymentMethod,
    //   label: 'Cash',
    //   icon: Banknote,
    //   color: 'text-green-400 bg-green-950/50 border-green-800 hover:bg-green-950/70'
    // },
    // {
    //   id: 'card' as PaymentMethod,
    //   label: 'Card',
    //   icon: CreditCard,
    //   color: 'text-blue-400 bg-blue-950/50 border-blue-800 hover:bg-blue-950/70'
    // },
    // {
    //   id: 'eft' as PaymentMethod,
    //   label: 'EFT',
    //   icon: Smartphone,
    //   color: 'text-purple-400 bg-purple-950/50 border-purple-800 hover:bg-purple-950/70'
    // },
    // {
    //   id: 'voucher' as PaymentMethod,
    //   label: 'Voucher',
    //   icon: Receipt,
    //   color: 'text-orange-400 bg-orange-950/50 border-orange-800 hover:bg-orange-950/70'
    // }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>Select Payment Method</DialogTitle>
          <DialogDescription className="text-slate-400">
            Total Amount: <span className="text-2xl font-bold text-green-400">R{(total / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Payment Method Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <Button
                  key={method.id}
                  variant="outline"
                  size="lg"
                  onClick={() => setSelectedMethod(method.id)}
                  className={cn(
                    'h-24 flex-col gap-2 border-2 transition-all',
                    selectedMethod === method.id
                      ? method.color
                      : 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  )}
                >
                  <Icon className="w-8 h-8" />
                  <span className="text-base font-medium">{method.label}</span>
                </Button>
              );
            })}
          </div>

          <Separator className="bg-slate-700" />

          {/* Cash Amount Input (only for cash payments) */}
          {selectedMethod === 'cash' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cash-amount" className="text-slate-200">
                  Cash Received
                </Label>
                <Input
                  id="cash-amount"
                  type="number"
                  step="0.01"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="0.00"
                  className="pos-input text-2xl font-bold bg-slate-800 border-slate-600 text-white"
                  autoFocus
                />
              </div>

              {/* Quick Cash Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[50, 100, 200, 500].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setCashAmount((totalInRands + amount).toFixed(2))}
                    className="border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    R{amount}
                  </Button>
                ))}
              </div>

              {/* Change Display */}
              {cashAmount && parseFloat(cashAmount) >= totalInRands && (
                <div className="p-4 bg-green-950/30 border border-green-800 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-green-400">Change Due:</span>
                    <span className="text-2xl font-bold text-green-400">
                      R{change.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card/EFT/Voucher/Terminal Message */}
          {selectedMethod && selectedMethod !== 'cash' && (
            <div className="p-4 bg-slate-800 rounded-lg">
              <p className="text-sm text-slate-300">
                {selectedMethod === 'terminal_yoko' && 'Please process payment on Terminal-POS YOKO device'}
                {selectedMethod === 'card' && 'Please process card payment on the terminal'}
                {selectedMethod === 'eft' && 'Please confirm EFT payment received'}
                {selectedMethod === 'voucher' && 'Please enter voucher code'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedMethod(null);
              setCashAmount('');
              onOpenChange(false);
            }}
            disabled={isProcessing}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              isProcessing ||
              !selectedMethod ||
              (selectedMethod === 'cash' && (!cashAmount || parseFloat(cashAmount) < totalInRands))
            }
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Confirm Payment
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}