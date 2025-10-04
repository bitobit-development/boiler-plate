'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Store, User, LogOut, HelpCircle, Settings, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface POSHeaderProps {
  className?: string;
}

export function POSHeader({ className }: POSHeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [kioskId] = useState('POS-KIOSK-001'); // In production, this would come from environment/config

  useEffect(() => {
    // Get user info from localStorage or session
    const userData = localStorage.getItem('posUser');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('posUser');
      router.push('/pos/login');
    }
  };

  return (
    <header
      className={cn(
        'h-16 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-6',
        className
      )}
    >
      {/* Left section - Logo and Store Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Store className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">POS System</h1>
            <p className="text-xs text-slate-400">Bigg Buzz Cannabis</p>
          </div>
        </div>

        <Separator orientation="vertical" className="h-8 bg-slate-700" />

        {/* Teller Info */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-950/50 border-blue-800 text-blue-400">
            <User className="w-3 h-3 mr-1" />
            Teller: Food Truck
          </Badge>
        </div>

        <Separator orientation="vertical" className="h-8 bg-slate-700" />

        {/* Kiosk ID */}
        <Badge variant="outline" className="bg-slate-800 border-slate-600 text-slate-300">
          <Monitor className="w-3 h-3 mr-1" />
          {kioskId}
        </Badge>
      </div>

      {/* Right section - Actions */}
      <div className="flex items-center gap-2">
        {/* Help Button */}
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <HelpCircle className="w-4 h-4 mr-2" />
          Help
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Settings className="w-4 h-4 mr-2" />
              {user?.email || 'Shop User'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-700">
            <DropdownMenuLabel className="text-slate-300">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem className="text-slate-300 hover:bg-slate-800 hover:text-white">
              <User className="w-4 h-4 mr-2" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="text-slate-300 hover:bg-slate-800 hover:text-white">
              <Monitor className="w-4 h-4 mr-2" />
              Kiosk Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-400 hover:bg-red-950/50 hover:text-red-300"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}