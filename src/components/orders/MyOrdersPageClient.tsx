"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SubscriberMenu } from "@/components/shop/SubscriberMenu";
import { ArrowLeft, Package, Loader2 } from "lucide-react";

interface MyOrdersPageClientProps {
  subscriberId: string;
  subscriberName?: string;
  subscriberMobile?: string;
  children: React.ReactNode;
}

export function MyOrdersPageClient({
  subscriberId,
  subscriberName,
  subscriberMobile,
  children,
}: MyOrdersPageClientProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleBackToShop = async () => {
    setIsNavigating(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    router.push("/specials");
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Background pattern overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.1),rgba(0,0,0,0))]" aria-hidden="true" />
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleBackToShop}
              disabled={isNavigating}
              className="gap-2"
              aria-label="Back to shop"
            >
              {isNavigating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">
                {isNavigating ? "Loading..." : "Back to Shop"}
              </span>
            </Button>
            <div className="h-6 w-px bg-border hidden sm:block" aria-hidden="true" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold sm:text-xl">My Orders</h1>
              {subscriberName && (
                <p className="text-sm text-muted-foreground">
                  Welcome back, {subscriberName}
                </p>
              )}
            </div>
          </div>

          {/* Mobile: Show icon + menu */}
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-muted-foreground sm:hidden" aria-hidden="true" />
            <SubscriberMenu
              subscriberId={subscriberId}
              subscriberName={subscriberName}
              subscriberMobile={subscriberMobile}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
