'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ProductSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function ProductSearch({
  onSearch,
  placeholder = 'Search products by name, brand, or category...',
  className
}: ProductSearchProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  // Trigger search when debounced query changes
  useEffect(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    onSearch('');
  }, [onSearch]);

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
      <Input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'pos-input pl-10 pr-10',
          'bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500',
          'focus:border-green-400 focus:ring-green-400',
          'h-12 text-base'
        )}
      />
      {query && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-auto text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}