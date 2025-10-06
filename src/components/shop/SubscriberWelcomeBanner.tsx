"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Info,
  Crown,
  Store,
  Phone,
  X,
  Sparkles,
} from "lucide-react";

interface SubscriberWelcomeBannerProps {
  variant: "just-subscribed" | "returning-member";
  subscriberName?: string;
  dismissible?: boolean;
  className?: string;
}

export function SubscriberWelcomeBanner({
  variant,
  subscriberName,
  dismissible = false,
  className,
}: SubscriberWelcomeBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Check localStorage for dismissal (only for returning members)
  useEffect(() => {
    if (dismissible && variant === "returning-member") {
      const dismissed = localStorage.getItem("subscriber-banner-dismissed");
      setIsDismissed(dismissed === "true");
    }
  }, [dismissible, variant]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("subscriber-banner-dismissed", "true");
  };

  if (isDismissed) return null;

  // Just Subscribed Variant - Welcome new subscriber with purchase instructions
  if (variant === "just-subscribed") {
    return (
      <div
        className={cn(
          "relative overflow-hidden bg-gradient-to-r from-emerald-600/10 via-emerald-500/10 to-emerald-600/10",
          "border-y border-emerald-500/30 backdrop-blur-sm",
          className
        )}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5" />
        <div className="absolute -top-24 -right-24 h-96 w-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 bg-green-500/10 rounded-full blur-3xl" />

        <div className="relative container mx-auto px-4 py-8 lg:py-12">
          <Alert className="border-emerald-500/50 bg-emerald-500/10 backdrop-blur-sm">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            <AlertTitle className="text-2xl font-bold text-white mb-3">
              Welcome to the Hive{subscriberName ? `, ${subscriberName}` : ""}!{" "}
              <Sparkles className="inline h-6 w-6 text-amber-400 ml-1" />
            </AlertTitle>
            <AlertDescription className="space-y-4">
              <p className="text-zinc-200 text-lg">
                You're now a verified member with exclusive access to our premium cannabis products.
              </p>

              {/* How to Purchase Section */}
              <div className="flex items-start gap-3 p-4 bg-amber-500/15 border border-amber-500/30 rounded-xl">
                <Info className="h-6 w-6 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="font-semibold text-white text-lg">How to Purchase:</p>
                  <div className="space-y-3 text-zinc-200">
                    <div className="flex items-start gap-2">
                      <Store className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <p>
                        Visit our physical shop location to browse and purchase products
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Phone className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <p>
                        Provide your registered mobile number at checkout to access exclusive member pricing
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Benefits Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">Member Pricing</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">Premium Quality</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">Lab Tested</span>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Returning Member Variant - Concise reminder with dismissal option
  return (
    <div
      className={cn(
        "relative bg-gradient-to-r from-amber-600/10 to-amber-500/10",
        "border-y border-amber-500/20 backdrop-blur-sm",
        className
      )}
    >
      <div className="container mx-auto px-4 py-6">
        <Alert className="border-amber-500/30 bg-amber-500/10 backdrop-blur-sm relative">
          <Crown className="h-5 w-5 text-amber-500" />
          <AlertTitle className="text-lg font-semibold text-white">
            Member Exclusive Access
          </AlertTitle>
          <AlertDescription className="text-zinc-300">
            <div className="flex items-start gap-2">
              <Store className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p>
                Visit our shop with your registered mobile number to purchase at exclusive member prices.
              </p>
            </div>
          </AlertDescription>

          {dismissible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-white/10"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4 text-zinc-400" />
            </Button>
          )}
        </Alert>
      </div>
    </div>
  );
}
