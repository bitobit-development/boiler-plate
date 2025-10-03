"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Crown,
  Sparkles,
  TrendingUp,
  Gift,
  Percent,
  Clock,
  Shield,
  X,
  ChevronRight,
  Zap,
} from "lucide-react";

interface MembershipBannerProps {
  variant?: "hero" | "inline" | "floating";
  dismissible?: boolean;
  className?: string;
}

export function MembershipBanner({
  variant = "hero",
  dismissible = true,
  className,
}: MembershipBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Check localStorage for dismissal
  useEffect(() => {
    if (dismissible) {
      const dismissed = localStorage.getItem("membership-banner-dismissed");
      setIsDismissed(dismissed === "true");
    }
  }, [dismissible]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("membership-banner-dismissed", "true");
  };

  if (isDismissed) return null;

  const benefits = [
    { icon: Percent, text: "Exclusive member pricing", highlight: true },
    { icon: Clock, text: "Early access to new drops" },
    { icon: Gift, text: "Birthday rewards & special offers" },
    { icon: Shield, text: "Premium customer support" },
  ];

  if (variant === "hero") {
    return (
      <div
        className={cn(
          "relative overflow-hidden bg-gradient-to-r from-amber-600/10 via-orange-600/10 to-amber-600/10",
          "border-y border-amber-500/20 backdrop-blur-sm",
          className
        )}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5" />
        <div className="absolute -top-24 -right-24 h-96 w-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 bg-orange-500/10 rounded-full blur-3xl" />

        <div className="relative container mx-auto px-4 py-12 lg:py-16">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            {/* Header */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <Crown className="h-8 w-8 text-amber-500" />
              <h2 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Join the Hive
              </h2>
              <Crown className="h-8 w-8 text-amber-500" />
            </div>

            <p className="text-lg lg:text-xl text-zinc-300 max-w-2xl mx-auto">
              Unlock exclusive pricing, early access to premium products, and become part of South Africa's most exclusive cannabis community.
            </p>

            {/* Benefits Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-8">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl",
                      "bg-black/30 backdrop-blur-sm border",
                      benefit.highlight
                        ? "border-amber-500/50 shadow-lg shadow-amber-500/10"
                        : "border-zinc-800"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 flex-shrink-0",
                        benefit.highlight ? "text-amber-500" : "text-zinc-400"
                      )}
                    />
                    <span className="text-sm text-zinc-300">{benefit.text}</span>
                  </div>
                );
              })}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/subscribe">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-8 shadow-lg shadow-amber-500/25 group"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Become a Member
                  <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/membership-info">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-zinc-700 hover:border-amber-500/50 hover:bg-amber-500/10 px-8"
                >
                  Learn More
                </Button>
              </Link>
            </div>

            {/* Trust Badge */}
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-400 mt-6">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span>Trusted by over 10,000+ members nationwide</span>
            </div>
          </div>

          {dismissible && (
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 rounded-lg bg-black/20 hover:bg-black/30 transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4 text-zinc-400" />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <Alert
        className={cn(
          "relative bg-gradient-to-r from-amber-600/10 to-orange-600/10",
          "border-amber-500/30 backdrop-blur-sm",
          className
        )}
      >
        <Crown className="h-5 w-5 text-amber-500" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex-1">
            <span className="font-semibold text-white mr-2">Join the Hive!</span>
            <span className="text-zinc-300">
              Unlock exclusive member pricing and special offers.
            </span>
          </div>
          <div className="flex gap-2 ml-4">
            <Link href="/subscribe">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white">
                Join Now
              </Button>
            </Link>
            {dismissible && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Floating variant
  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 max-w-sm",
        "animate-in slide-in-from-bottom-5 duration-500",
        className
      )}
    >
      <div className="relative bg-gradient-to-br from-amber-600/95 to-orange-600/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-amber-500/30 p-6 border border-amber-500/20">
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-white/80" />
          </button>
        )}

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/20 rounded-lg">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">Join the Hive</h3>
          </div>

          <p className="text-sm text-white/90">
            Unlock exclusive member pricing and be part of SA's premium cannabis community.
          </p>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-white/80">
              <Zap className="h-4 w-4" />
              <span>Instant access to member prices</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/80">
              <TrendingUp className="h-4 w-4" />
              <span>Save up to 30% on every order</span>
            </div>
          </div>

          <Link href="/subscribe">
            <Button className="w-full bg-white text-amber-600 hover:bg-white/90 font-semibold">
              Become a Member
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}