"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { updateProductPrice } from "@/app/actions/products";
import type { Product } from "@/lib/db/schema/products";
import { cn } from "@/lib/utils";

interface PriceUpdateModalProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PriceUpdateModal({
  product,
  open,
  onOpenChange,
  onSuccess,
}: PriceUpdateModalProps) {
  const [newPrice, setNewPrice] = useState<string>(
    product.price ? (product.price / 100).toFixed(2) : "0"
  );
  const [reason, setReason] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const oldPriceInRands = product.price ? product.price / 100 : 0;
  const newPriceInRands = parseFloat(newPrice) || 0;
  const priceDifference = newPriceInRands - oldPriceInRands;
  const percentageChange = oldPriceInRands > 0
    ? ((priceDifference / oldPriceInRands) * 100).toFixed(2)
    : "0";

  const handleUpdate = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for the price change");
      return;
    }

    if (newPriceInRands < 0) {
      toast.error("Price cannot be negative");
      return;
    }

    setIsUpdating(true);

    try {
      const newPriceInCents = Math.round(newPriceInRands * 100);
      const result = await updateProductPrice(product.id, newPriceInCents, reason);

      if (result.success) {
        toast.success("Price updated successfully");
        onSuccess?.();
        onOpenChange(false);
        // Reset form
        setReason("");
      } else {
        toast.error(result.error || "Failed to update price");
      }
    } catch (error) {
      console.error("Error updating price:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  const getPriceChangeIcon = () => {
    if (priceDifference > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (priceDifference < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Product Price</DialogTitle>
          <DialogDescription>
            Change the price for <span className="font-medium">{product.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current vs New Price Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Current Price</Label>
              <div className="text-lg font-semibold">
                {formatCurrency(oldPriceInRands)}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">New Price</Label>
              <div className="text-lg font-semibold">
                {formatCurrency(newPriceInRands)}
              </div>
            </div>
          </div>

          {/* Price Change Indicator */}
          {priceDifference !== 0 && (
            <Alert
              className={cn(
                "border",
                priceDifference > 0
                  ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                  : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
              )}
            >
              <div className="flex items-center gap-2">
                {getPriceChangeIcon()}
                <AlertDescription className="flex-1">
                  <span className="font-medium">
                    {priceDifference > 0 ? "+" : ""}
                    {formatCurrency(priceDifference)}
                  </span>
                  {" "}
                  ({priceDifference > 0 ? "+" : ""}{percentageChange}% change)
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* New Price Input */}
          <div className="space-y-2">
            <Label htmlFor="newPrice">New Price (in Rands)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R
              </span>
              <Input
                id="newPrice"
                type="number"
                step="0.01"
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="pl-8"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Reason for Change */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for Change <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Supplier price increase, Seasonal adjustment, Promotion ended..."
              className="resize-none"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This will be logged for compliance and audit purposes
            </p>
          </div>

          {/* Large Price Change Warning */}
          {Math.abs(parseFloat(percentageChange)) > 20 && (
            <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                This is a significant price change of {percentageChange}%. Please ensure
                this is intentional.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={isUpdating || !reason.trim()}
          >
            {isUpdating ? "Updating..." : "Update Price"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}