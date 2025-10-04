import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { orders, subscribers, adminUsers } from '@/lib/db/schema';
import { desc, eq, and, gte, lte, or, like, sql, ne } from 'drizzle-orm';
import { OrdersTableWithModal } from './components/OrdersTableWithModal';
import { OrderFilters } from './components/OrderFilters';
import { OrderStats } from './components/OrderStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils/format';

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

// Fetch all admin orders with filters (not limited to specific shop user)
async function getAdminOrders(searchParams: {
  dateFrom?: string;
  dateTo?: string;
  shopUserId?: string;
  status?: string;
  paymentMethod?: string;
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

  // Build where conditions - ALL orders (no user filter unless specified)
  const conditions = [
    gte(orders.createdAt, dateFrom),
    lte(orders.createdAt, dateTo)
  ];

  // Add shop user filter if provided
  if (searchParams.shopUserId && searchParams.shopUserId !== 'all') {
    conditions.push(eq(orders.shopUserId, searchParams.shopUserId));
  }

  // Add status filter
  if (searchParams.status && searchParams.status !== 'all') {
    conditions.push(eq(orders.status, searchParams.status as any));
  }

  // Add payment method filter
  if (searchParams.paymentMethod && searchParams.paymentMethod !== 'all') {
    conditions.push(eq(orders.paymentMethod, searchParams.paymentMethod as any));
  }

  // Add search filter (order number, customer name, customer mobile)
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

  // Fetch orders with relations (LEFT JOIN for customers and shop users)
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

// Get admin order statistics
async function getAdminOrderStats(searchParams: {
  dateFrom?: string;
  dateTo?: string;
  shopUserId?: string;
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

  // Add shop user filter if provided
  if (searchParams.shopUserId && searchParams.shopUserId !== 'all') {
    conditions.push(eq(orders.shopUserId, searchParams.shopUserId));
  }

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

// Get all shop users for filter dropdown
async function getShopUsers() {
  const shopUsers = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      firstName: adminUsers.firstName,
      lastName: adminUsers.lastName
    })
    .from(adminUsers)
    .where(eq(adminUsers.role, 'shop_user'))
    .orderBy(adminUsers.email);

  return shopUsers;
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

// Stats display component wrapper
async function OrderStatsWrapper({ searchParams }: { searchParams: any }) {
  const stats = await getAdminOrderStats(searchParams);
  return <OrderStats stats={stats} />;
}

// Loading component for table
function TableLoading() {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-96 w-full" />
      </CardContent>
    </Card>
  );
}

export default async function AdminOrdersPage({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Validate session and check permissions
  const { user } = await validateSession();

  if (!user) {
    redirect('/login');
  }

  // Check if user has admin permissions (only admin and super_admin can access)
  if (!['admin', 'super_admin'].includes(user.role)) {
    redirect('/unauthorized');
  }

  // Normalize search params (handle arrays from query string)
  const normalizedParams = {
    dateFrom: Array.isArray(searchParams.dateFrom) ? searchParams.dateFrom[0] : searchParams.dateFrom,
    dateTo: Array.isArray(searchParams.dateTo) ? searchParams.dateTo[0] : searchParams.dateTo,
    shopUserId: Array.isArray(searchParams.shopUserId) ? searchParams.shopUserId[0] : searchParams.shopUserId,
    status: Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status,
    paymentMethod: Array.isArray(searchParams.paymentMethod) ? searchParams.paymentMethod[0] : searchParams.paymentMethod,
    search: Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search,
    page: Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page
  };

  // Fetch all required data
  const [ordersData, shopUsers] = await Promise.all([
    getAdminOrders(normalizedParams),
    getShopUsers()
  ]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Order Management</h1>
      </div>

      {/* Summary Stats */}
      <Suspense fallback={<StatsLoading />}>
        <OrderStatsWrapper searchParams={normalizedParams} />
      </Suspense>

      {/* Filters - pass shopUsers for dropdown */}
      <OrderFilters
        shopUsers={shopUsers}
        showShopUserFilter={true}
      />

      {/* Orders Table with Modal */}
      <Suspense fallback={<TableLoading />}>
        <OrdersTableWithModal
          orders={ordersData.orders}
          totalCount={ordersData.totalCount}
          totalPages={ordersData.totalPages}
          currentPage={ordersData.currentPage}
          showShopUser={true}
        />
      </Suspense>
    </div>
  );
}