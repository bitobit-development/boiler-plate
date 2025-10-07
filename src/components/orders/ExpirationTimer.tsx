"use client";

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface ExpirationTimerProps {
  expiresAt: Date;
  onExpired?: () => void;
  className?: string;
}

interface TimeRemaining {
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isWarning: boolean; // Less than 1 hour remaining
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate time remaining until expiration
 */
function calculateTimeRemaining(expiresAt: Date): TimeRemaining {
  const now = new Date().getTime();
  const expiryTime = new Date(expiresAt).getTime();
  const diff = expiryTime - now;

  if (diff <= 0) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      isWarning: false,
    };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    hours,
    minutes,
    seconds,
    isExpired: false,
    isWarning: hours < 1, // Warning when less than 1 hour
  };
}

/**
 * Format time value with leading zero
 */
function formatTimeValue(value: number): string {
  return value.toString().padStart(2, "0");
}

// ============================================================================
// Component
// ============================================================================

export function ExpirationTimer({
  expiresAt,
  onExpired,
  className,
}: ExpirationTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(expiresAt)
  );

  useEffect(() => {
    // Calculate initial time
    const initial = calculateTimeRemaining(expiresAt);
    setTimeRemaining(initial);

    // If already expired, call callback immediately
    if (initial.isExpired && onExpired) {
      onExpired();
      return;
    }

    // Update timer every second
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining(expiresAt);
      setTimeRemaining(remaining);

      // Call onExpired when timer reaches zero
      if (remaining.isExpired && onExpired) {
        onExpired();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  // Don't render if expired
  if (timeRemaining.isExpired) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive",
          className
        )}
        role="status"
        aria-live="polite"
        aria-label="Order expired"
      >
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Expired</span>
      </div>
    );
  }

  const { hours, minutes, seconds, isWarning } = timeRemaining;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-all duration-300",
        isWarning
          ? "border-amber-500/50 bg-amber-500/20 text-amber-400 shadow-lg shadow-amber-500/20"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
        className
      )}
      role="timer"
      aria-live="polite"
      aria-label={`Order expires in ${hours} hours, ${minutes} minutes, ${seconds} seconds`}
    >
      <Clock
        className={cn(
          "h-3.5 w-3.5",
          isWarning && "animate-pulse"
        )}
        aria-hidden="true"
      />
      <span className="tabular-nums">
        {formatTimeValue(hours)}:{formatTimeValue(minutes)}:
        {formatTimeValue(seconds)}
      </span>
    </div>
  );
}
