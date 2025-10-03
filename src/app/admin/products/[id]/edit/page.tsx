import { notFound } from "next/navigation";
import { ArrowLeft, Clock, User } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductForm } from "@/components/admin/products/ProductForm";
import { PriceHistoryTable } from "@/components/admin/products/PriceHistoryTable";
import { getCategories } from "@/app/actions/products";
import { db } from "@/lib/db";
import { products, priceHistory } from "@/lib/db/schema/products";
import { eq, desc } from "drizzle-orm";

interface EditProductPageProps {
  params: {
    id: string;
  };
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  // Fetch product
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, params.id))
    .limit(1);

  if (!product) {
    notFound();
  }

  // Fetch categories
  const categoriesResult = await getCategories();
  const categories = categoriesResult.success ? categoriesResult.data : [];

  // Fetch price history
  const productPriceHistory = await db
    .select()
    .from(priceHistory)
    .where(eq(priceHistory.productId, params.id))
    .orderBy(desc(priceHistory.effectiveFrom))
    .limit(20);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
            <p className="text-muted-foreground">{product.name}</p>
          </div>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Last updated {format(new Date(product.updatedAt), "MMM d, yyyy")}
          </div>
          {product.updatedBy && (
            <div className="flex items-center gap-2 justify-end mt-1">
              <User className="h-4 w-4" />
              by Admin User
            </div>
          )}
        </div>
      </div>

      {/* Product Form */}
      <ProductForm product={product} categories={categories} mode="edit" />

      {/* Price History Section */}
      {productPriceHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Price History</CardTitle>
            <CardDescription>
              Track of all price changes for compliance and audit purposes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PriceHistoryTable history={productPriceHistory} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}