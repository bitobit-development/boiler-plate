'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Search, User, Phone, Mail, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchCustomers } from '@/app/actions/pos';
import { Subscriber } from '@/lib/db/schema';

interface CustomerSearchProps {
  onSelectCustomer: (customer: Subscriber) => void;
  className?: string;
}

export function CustomerSearch({ onSelectCustomer, className }: CustomerSearchProps) {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        setLoading(true);
        setOpen(true); // Auto-open popover when searching
        try {
          // Convert "0" prefix to "27" for South African numbers
          let searchQuery = query;
          if (query.startsWith('0')) {
            searchQuery = '27' + query.substring(1);
          }
          const results = await searchCustomers(searchQuery);
          setCustomers(results);
        } catch (error) {
          console.error('Failed to search customers:', error);
          setCustomers([]);
        } finally {
          setLoading(false);
        }
      } else {
        setCustomers([]);
        setOpen(false); // Close popover if query is too short
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectCustomer = useCallback((customer: Subscriber) => {
    onSelectCustomer(customer);
    setOpen(false);
    setQuery('');
    setCustomers([]);
  }, [onSelectCustomer]);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, phone, or email..."
          className={cn(
            'pos-input pl-10',
            'bg-slate-900 border-slate-600 text-white placeholder:text-slate-500',
            'focus:border-green-400 focus:ring-green-400'
          )}
        />
      </div>

      {/* Customer Dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-between pos-button',
              'bg-slate-900 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white'
            )}
          >
            <span className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Select from customer list
            </span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[400px] p-0 bg-slate-900 border-slate-700"
          align="start"
        >
          {loading ? (
            <div className="p-4 text-center text-slate-400">
              Searching customers...
            </div>
          ) : customers.length === 0 && query.length >= 2 ? (
            <div className="p-4 text-center text-slate-400">
              No customers found
            </div>
          ) : customers.length > 0 ? (
            <ScrollArea className="h-[300px]">
              {customers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  className={cn(
                    'w-full p-3 text-left hover:bg-slate-800 transition-colors',
                    'border-b border-slate-800 last:border-0'
                  )}
                >
                  <div className="space-y-1">
                    <p className="font-medium text-white">
                      {customer.name} {customer.surname}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {customer.mobile}
                      </span>
                      {customer.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {customer.email}
                        </span>
                      )}
                    </div>
                    {customer.status === 'active' && customer.mobileVerified ? (
                      <span className="inline-block px-2 py-1 text-xs bg-green-950/50 text-green-400 rounded">
                        Verified
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-1 text-xs bg-yellow-950/50 text-yellow-400 rounded">
                        Requires Verification
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </ScrollArea>
          ) : (
            <div className="p-4 text-center text-slate-400">
              Type at least 2 characters to search
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}