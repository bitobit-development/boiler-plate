import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PriceHistory } from "@/lib/db/schema/products";

interface PriceHistoryTableProps {
  history: PriceHistory[];
}

export function PriceHistoryTable({ history }: PriceHistoryTableProps) {
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 2,
    }).format(cents / 100);
  };

  const getChangeIcon = (difference: number) => {
    if (difference > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (difference < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getChangeTypeBadge = (changeType: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      manual: { variant: "default", label: "Manual" },
      bulk_update: { variant: "secondary", label: "Bulk Update" },
      promotion: { variant: "outline", label: "Promotion" },
      cost_adjustment: { variant: "destructive", label: "Cost Adjustment" },
    };

    const config = variants[changeType] || { variant: "outline", label: changeType };

    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  if (history.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">No price history available</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Old Price</TableHead>
            <TableHead>New Price</TableHead>
            <TableHead>Change</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Changed By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {format(new Date(entry.effectiveFrom), "MMM d, yyyy")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(entry.effectiveFrom), "h:mm a")}
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-medium">
                {formatPrice(entry.oldPrice)}
              </TableCell>
              <TableCell className="font-medium">
                {formatPrice(entry.newPrice)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getChangeIcon(entry.priceDifference)}
                  <div className="space-y-1">
                    <div
                      className={cn(
                        "text-sm font-medium",
                        entry.priceDifference > 0 && "text-green-600",
                        entry.priceDifference < 0 && "text-red-600"
                      )}
                    >
                      {entry.priceDifference > 0 && "+"}
                      {formatPrice(entry.priceDifference)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.percentageChange > 0 && "+"}
                      {entry.percentageChange.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>{getChangeTypeBadge(entry.changeType)}</TableCell>
              <TableCell>
                <span className="text-sm">{entry.reason}</span>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="text-sm font-medium">{entry.changedByName}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {entry.changedByRole?.replace("_", " ")}
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}