'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { OrderWithRelations } from '@/app/pos/orders/page';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface OrdersTableProps {
  orders: OrderWithRelations[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  onRowClick: (order: OrderWithRelations) => void;
  showShopUser?: boolean;
}

export function OrdersTable({
  orders,
  totalCount,
  totalPages,
  currentPage,
  onRowClick,
  showShopUser = false,
}: OrdersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns: ColumnDef<OrderWithRelations>[] = [
    {
      accessorKey: 'orderNumber',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Order #
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('orderNumber')}</div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Date/Time
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => formatDateTime(row.getValue('createdAt')),
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: ({ row }) => {
        const order = row.original;
        const customerName = order.customerName || order.subscriber?.name || 'Walk-in';
        const customerMobile = order.customerMobile || order.subscriber?.mobile || '';

        return (
          <div>
            <div className="font-medium">{customerName}</div>
            {customerMobile && (
              <div className="text-sm text-muted-foreground">{customerMobile}</div>
            )}
          </div>
        );
      },
    },
    ...(showShopUser ? [{
      id: 'shopUser',
      header: 'Shop User',
      cell: ({ row }) => {
        const order = row.original;
        const shopUserName = order.shopUserName || order.shopUser?.email || 'Unknown';

        return <div className="text-sm">{shopUserName}</div>;
      },
    }] : []),
    {
      id: 'items',
      header: 'Items',
      cell: ({ row }) => {
        const order = row.original;
        const itemCount = order.items?.length || 0;
        const totalQuantity = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

        return (
          <div className="text-sm">
            {itemCount} {itemCount === 1 ? 'item' : 'items'} ({totalQuantity} qty)
          </div>
        );
      },
    },
    {
      accessorKey: 'total',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Total
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="font-medium">{formatCurrency(row.getValue('total'))}</div>
      ),
    },
    {
      accessorKey: 'paymentMethod',
      header: 'Payment',
      cell: ({ row }) => {
        const method = row.getValue('paymentMethod') as string | null;

        if (!method) return <span className="text-muted-foreground">-</span>;

        const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
          cash: 'default',
          card: 'secondary',
          eft: 'outline',
          voucher: 'outline',
        };

        return (
          <Badge variant={variants[method] || 'default'}>
            {method.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;

        const variants: Record<string, 'default' | 'destructive' | 'secondary'> = {
          confirmed: 'default',
          fulfilled: 'default',
          cancelled: 'destructive',
          pending: 'secondary',
        };

        return (
          <Badge variant={variants[status] || 'secondary'}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRowClick(row.original);
            }}
          >
            View
          </Button>
        );
      },
    },
  ];

  const table = useReactTable({
    data: orders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  const handlePageChange = (page: number) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set('page', page.toString());
    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`/admin/orders${query}`);
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="w-full overflow-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    onClick={() => onRowClick(row.original)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No orders found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between space-x-2 p-4">
            <div className="text-sm text-muted-foreground">
              Showing {orders.length} of {totalCount} orders
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber = i + 1;

                  // Adjust page numbers for better navigation
                  if (totalPages > 5) {
                    if (currentPage > 3) {
                      if (currentPage < totalPages - 2) {
                        // Middle pages
                        pageNumber = currentPage - 2 + i;
                      } else {
                        // Last pages
                        pageNumber = totalPages - 4 + i;
                      }
                    }
                  }

                  return (
                    <Button
                      key={pageNumber}
                      variant={pageNumber === currentPage ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(pageNumber)}
                      className="w-10"
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}