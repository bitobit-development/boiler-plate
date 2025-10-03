"use client";

import { useState } from "react";
import { Phone, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PhoneNumberDisplayProps {
  phone: string;
  showPhoneIcon?: boolean;
  className?: string;
}

export function PhoneNumberDisplay({
  phone,
  showPhoneIcon = false,
  className
}: PhoneNumberDisplayProps) {
  const [copied, setCopied] = useState(false);

  // Format phone number for display
  const formatPhoneNumber = (phoneNumber: string): string => {
    // Remove any non-digit characters except the leading +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');

    // Handle South African numbers (+27)
    if (cleaned.startsWith('+27')) {
      const number = cleaned.slice(3);
      if (number.length === 9) {
        return `+27 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5)}`;
      }
    }

    // Handle US/Canada numbers (+1)
    if (cleaned.startsWith('+1')) {
      const number = cleaned.slice(2);
      if (number.length === 10) {
        return `+1 (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
      }
    }

    // Handle UK numbers (+44)
    if (cleaned.startsWith('+44')) {
      const number = cleaned.slice(3);
      if (number.length >= 10) {
        return `+44 ${number.slice(0, 4)} ${number.slice(4, 7)} ${number.slice(7)}`;
      }
    }

    // Default formatting for other international numbers
    if (cleaned.startsWith('+')) {
      // Try to format as groups of 3-4 digits
      const countryCode = cleaned.match(/^\+\d{1,3}/)?.[0] || '+';
      const remaining = cleaned.slice(countryCode.length);
      const groups = [];

      for (let i = 0; i < remaining.length; i += 3) {
        groups.push(remaining.slice(i, i + 3));
      }

      return `${countryCode} ${groups.join(' ')}`;
    }

    // Return original if no formatting rules apply
    return phoneNumber;
  };

  const handleCopyToClipboard = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click event

    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy phone number:', err);
    }
  };

  const formattedPhone = formatPhoneNumber(phone);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showPhoneIcon && (
        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
      )}

      <a
        href={`tel:${phone}`}
        className="text-sm font-medium hover:underline decoration-muted-foreground/50 underline-offset-4 transition-colors hover:text-foreground"
        aria-label={`Call ${formattedPhone}`}
        onClick={(e) => e.stopPropagation()}
      >
        {formattedPhone}
      </a>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-muted"
            onClick={handleCopyToClipboard}
            aria-label={copied ? "Phone number copied" : "Copy phone number"}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {copied ? "Copied!" : "Copy number"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}