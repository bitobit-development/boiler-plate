"use client";

import { Package, AlertTriangle, XCircle, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";

interface ProductStatsProps {
  stats: {
    totalProducts: number;
    activeProducts: number;
    outOfStock: number;
    lowStock: number;
    featuredProducts: number;
    totalValue: number;
  };
}

export function ProductStats({ stats }: ProductStatsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterClick = (filter: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("filter", filter);
    router.push(`/admin/products?${params.toString()}`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 0,
    }).format(value / 100); // Convert from cents
  };

  const cards = [
    {
      title: "Total Products",
      value: stats.totalProducts,
      icon: Package,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10",
      trend: stats.activeProducts,
      trendLabel: "active",
      onClick: () => router.push("/admin/products"),
    },
    {
      title: "Low Stock",
      value: stats.lowStock,
      icon: AlertTriangle,
      iconColor: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      isAlert: stats.lowStock > 0,
      onClick: () => handleFilterClick("low-stock"),
    },
    {
      title: "Out of Stock",
      value: stats.outOfStock,
      icon: XCircle,
      iconColor: "text-red-500",
      bgColor: "bg-red-500/10",
      isAlert: stats.outOfStock > 0,
      onClick: () => handleFilterClick("out-of-stock"),
    },
    {
      title: "Total Value",
      value: formatCurrency(stats.totalValue),
      icon: DollarSign,
      iconColor: "text-green-500",
      bgColor: "bg-green-500/10",
      subtitle: `${stats.featuredProducts} featured`,
      onClick: () => handleFilterClick("featured"),
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={index}
            className={cn(
              "relative overflow-hidden transition-all hover:shadow-md cursor-pointer",
              card.isAlert && "border-destructive/50 bg-destructive/5"
            )}
            onClick={card.onClick}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold tracking-tight">
                    {card.value}
                  </p>
                  {card.trendLabel && (
                    <p className="text-xs text-muted-foreground">
                      <span className="text-foreground font-medium">
                        {card.trend}
                      </span>{" "}
                      {card.trendLabel}
                    </p>
                  )}
                  {card.subtitle && (
                    <p className="text-xs text-muted-foreground">
                      {card.subtitle}
                    </p>
                  )}
                </div>
                <div className={cn("rounded-lg p-2", card.bgColor)}>
                  <Icon className={cn("h-5 w-5", card.iconColor)} />
                </div>
              </div>

              {/* Alert Pulse Animation */}
              {card.isAlert && (
                <div className="absolute -right-1 -top-1">
                  <span className="flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}