'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ProductCategory } from '@/lib/db/schema';
import { Package } from 'lucide-react';

interface CategoryFilterProps {
  categories: ProductCategory[];
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  className?: string;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onCategoryChange,
  className
}: CategoryFilterProps) {
  return (
    <div className={cn('flex gap-2 p-4 bg-slate-800/50 border-b border-slate-700 overflow-x-auto', className)}>
      {/* All Products Button */}
      <Button
        variant={selectedCategory === null ? 'default' : 'outline'}
        size="lg"
        onClick={() => onCategoryChange(null)}
        className={cn(
          'pos-category-tab shrink-0',
          selectedCategory === null
            ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
            : 'bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white'
        )}
      >
        <Package className="w-4 h-4 mr-2" />
        All Products
      </Button>

      {/* Category Buttons */}
      {categories.map((category) => (
        <Button
          key={category.id}
          variant={selectedCategory === category.id ? 'default' : 'outline'}
          size="lg"
          onClick={() => onCategoryChange(category.id)}
          className={cn(
            'pos-category-tab shrink-0',
            selectedCategory === category.id
              ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
              : 'bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white'
          )}
        >
          {category.icon && <span className="mr-2">{category.icon}</span>}
          {category.name}
        </Button>
      ))}
    </div>
  );
}