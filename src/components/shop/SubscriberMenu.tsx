"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, ShoppingBag, Package, LogOut, Loader2 } from "lucide-react";
import { getPendingOrdersCount } from "@/app/actions/orders";
import { logoutMember } from "@/app/actions/auth";
import { toast } from "sonner";

interface SubscriberMenuProps {
  subscriberName?: string;
  subscriberMobile?: string;
  subscriberId: string;
  className?: string;
}

export function SubscriberMenu({
  subscriberName,
  subscriberMobile,
  subscriberId,
  className,
}: SubscriberMenuProps) {
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [navigatingToOrders, setNavigatingToOrders] = useState(false);

  // Fetch pending orders count
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const result = await getPendingOrdersCount(subscriberId);
        if (result.success) {
          setPendingCount(result.count);
        }
      } catch (error) {
        console.error("Error fetching pending orders count:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingCount();

    // Refresh count every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);

    return () => clearInterval(interval);
  }, [subscriberId]);

  const handleNavigateToOrders = async (e: Event) => {
    // Prevent dropdown from closing immediately
    e.preventDefault();

    setNavigatingToOrders(true);

    // Small delay to ensure loading state is visible
    await new Promise(resolve => setTimeout(resolve, 300));

    router.push("/my-orders");
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const result = await logoutMember();
      if (result.success) {
        toast.success("Logged out successfully");
        // Refresh page to show logged-out state
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "relative h-10 px-3 text-zinc-300 hover:text-white hover:bg-zinc-800/50",
            "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2",
            className
          )}
          aria-label={`User menu${pendingCount > 0 ? ` with ${pendingCount} pending orders` : ""}`}
        >
          <User className="h-5 w-5 mr-2" aria-hidden="true" />
          <span className="hidden sm:inline-block max-w-32 truncate">
            {subscriberName || "Account"}
          </span>
          <span className="sm:hidden">Menu</span>

          {/* Pending orders badge */}
          {!loading && pendingCount > 0 && (
            <Badge
              variant="secondary"
              className={cn(
                "absolute -top-1 -right-1 h-5 min-w-5 px-1",
                "flex items-center justify-center",
                "bg-amber-500 text-white text-xs font-bold",
                "border-2 border-black",
                "animate-in zoom-in-50 duration-200"
              )}
              aria-label={`${pendingCount} pending orders`}
            >
              {pendingCount > 9 ? "9+" : pendingCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className={cn(
          "w-56 bg-zinc-900 border-zinc-800",
          "shadow-lg"
        )}
      >
        <DropdownMenuLabel className="text-zinc-400">
          {subscriberName ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">{subscriberName}</p>
              {subscriberMobile && (
                <div className="flex items-center gap-1.5">
                  <div className="h-1 w-1 rounded-full bg-emerald-500" />
                  <p className="text-xs font-mono text-zinc-400">{subscriberMobile}</p>
                </div>
              )}
              <p className="text-xs text-zinc-500">Member Account</p>
            </div>
          ) : (
            "My Account"
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-zinc-800" />

        {/* My Orders */}
        <DropdownMenuItem
          className={cn(
            "cursor-pointer",
            "flex items-center px-2 py-2",
            "text-zinc-300 hover:text-white hover:bg-zinc-800",
            "focus:bg-zinc-800 focus:text-white",
            "transition-colors"
          )}
          onSelect={handleNavigateToOrders}
          disabled={navigatingToOrders}
        >
          {navigatingToOrders ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-emerald-500" aria-hidden="true" />
          ) : (
            <ShoppingBag className="mr-2 h-4 w-4 text-emerald-500" aria-hidden="true" />
          )}
          <span className="flex-1">{navigatingToOrders ? "Loading..." : "My Orders"}</span>
          {!navigatingToOrders && (loading ? (
            <Loader2 className="h-3 w-3 animate-spin text-zinc-500" aria-hidden="true" />
          ) : pendingCount > 0 ? (
            <Badge
              variant="secondary"
              className="ml-2 bg-amber-500/20 text-amber-400 border-amber-500/50 px-2 py-0"
            >
              {pendingCount}
            </Badge>
          ) : null)}
        </DropdownMenuItem>

        {/* Browse Products (back to specials) */}
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link
            href="/specials"
            className={cn(
              "flex items-center px-2 py-2",
              "text-zinc-300 hover:text-white hover:bg-zinc-800",
              "focus:bg-zinc-800 focus:text-white",
              "transition-colors"
            )}
          >
            <Package className="mr-2 h-4 w-4 text-blue-500" aria-hidden="true" />
            <span>Browse Products</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-zinc-800" />

        {/* Logout */}
        <DropdownMenuItem
          className={cn(
            "cursor-pointer",
            "text-red-400 hover:text-red-300 hover:bg-red-950/30",
            "focus:bg-red-950/30 focus:text-red-300"
          )}
          onSelect={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          <span>{loggingOut ? "Logging out..." : "Log Out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
