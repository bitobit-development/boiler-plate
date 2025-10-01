"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
}

const variantStyles = {
  default: {
    icon: "text-primary bg-primary/10",
    trend: "text-primary",
  },
  success: {
    icon: "text-green-500 bg-green-500/10",
    trend: "text-green-500",
  },
  warning: {
    icon: "text-yellow-500 bg-yellow-500/10",
    trend: "text-yellow-500",
  },
  danger: {
    icon: "text-red-500 bg-red-500/10",
    trend: "text-red-500",
  },
};

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "default",
  className,
}: StatsCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("rounded-lg p-2.5", styles.icon)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold text-foreground">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {trend && (
            <div className={cn("flex items-center gap-1", styles.trend)}>
              {trend.isPositive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              <span className="text-xs font-medium">
                {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
              </span>
            </div>
          )}
        </div>

        {/* Background decoration */}
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-primary/5 to-transparent" />
      </CardContent>
    </Card>
  );
}