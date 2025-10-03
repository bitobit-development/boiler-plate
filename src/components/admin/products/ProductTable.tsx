"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MoreHorizontal,
  Edit,
  Copy,
  Archive,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductWithCategory } from "@/app/actions/products";
import { PriceUpdateModal } from "./PriceUpdateModal";
import { BulkActionsMenu } from "./BulkActionsMenu";
import { toast } from "sonner";

interface ProductTableProps {
  products: ProductWithCategory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export function ProductTable({ products, pagination }: ProductTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [selectedProductForPrice, setSelectedProductForPrice] = useState<ProductWithCategory | null>(null);

  const formatPrice = (cents: number | null) => {
    if (cents === null) return "N/A";
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      active: { variant: "default", label: "Active" },
      draft: { variant: "secondary", label: "Draft" },
      archived: { variant: "outline", label: "Archived" },
      out_of_stock: { variant: "destructive", label: "Out of Stock" },
    };

    const config = variants[status] || { variant: "outline", label: status };

    return (
      <Badge variant={config.variant} className="font-medium">
        {config.label}
      </Badge>
    );
  };

  const getStockIndicator = (quantity: number, lowStockThreshold?: number) => {
    if (quantity === 0) {
      return <span className="text-red-600 font-medium">Out of stock</span>;
    }
    if (lowStockThreshold && quantity <= lowStockThreshold) {
      return <span className="text-yellow-600 font-medium">{quantity} (Low)</span>;
    }
    return <span className="text-green-600 font-medium">{quantity}</span>;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(products.map((p) => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter((id) => id !== productId));
    }
  };

  const handleSort = (field: string) => {
    const params = new URLSearchParams(searchParams);
    const currentSort = params.get("sort");
    const currentOrder = params.get("order");

    if (currentSort === field) {
      params.set("order", currentOrder === "asc" ? "desc" : "asc");
    } else {
      params.set("sort", field);
      params.set("order", "desc");
    }

    router.push(`/admin/products?${params.toString()}`);
  };

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams);
    if (searchQuery) {
      params.set("search", searchQuery);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`/admin/products?${params.toString()}`);
  };

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams(searchParams);
    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    params.set("page", "1");
    router.push(`/admin/products?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.push(`/admin/products?${params.toString()}`);
  };

  const handleQuickPriceUpdate = (product: ProductWithCategory) => {
    setSelectedProductForPrice(product);
    setPriceModalOpen(true);
  };

  const handleArchiveProduct = async (productId: string) => {
    toast.success("Product archived successfully");
    router.refresh();
  };

  const handleDuplicateProduct = async (product: ProductWithCategory) => {
    toast.success(`Duplicated ${product.name}`);
    router.push(`/admin/products/new?duplicate=${product.id}`);
  };

  const isAllSelected = selectedProducts.length === products.length && products.length > 0;
  const isPartiallySelected = selectedProducts.length > 0 && selectedProducts.length < products.length;

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search */}
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9 pr-4"
              />
            </div>
            <Button onClick={handleSearch} size="sm">
              Search
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Select
              value={searchParams.get("status") || "all"}
              onValueChange={handleStatusFilter}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            {selectedProducts.length > 0 && (
              <BulkActionsMenu
                selectedCount={selectedProducts.length}
                selectedIds={selectedProducts}
                onComplete={() => {
                  setSelectedProducts([]);
                  router.refresh();
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isPartiallySelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="w-16">Image</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("name")}
                  className="-ml-3 h-8 hover:bg-transparent"
                >
                  Name
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("price")}
                  className="-ml-3 h-8 hover:bg-transparent"
                >
                  Price
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Package className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No products found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedProducts.includes(product.id)}
                      onCheckedChange={(checked) =>
                        handleSelectProduct(product.id, checked as boolean)
                      }
                      aria-label={`Select ${product.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    {product.imageUrl ? (
                      <div className="relative h-12 w-12 overflow-hidden rounded-md bg-muted">
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="font-medium hover:underline"
                      >
                        {product.name}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{product.sku || "No SKU"}</span>
                        {product.isFeatured && (
                          <Badge variant="secondary" className="text-xs">
                            Featured
                          </Badge>
                        )}
                        {product.isNew && (
                          <Badge variant="secondary" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {product.category?.name || "Uncategorized"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{formatPrice(product.price)}</div>
                      {product.comparePrice && product.comparePrice > product.price && (
                        <div className="text-xs text-muted-foreground line-through">
                          {formatPrice(product.comparePrice)}
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs text-primary hover:bg-transparent"
                        onClick={() => handleQuickPriceUpdate(product)}
                      >
                        Quick update
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.trackQuantity ? (
                      getStockIndicator(product.quantity, product.lowStockThreshold)
                    ) : (
                      <span className="text-muted-foreground">Not tracked</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(product.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/products/${product.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDuplicateProduct(product)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleArchiveProduct(product.id)}
                          className="text-destructive"
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} products
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.ceil(pagination.total / pagination.limit) })
                .slice(
                  Math.max(0, pagination.page - 3),
                  Math.min(Math.ceil(pagination.total / pagination.limit), pagination.page + 2)
                )
                .map((_, i) => {
                  const page = Math.max(0, pagination.page - 3) + i + 1;
                  return (
                    <Button
                      key={page}
                      variant={page === pagination.page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className="h-8 w-8 p-0"
                    >
                      {page}
                    </Button>
                  );
                })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasMore}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Price Update Modal */}
      {selectedProductForPrice && (
        <PriceUpdateModal
          product={selectedProductForPrice}
          open={priceModalOpen}
          onOpenChange={setPriceModalOpen}
          onSuccess={() => {
            setPriceModalOpen(false);
            setSelectedProductForPrice(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}