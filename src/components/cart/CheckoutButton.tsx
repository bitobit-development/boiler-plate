"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Loader2 } from "lucide-react";

interface CheckoutButtonProps {
  disabled: boolean;
  loading: boolean;
  onCheckout: () => Promise<void>;
  className?: string;
}

export const CheckoutButton = ({
  disabled,
  loading,
  onCheckout,
  className,
}: CheckoutButtonProps) => {
  return (
    <Button
      onClick={onCheckout}
      disabled={disabled || loading}
      className={cn(
        "w-full h-12 text-base font-semibold",
        "bg-emerald-600 hover:bg-emerald-500 text-white",
        "shadow-md hover:shadow-lg",
        "transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      aria-label={loading ? "Creating order" : "Proceed to checkout"}
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 mr-2 animate-spin" aria-hidden="true" />
          Creating Order...
        </>
      ) : (
        <>
          <ShoppingBag className="h-5 w-5 mr-2" aria-hidden="true" />
          Proceed to Checkout
        </>
      )}
    </Button>
  );
};
