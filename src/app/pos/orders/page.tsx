import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { orders, subscribers, adminUsers } from '@/lib/db/schema';
import { desc, eq, and, gte, lte, or, like, sql } from 'drizzle-orm';
import { OrdersTable } from './components/OrdersTable';
import { OrderFilters } from './components/OrderFilters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils/format';

// Force dynamic rendering for this page (uses cookies for auth)
export const dynamic = 'force-dynamic';

// Types for the order data with relations
export interface OrderWithRelations {
  id: string;
  orderNumber: string;
  orderType: string;
  subscriberId: string | null;
  customerName: string | null;
  customerMobile: string | null;
  shopUserId: string;
  shopUserName: string;
  kioskId: string | null;
  items: Array<{
    productId: string;
    productName: string;
    productSku?: string;
    quantity: number;
    price: number;
    subtotal: number;
    discount?: number;
    metadata?: Record<string, any>;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string | null;
  paymentStatus: string;
  status: string;
  wasOtpOverridden: boolean;
  overrideReason: string | null;
  overrideExplanation: string | null;
  notes: string | null;
  customerNotes: string | null;
  createdAt: Date;
  completedAt: Date | null;
  cancelledAt: Date | null;
  // Relations
  subscriber?: {
    id: string;
    name: string;
    surname: string | null;
    email: string;
    mobile: string;
    mobileVerified: boolean;
  } | null;
  shopUser?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

// Fetch orders with filters
async function getOrders(searchParams: {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  search?: string;
  page?: string;
}): Promise<{
  orders: OrderWithRelations[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}> {
  const page = parseInt(searchParams.page || '1');
  const limit = 50;
  const offset = (page - 1) * limit;

  // Build date range - default to today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let dateFrom = today;
  let dateTo = tomorrow;

  if (searchParams.dateFrom) {
    dateFrom = new Date(searchParams.dateFrom);
    dateFrom.setHours(0, 0, 0, 0);
  }
  if (searchParams.dateTo) {
    dateTo = new Date(searchParams.dateTo);
    dateTo.setHours(23, 59, 59, 999);
  }

  // Build where conditions
  const conditions = [
    gte(orders.createdAt, dateFrom),
    lte(orders.createdAt, dateTo)
  ];

  // Add status filter
  if (searchParams.status && searchParams.status !== 'all') {
    conditions.push(eq(orders.status, searchParams.status as any));
  }

  // Add search filter
  if (searchParams.search) {
    const searchPattern = `%${searchParams.search.toLowerCase()}%`;
    conditions.push(
      or(
        sql`LOWER(${orders.orderNumber}) LIKE ${searchPattern}`,
        sql`LOWER(${orders.customerName}) LIKE ${searchPattern}`,
        like(orders.customerMobile, `%${searchParams.search}%`)
      )!
    );
  }

  // Get total count for pagination
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(orders)
    .where(and(...conditions));

  const totalCount = Number(count);
  const totalPages = Math.ceil(totalCount / limit);

  // Fetch orders with relations
  const ordersData = await db
    .select({
      order: orders,
      subscriber: subscribers,
      shopUser: adminUsers
    })
    .from(orders)
    .leftJoin(subscribers, eq(orders.subscriberId, subscribers.id))
    .leftJoin(adminUsers, eq(orders.shopUserId, adminUsers.id))
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);

  // Transform to expected format
  const transformedOrders: OrderWithRelations[] = ordersData.map(({ order, subscriber, shopUser }) => ({
    ...order,
    subscriber: subscriber ? {
      id: subscriber.id,
      name: subscriber.name,
      surname: subscriber.surname,
      email: subscriber.email,
      mobile: subscriber.mobile,
      mobileVerified: subscriber.mobileVerified
    } : null,
    shopUser: shopUser ? {
      id: shopUser.id,
      email: shopUser.email,
      firstName: shopUser.firstName,
      lastName: shopUser.lastName
    } : null
  }));

  return {
    orders: transformedOrders,
    totalCount,
    totalPages,
    currentPage: page
  };
}

// Get summary statistics
async function getOrderStats(searchParams: {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}) {
  // Build date range - default to today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let dateFrom = today;
  let dateTo = tomorrow;

  if (searchParams.dateFrom) {
    dateFrom = new Date(searchParams.dateFrom);
    dateFrom.setHours(0, 0, 0, 0);
  }
  if (searchParams.dateTo) {
    dateTo = new Date(searchParams.dateTo);
    dateTo.setHours(23, 59, 59, 999);
  }

  // Build where conditions
  const conditions = [
    gte(orders.createdAt, dateFrom),
    lte(orders.createdAt, dateTo)
  ];

  // Only count confirmed/fulfilled orders for stats
  const statsConditions = [
    ...conditions,
    or(
      eq(orders.status, 'confirmed'),
      eq(orders.status, 'fulfilled')
    )!
  ];

  // Get aggregate stats
  const [stats] = await db
    .select({
      totalSales: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
      orderCount: sql<number>`COUNT(*)`,
      avgOrderValue: sql<number>`COALESCE(AVG(${orders.total}), 0)`
    })
    .from(orders)
    .where(and(...statsConditions));

  return {
    totalSales: Number(stats.totalSales) || 0,
    orderCount: Number(stats.orderCount) || 0,
    avgOrderValue: Number(stats.avgOrderValue) || 0
  };
}

// Loading component for stats
function StatsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Stats display component
async function OrderStats({ searchParams }: { searchParams: any }) {
  const stats = await getOrderStats(searchParams);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalSales)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Number of Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.orderCount}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.avgOrderValue)}</div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function OrdersPage({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Validate session and check permissions
  const { user } = await validateSession();

  if (!user) {
    redirect('/login');
  }

  // Check if user has permission (shop_user or admin roles)
  if (!['shop_user', 'admin', 'super_admin'].includes(user.role)) {
    redirect('/unauthorized');
  }

  // Normalize search params
  const normalizedParams = {
    dateFrom: Array.isArray(searchParams.dateFrom) ? searchParams.dateFrom[0] : searchParams.dateFrom,
    dateTo: Array.isArray(searchParams.dateTo) ? searchParams.dateTo[0] : searchParams.dateTo,
    status: Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status,
    search: Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search,
    page: Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page
  };

  // Fetch orders
  const ordersData = await getOrders(normalizedParams);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Order History</h1>
      </div>

      {/* Summary Stats */}
      <Suspense fallback={<StatsLoading />}>
        <OrderStats searchParams={normalizedParams} />
      </Suspense>

      {/* Filters */}
      <OrderFilters />

      {/* Orders Table */}
      <Suspense fallback={
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      }>
        <OrdersTable
          orders={ordersData.orders}
          totalCount={ordersData.totalCount}
          totalPages={ordersData.totalPages}
          currentPage={ordersData.currentPage}
        />
      </Suspense>
    </div>
  );
}