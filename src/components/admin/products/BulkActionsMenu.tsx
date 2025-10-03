"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ChevronDown,
  Archive,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Star,
  Tag,
  Download,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BulkActionsMenuProps {
  selectedCount: number;
  selectedIds: string[];
  onComplete?: () => void;
}

export function BulkActionsMenu({
  selectedCount,
  selectedIds,
  onComplete,
}: BulkActionsMenuProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<
    "status" | "price" | "archive" | null
  >(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Price update state
  const [priceChangeType, setPriceChangeType] = useState<"percentage" | "fixed">(
    "percentage"
  );
  const [priceChangeValue, setPriceChangeValue] = useState("");
  const [priceChangeReason, setPriceChangeReason] = useState("");

  // Status update state
  const [newStatus, setNewStatus] = useState<string>("active");

  const handleBulkAction = (action: string) => {
    switch (action) {
      case "update-status":
        setDialogType("status");
        setDialogOpen(true);
        break;
      case "update-prices":
        setDialogType("price");
        setDialogOpen(true);
        break;
      case "archive":
        setDialogType("archive");
        setDialogOpen(true);
        break;
      case "export":
        handleExport();
        break;
      case "feature":
        handleBulkFeature(true);
        break;
      case "unfeature":
        handleBulkFeature(false);
        break;
      case "show":
        handleBulkVisibility(true);
        break;
      case "hide":
        handleBulkVisibility(false);
        break;
      default:
        break;
    }
  };

  const handleExport = async () => {
    toast.success(`Exporting ${selectedCount} products...`);
    // Implement CSV export logic
    onComplete?.();
  };

  const handleBulkFeature = async (featured: boolean) => {
    toast.success(
      `${featured ? "Featured" : "Unfeatured"} ${selectedCount} products`
    );
    onComplete?.();
  };

  const handleBulkVisibility = async (visible: boolean) => {
    toast.success(
      `${visible ? "Showing" : "Hiding"} ${selectedCount} products`
    );
    onComplete?.();
  };

  const handleStatusUpdate = async () => {
    setIsProcessing(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(`Updated status for ${selectedCount} products`);
      setDialogOpen(false);
      onComplete?.();
    } catch (error) {
      toast.error("Failed to update product status");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePriceUpdate = async () => {
    if (!priceChangeValue || !priceChangeReason) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsProcessing(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const changeDescription =
        priceChangeType === "percentage"
          ? `${priceChangeValue}%`
          : `R${priceChangeValue}`;
      toast.success(`Updated prices by ${changeDescription} for ${selectedCount} products`);
      setDialogOpen(false);
      setPriceChangeValue("");
      setPriceChangeReason("");
      onComplete?.();
    } catch (error) {
      toast.error("Failed to update prices");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleArchive = async () => {
    setIsProcessing(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(`Archived ${selectedCount} products`);
      setDialogOpen(false);
      onComplete?.();
    } catch (error) {
      toast.error("Failed to archive products");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Bulk Actions ({selectedCount})
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Apply to {selectedCount} products</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Status Actions */}
          <DropdownMenuItem onClick={() => handleBulkAction("update-status")}>
            <Tag className="mr-2 h-4 w-4" />
            Update Status
          </DropdownMenuItem>

          {/* Price Actions */}
          <DropdownMenuItem onClick={() => handleBulkAction("update-prices")}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Update Prices
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Visibility Actions */}
          <DropdownMenuItem onClick={() => handleBulkAction("show")}>
            <Eye className="mr-2 h-4 w-4" />
            Make Visible
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleBulkAction("hide")}>
            <EyeOff className="mr-2 h-4 w-4" />
            Hide from Shop
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Feature Actions */}
          <DropdownMenuItem onClick={() => handleBulkAction("feature")}>
            <Star className="mr-2 h-4 w-4" />
            Mark as Featured
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleBulkAction("unfeature")}>
            <Star className="mr-2 h-4 w-4" />
            Remove Featured
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Export */}
          <DropdownMenuItem onClick={() => handleBulkAction("export")}>
            <Download className="mr-2 h-4 w-4" />
            Export Selected
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Destructive Actions */}
          <DropdownMenuItem
            onClick={() => handleBulkAction("archive")}
            className="text-destructive"
          >
            <Archive className="mr-2 h-4 w-4" />
            Archive Selected
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Status Update Dialog */}
      <Dialog
        open={dialogOpen && dialogType === "status"}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setDialogType(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Product Status</DialogTitle>
            <DialogDescription>
              Change the status for {selectedCount} selected products
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status">New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will update the status for all {selectedCount} selected products.
                This action can be reversed by updating the status again.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} disabled={isProcessing}>
              {isProcessing ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Update Dialog */}
      <Dialog
        open={dialogOpen && dialogType === "price"}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setDialogType(null);
            setPriceChangeValue("");
            setPriceChangeReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Price Update</DialogTitle>
            <DialogDescription>
              Adjust prices for {selectedCount} selected products
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Update Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={priceChangeType === "percentage" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPriceChangeType("percentage")}
                >
                  Percentage
                </Button>
                <Button
                  type="button"
                  variant={priceChangeType === "fixed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPriceChangeType("fixed")}
                >
                  Fixed Amount
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priceChange">
                {priceChangeType === "percentage"
                  ? "Percentage Change"
                  : "Amount to Add/Subtract"}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {priceChangeType === "percentage" ? "%" : "R"}
                </span>
                <Input
                  id="priceChange"
                  type="number"
                  step={priceChangeType === "percentage" ? "1" : "0.01"}
                  value={priceChangeValue}
                  onChange={(e) => setPriceChangeValue(e.target.value)}
                  className={cn(
                    priceChangeType === "percentage" ? "pl-8" : "pl-8"
                  )}
                  placeholder={
                    priceChangeType === "percentage"
                      ? "e.g., 10 for 10% increase"
                      : "e.g., 50 for R50 increase"
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Use negative values for decreases
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason for Change <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                value={priceChangeReason}
                onChange={(e) => setPriceChangeReason(e.target.value)}
                placeholder="e.g., Seasonal sale, Cost adjustment..."
                className="resize-none"
                rows={3}
              />
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will update prices for all {selectedCount} selected products.
                Individual price histories will be logged for compliance.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePriceUpdate}
              disabled={isProcessing || !priceChangeValue || !priceChangeReason}
            >
              {isProcessing ? "Updating..." : "Update Prices"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog
        open={dialogOpen && dialogType === "archive"}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setDialogType(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Products</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive {selectedCount} products?
            </DialogDescription>
          </DialogHeader>

          <Alert className="border-destructive/50 bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription>
              Archived products will be hidden from the shop and cannot be purchased.
              You can restore them later from the archived products view.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleArchive}
              disabled={isProcessing}
            >
              {isProcessing ? "Archiving..." : `Archive ${selectedCount} Products`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}