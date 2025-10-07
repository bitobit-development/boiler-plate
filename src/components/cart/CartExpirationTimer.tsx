"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface CartExpirationTimerProps {
  expiresAt: Date;
  onExpired?: () => void;
  className?: string;
}

export const CartExpirationTimer = ({
  expiresAt,
  onExpired,
  className,
}: CartExpirationTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiryTime = new Date(expiresAt).getTime();
      const difference = expiryTime - now;

      if (difference <= 0) {
        setTimeLeft("Expired");
        if (onExpired) {
          onExpired();
        }
        return;
      }

      // Check if expiring within 2 hours
      setIsExpiringSoon(difference < 2 * 60 * 60 * 1000);

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
        isExpiringSoon
          ? "bg-amber-50 text-amber-700 border border-amber-200"
          : "bg-zinc-50 text-zinc-600 border border-zinc-200",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={`Cart expires in ${timeLeft}`}
    >
      <Clock
        className={cn(
          "h-4 w-4 flex-shrink-0",
          isExpiringSoon && "animate-pulse"
        )}
        aria-hidden="true"
      />
      <span className="font-medium">
        {timeLeft === "Expired" ? "Cart expired" : `Expires in ${timeLeft}`}
      </span>
    </div>
  );
};
