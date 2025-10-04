'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ShopUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface OrderFiltersProps {
  shopUsers?: ShopUser[];
  showShopUserFilter?: boolean;
}

const dateRangePresets = [
  {
    label: 'Today',
    getValue: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Yesterday',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 1)),
      to: endOfDay(subDays(new Date(), 1)),
    }),
  },
  {
    label: 'Last 7 days',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 30 days',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 29)),
      to: endOfDay(new Date()),
    }),
  },
];

export function OrderFilters({ shopUsers = [], showShopUserFilter = false }: OrderFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize date range from URL params
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (dateFrom && dateTo) {
      return {
        from: new Date(dateFrom),
        to: new Date(dateTo),
      };
    }

    // Default to today
    return {
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    };
  });

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [shopUserId, setShopUserId] = useState(searchParams.get('shopUserId') || 'all');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [paymentMethod, setPaymentMethod] = useState(searchParams.get('paymentMethod') || 'all');

  const updateFilters = (updates: Record<string, string | null>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    });

    // Reset to page 1 when filters change
    current.delete('page');

    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`/admin/orders${query}`);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      updateFilters({
        dateFrom: format(range.from, 'yyyy-MM-dd'),
        dateTo: format(range.to, 'yyyy-MM-dd'),
      });
    }
  };

  const handlePresetClick = (preset: typeof dateRangePresets[0]) => {
    const range = preset.getValue();
    handleDateRangeChange(range);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search });
  };

  const clearFilters = () => {
    setDateRange({
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    });
    setSearch('');
    setShopUserId('all');
    setStatus('all');
    setPaymentMethod('all');

    router.push('/admin/orders');
  };

  const hasActiveFilters =
    search ||
    shopUserId !== 'all' ||
    status !== 'all' ||
    paymentMethod !== 'all';

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        {/* Date Range Picker */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Date Range</label>
          <div className="flex flex-wrap gap-2">
            {dateRangePresets.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => handlePresetClick(preset)}
              >
                {preset.label}
              </Button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-[280px] justify-start text-left font-normal',
                    !dateRange && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'LLL dd, y')} -{' '}
                        {format(dateRange.to, 'LLL dd, y')}
                      </>
                    ) : (
                      format(dateRange.from, 'LLL dd, y')
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={handleDateRangeChange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Shop User Filter - Only show for admin */}
        {showShopUserFilter && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Shop User</label>
            <Select
              value={shopUserId}
              onValueChange={(value) => {
                setShopUserId(value);
                updateFilters({ shopUserId: value });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All shop users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shop Users</SelectItem>
                {shopUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Order Status Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              updateFilters({ status: value });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="fulfilled">Fulfilled</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payment Method Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Payment Method</label>
          <Select
            value={paymentMethod}
            onValueChange={(value) => {
              setPaymentMethod(value);
              updateFilters({ paymentMethod: value });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="eft">EFT</SelectItem>
              <SelectItem value="voucher">Voucher</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="space-y-2">
          <label className="text-sm font-medium">Search</label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Order #, customer, mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="sm">
              Search
            </Button>
          </div>
        </form>

        {/* Clear Filters */}
        <div className="space-y-2">
          <label className="text-sm font-medium">&nbsp;</label>
          <Button
            variant={hasActiveFilters ? 'destructive' : 'outline'}
            onClick={clearFilters}
            className="w-full"
            disabled={!hasActiveFilters}
          >
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        </div>
      </div>
    </div>
  );
}