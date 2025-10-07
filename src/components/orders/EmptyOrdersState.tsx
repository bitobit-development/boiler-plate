"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { ShoppingBag, Inbox, Loader2 } from "lucide-react";

export function EmptyOrdersState() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleBrowseProducts = async () => {
    setIsNavigating(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    router.push("/specials");
  };

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <CardTitle className="mb-2 text-xl">No Pending Orders</CardTitle>
        <CardDescription className="mb-6 max-w-sm">
          You don't have any pending orders at the moment. Start shopping to
          create your first order!
        </CardDescription>
        <Button
          type="button"
          size="lg"
          onClick={handleBrowseProducts}
          disabled={isNavigating}
          className="gap-2"
        >
          {isNavigating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading...
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Browse Products
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
