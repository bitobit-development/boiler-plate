"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  Activity,
  TrendingUp,
  Bell,
  Database,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { useDashboardStats } from "@/lib/hooks/useAdminData";
import { useSocket } from "@/components/admin/providers/SocketProvider";
import { SessionStatusIndicator } from "@/components/admin/layout/SessionStatusIndicator";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeVariant?: "default" | "destructive" | "secondary" | "outline";
}

const baseNavigation: Omit<NavItem, 'badge'>[] = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Subscribers",
    href: "/admin/registrations",
    icon: UserCheck,
    badgeVariant: "destructive",
  },
  {
    title: "Products",
    href: "/admin/products",
    icon: Package,
    badgeVariant: "destructive",
  },
  {
    title: "Admin Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Audit Logs",
    href: "/admin/audit",
    icon: Shield,
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: TrendingUp,
  },
  {
    title: "System",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { stats } = useDashboardStats();
  const { socket } = useSocket();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);

  // Update pending count from stats
  useEffect(() => {
    if (stats?.pendingReviews !== undefined) {
      setPendingCount(stats.pendingReviews);
    }
    // For now, we'll set this to 0 until we fetch product stats
    // This will be updated when we add the product stats fetching
    setLowStockCount(0);
  }, [stats]);

  // Listen for real-time updates via Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleStatsUpdate = (updatedStats: any) => {
      if (updatedStats.pendingReviews !== undefined) {
        setPendingCount(updatedStats.pendingReviews);
      }
    };

    socket.on("stats:update", handleStatsUpdate);

    return () => {
      socket.off("stats:update", handleStatsUpdate);
    };
  }, [socket]);

  // Build navigation with dynamic badge
  const navigation: NavItem[] = baseNavigation.map(item => {
    if (item.title === "Subscribers") {
      return {
        ...item,
        badge: pendingCount > 0 ? pendingCount : undefined,
      };
    }
    if (item.title === "Products") {
      return {
        ...item,
        badge: lowStockCount > 0 ? lowStockCount : undefined,
      };
    }
    return item as NavItem;
  });

  return (
    <>
      {/* Mobile Overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative z-50 flex h-full flex-col border-r border-border bg-sidebar transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          "lg:translate-x-0",
          collapsed && "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo Section */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <div className="relative h-8 w-8 overflow-hidden rounded-md">
              <Image
                src="/bigg-buzz-logo.jpg"
                alt="Bigg Buzz"
                fill
                className="object-cover"
              />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-sidebar-foreground">
                  Bigg Buzz
                </span>
                <span className="text-xs text-muted-foreground">
                  Admin Panel
                </span>
              </div>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>

        {/* Connection Status */}
        <div className={cn(
          "flex items-center gap-2 border-b border-border px-4 py-3",
          collapsed && "justify-center"
        )}>
          <div className="flex items-center gap-2">
            <div className="status-online" />
            {!collapsed && (
              <span className="text-xs text-muted-foreground">
                System Online
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className="space-y-1 p-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                    collapsed && "justify-center"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )} />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.title}</span>
                      {item.badge && (
                        <Badge
                          variant={item.badgeVariant}
                          className="ml-auto h-5 px-1.5 text-xs badge-pulse"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Session Status for Full Sidebar */}
        {!collapsed && (
          <div className="px-4 pb-2">
            <SessionStatusIndicator mode="full" />
          </div>
        )}

        {/* User Section */}
        <div className="border-t border-border p-4">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                AD
              </div>
              <div className="flex-1 truncate">
                <p className="text-sm font-medium text-sidebar-foreground">
                  Admin User
                </p>
                <p className="text-xs text-muted-foreground">
                  admin@biggbuzz.com
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="w-full text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Collapse Toggle for Desktop */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-20 hidden h-6 w-6 rounded-full border bg-background lg:flex"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <Menu className="h-3 w-3" />
          ) : (
            <X className="h-3 w-3" />
          )}
        </Button>
      </aside>
    </>
  );
}