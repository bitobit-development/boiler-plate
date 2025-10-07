import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PendingOrdersList } from "@/components/orders/PendingOrdersList";
import { MyOrdersPageClient } from "@/components/orders/MyOrdersPageClient";
import { EmptyOrdersState } from "@/components/orders/EmptyOrdersState";
import { getSubscriberPendingOrders } from "@/app/actions/orders";
import { AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// ============================================================================
// Page Metadata
// ============================================================================

export const metadata = {
  title: "My Orders | Bigg Buzz",
  description: "View and manage your pending orders",
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get subscriber ID from cookie
 */
async function getSubscriberId(): Promise<string | null> {
  const cookieStore = await cookies();
  const subscriberId = cookieStore.get("subscriber_id")?.value;
  return subscriberId || null;
}

/**
 * Validate subscriber session
 */
async function validateSubscriber(
  subscriberId: string
): Promise<{ isValid: boolean; name?: string; email?: string; mobile?: string }> {
  try {
    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.id, subscriberId))
      .limit(1);

    if (!subscriber) {
      return { isValid: false };
    }

    // Check if subscriber is active
    if (subscriber.status !== "active" || !subscriber.mobileVerified) {
      return { isValid: false };
    }

    return {
      isValid: true,
      name: `${subscriber.name} ${subscriber.surname}`,
      email: subscriber.email,
      mobile: subscriber.mobile,
    };
  } catch (error) {
    console.error("Error validating subscriber:", error);
    return { isValid: false };
  }
}

// ============================================================================
// Page Component
// ============================================================================

export default async function MyOrdersPage() {
  // 1. Check authentication
  const subscriberId = await getSubscriberId();

  if (!subscriberId) {
    redirect("/specials?login=true");
  }

  // 2. Validate subscriber
  const validation = await validateSubscriber(subscriberId);

  if (!validation.isValid) {
    redirect("/specials?login=true");
  }

  // 3. Fetch pending orders
  const result = await getSubscriberPendingOrders(subscriberId);

  const hasOrders = result.success && result.orders.length > 0;

  return (
    <MyOrdersPageClient
      subscriberId={subscriberId}
      subscriberName={validation.name}
      subscriberMobile={validation.mobile}
    >
      <main className="container px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Info Alert */}
          <Alert className="border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-blue-600/5 backdrop-blur-sm">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <AlertTitle className="text-blue-600 dark:text-blue-400">
              Order Expiration Policy
            </AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              Pending orders automatically expire after 48 hours. Please
              complete payment before the timer runs out.
            </AlertDescription>
          </Alert>

          {/* Orders Section */}
          <section aria-label="Pending orders">
            {hasOrders ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    Pending Orders ({result.orders.length})
                  </h2>
                </div>
                <PendingOrdersList
                  orders={result.orders}
                  subscriberId={subscriberId}
                />
              </div>
            ) : (
              <EmptyOrdersState />
            )}
          </section>

          {/* Help Section */}
          <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-zinc-900/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base text-emerald-600 dark:text-emerald-400">
                Need Help?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                If you have questions about your order or need assistance,
                please contact our support team.
              </p>
              <p>
                <strong className="text-emerald-600 dark:text-emerald-400">Support:</strong>{" "}
                <a
                  href="mailto:support@biggbuzz.com"
                  className="text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 underline transition-colors"
                >
                  support@biggbuzz.com
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </MyOrdersPageClient>
  );
}
