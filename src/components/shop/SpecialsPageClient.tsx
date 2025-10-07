"use client";

import React, { useState } from "react";
import { OnlineCartProvider } from "@/contexts/OnlineCartContext";
import { CartButton } from "@/components/cart/CartButton";
import { CartSidebar } from "@/components/cart/CartSidebar";
import { SubscriberMenu } from "@/components/shop/SubscriberMenu";
import { MemberLoginModal } from "@/components/shop/MemberLoginModal";
import { useOnlineCart } from "@/contexts/OnlineCartContext";
import { Button } from "@/components/ui/button";
import { User, LogIn } from "lucide-react";
import type { ProductWithCategory } from "@/types/products";
import type { Category } from "@/lib/db/schema";

interface SpecialsPageClientProps {
  subscriberId: string | null;
  subscriberName?: string;
  subscriberMobile?: string;
  products: ProductWithCategory[];
  categories: Category[];
  productCounts: Record<string, number>;
  isMember: boolean;
  children: React.ReactNode;
}

// Inner component that uses the cart context
function SpecialsPageContent({
  children,
  isMember,
  subscriberId,
  subscriberName,
  subscriberMobile,
}: {
  children: React.ReactNode;
  isMember: boolean;
  subscriberId: string;
  subscriberName?: string;
  subscriberMobile?: string;
}) {
  const [cartOpen, setCartOpen] = useState(false);
  const { itemCount } = useOnlineCart();

  return (
    <>
      {/* Header with Subscriber Menu */}
      {isMember && (
        <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/75">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo/Brand */}
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-white">Bigg Buzz</h1>
              </div>

              {/* Subscriber Menu */}
              <SubscriberMenu
                subscriberId={subscriberId}
                subscriberName={subscriberName}
                subscriberMobile={subscriberMobile}
              />
            </div>
          </div>
        </header>
      )}

      {children}

      {/* Cart UI - only for members */}
      {isMember && (
        <>
          <CartButton itemCount={itemCount} onClick={() => setCartOpen(true)} />
          <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} />
        </>
      )}
    </>
  );
}

// Non-member header with login button
function NonMemberHeader() {
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/75">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo/Brand */}
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-white">Bigg Buzz</h1>
            </div>

            {/* Login Button */}
            <Button
              onClick={() => setLoginModalOpen(true)}
              variant="default"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <LogIn className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Login as Member</span>
              <span className="sm:hidden">Login</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Login Modal */}
      <MemberLoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </>
  );
}

// Main wrapper component
export function SpecialsPageClient({
  subscriberId,
  subscriberName,
  subscriberMobile,
  children,
  isMember,
}: SpecialsPageClientProps) {
  // If not a member, render with login header (still needs cart provider for context)
  if (!subscriberId || !isMember) {
    return (
      <OnlineCartProvider subscriberId={null}>
        <NonMemberHeader />
        {children}
      </OnlineCartProvider>
    );
  }

  // Wrap with cart provider for members
  return (
    <OnlineCartProvider subscriberId={subscriberId}>
      <SpecialsPageContent
        isMember={isMember}
        subscriberId={subscriberId}
        subscriberName={subscriberName}
        subscriberMobile={subscriberMobile}
      >
        {children}
      </SpecialsPageContent>
    </OnlineCartProvider>
  );
}
