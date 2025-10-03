import { Suspense } from "react";
import { Plus, Upload, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ProductTable } from "@/components/admin/products/ProductTable";
import { ProductStats } from "@/components/admin/products/ProductStats";
import { getProducts, getProductStats } from "@/app/actions/products";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductQueryInput } from "@/lib/validations/products";

interface AdminProductsPageProps {
  searchParams: {
    page?: string;
    limit?: string;
    search?: string;
    category?: string;
    status?: string;
    sort?: string;
    order?: string;
    filter?: string;
    minPrice?: string;
    maxPrice?: string;
  };
}

export default async function ProductsPage({ searchParams }: AdminProductsPageProps) {
  // Parse query params
  const queryParams: Partial<ProductQueryInput> = {
    page: searchParams.page ? parseInt(searchParams.page) : 1,
    limit: searchParams.limit ? parseInt(searchParams.limit) : 20,
    search: searchParams.search,
    category: searchParams.category,
    status: searchParams.status as any,
    sort: searchParams.sort as any || "created",
    order: searchParams.order as any || "desc",
    minPrice: searchParams.minPrice ? parseInt(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? parseInt(searchParams.maxPrice) : undefined,
  };

  // Apply special filters
  if (searchParams.filter === "low-stock") {
    // This will be handled in the server action with a custom query
  } else if (searchParams.filter === "out-of-stock") {
    queryParams.inStock = false;
  } else if (searchParams.filter === "featured") {
    queryParams.featured = true;
  }

  // Fetch data
  const [productsResult, statsResult] = await Promise.all([
    getProducts(queryParams),
    getProductStats(),
  ]);

  const products = productsResult.success ? productsResult.data : {
    products: [],
    total: 0,
    page: 1,
    limit: 20,
    hasMore: false,
  };

  const stats = statsResult.success ? statsResult.data : {
    totalProducts: 0,
    activeProducts: 0,
    outOfStock: 0,
    lowStock: 0,
    featuredProducts: 0,
    totalValue: 0,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your product catalog, pricing, and inventory
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Link href="/admin/products/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <Suspense fallback={<StatsSkeletons />}>
        <ProductStats stats={stats} />
      </Suspense>

      {/* Products Table */}
      <Suspense fallback={<TableSkeleton />}>
        <ProductTable
          products={products.products}
          pagination={{
            page: products.page,
            limit: products.limit,
            total: products.total,
            hasMore: products.hasMore,
          }}
        />
      </Suspense>
    </div>
  );
}

function StatsSkeletons() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-lg border bg-card">
      <div className="p-6">
        <Skeleton className="h-10 w-full mb-4" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full mb-2" />
        ))}
      </div>
    </div>
  );
}