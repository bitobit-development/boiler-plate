'use client';

import { Product } from '@/lib/db/schema';
import { ProductCard } from './ProductCard';
import { cn } from '@/lib/utils';
import { Package2 } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  className?: string;
}

export function ProductGrid({ products, loading = false, className }: ProductGridProps) {
  if (loading) {
    return (
      <div className={cn('grid grid-cols-3 xl:grid-cols-4 gap-4 p-4', className)}>
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-[320px] bg-slate-800 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400">
        <Package2 className="w-16 h-16 mb-4 text-slate-600" />
        <p className="text-lg font-medium">No products found</p>
        <p className="text-sm mt-1">Try adjusting your filters or search query</p>
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-3 xl:grid-cols-4 gap-4 p-4', className)}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}