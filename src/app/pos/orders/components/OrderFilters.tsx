'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Calendar, Filter, X } from 'lucide-react';

export function OrderFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [dateFrom, setDateFrom] = useState(
    searchParams.get('dateFrom') || new Date().toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(
    searchParams.get('dateTo') || new Date().toISOString().split('T')[0]
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      applyFilters();
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Apply filters to URL
  const applyFilters = () => {
    const params = new URLSearchParams();

    if (search) params.set('search', search);
    if (status && status !== 'all') params.set('status', status);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);

    // Reset to page 1 when filters change
    params.set('page', '1');

    router.push(`/pos/orders?${params.toString()}`);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    const today = new Date().toISOString().split('T')[0];
    setDateFrom(today);
    setDateTo(today);

    const params = new URLSearchParams();
    params.set('dateFrom', today);
    params.set('dateTo', today);
    params.set('page', '1');

    router.push(`/pos/orders?${params.toString()}`);
  };

  // Check if any filters are active
  const hasActiveFilters = search || (status && status !== 'all') ||
    dateFrom !== new Date().toISOString().split('T')[0] ||
    dateTo !== new Date().toISOString().split('T')[0];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by order number, customer name, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Date From */}
            <div className="space-y-2">
              <Label htmlFor="date-from" className="text-sm flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                From Date
              </Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                onBlur={applyFilters}
              />
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label htmlFor="date-to" className="text-sm flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                To Date
              </Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                onBlur={applyFilters}
                min={dateFrom}
              />
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm flex items-center gap-1">
                <Filter className="h-3 w-3" />
                Status
              </Label>
              <Select value={status} onValueChange={(value) => {
                setStatus(value);
                setTimeout(applyFilters, 0);
              }}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Label className="text-sm invisible">Actions</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={applyFilters}
                  className="flex-1"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Apply
                </Button>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearFilters}
                    title="Clear filters"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Date Filters */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setDateFrom(today);
                setDateTo(today);
                setTimeout(applyFilters, 0);
              }}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const dateStr = yesterday.toISOString().split('T')[0];
                setDateFrom(dateStr);
                setDateTo(dateStr);
                setTimeout(applyFilters, 0);
              }}
            >
              Yesterday
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                const today = new Date().toISOString().split('T')[0];
                setDateFrom(weekAgo.toISOString().split('T')[0]);
                setDateTo(today);
                setTimeout(applyFilters, 0);
              }}
            >
              Last 7 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                const today = new Date().toISOString().split('T')[0];
                setDateFrom(monthAgo.toISOString().split('T')[0]);
                setDateTo(today);
                setTimeout(applyFilters, 0);
              }}
            >
              Last 30 Days
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}