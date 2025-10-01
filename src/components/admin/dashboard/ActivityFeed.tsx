"use client";

import { useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserPlus,
  UserCheck,
  AlertCircle,
  Shield,
  DollarSign,
  FileText,
  Activity,
  Plus,
  Edit,
  Trash,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useRecentActivity } from "@/lib/hooks/useAdminData";

const activityIcons: Record<string, any> = {
  Plus: Plus,
  Edit: Edit,
  Trash: Trash,
  CheckCircle: CheckCircle,
  XCircle: XCircle,
  UserPlus: UserPlus,
  UserCheck: UserCheck,
  Shield: Shield,
  DollarSign: DollarSign,
  Activity: Activity,
  AlertCircle: AlertCircle,
  FileText: FileText,
};

const activityColors: Record<string, string> = {
  blue: "text-blue-500 bg-blue-500/10",
  green: "text-green-500 bg-green-500/10",
  yellow: "text-yellow-500 bg-yellow-500/10",
  red: "text-red-500 bg-red-500/10",
  purple: "text-purple-500 bg-purple-500/10",
  orange: "text-orange-500 bg-orange-500/10",
  gray: "text-gray-500 bg-gray-500/10",
};

export function ActivityFeed() {
  const { activities, loading, error } = useRecentActivity(20);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3 p-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-muted-foreground">Failed to load activity</p>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Activity className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No recent activity</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4" ref={scrollRef}>
      <div className="space-y-3">
        {activities.map((activity, index) => {
          const Icon = activityIcons[activity.icon || "Activity"] || Activity;
          const colorClass = activityColors[activity.color || "gray"];

          return (
            <div
              key={`${activity.timestamp}-${index}`}
              className={cn(
                "flex gap-3 p-3 rounded-lg border bg-card/50 transition-all",
                index === 0 && "animate-in slide-in-from-top fade-in duration-500",
                "hover:bg-card hover:shadow-sm"
              )}
            >
              <div className={cn("rounded-lg p-2 flex-shrink-0", colorClass)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {activity.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {activity.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(new Date(activity.timestamp))}
                </p>
              </div>
              {index === 0 && (
                <Badge variant="outline" className="flex-shrink-0 animate-pulse">
                  New
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return format(date, "MMM d, h:mm a");
}