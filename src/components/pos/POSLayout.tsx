'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface POSLayoutProps {
  children: ReactNode;
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  className?: string;
}

export function POSLayout({ children, leftPanel, rightPanel, className }: POSLayoutProps) {
  return (
    <div className={cn('flex flex-col h-screen overflow-hidden', className)}>
      {/* Header */}
      {children}

      {/* Main Content Area - Split Screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Product Catalog (60%) */}
        <div className="flex-1 w-[60%] overflow-hidden bg-slate-900">
          {leftPanel}
        </div>

        {/* Right Panel - Cart (40%) */}
        <div className="w-[40%] overflow-hidden">
          {rightPanel}
        </div>
      </div>
    </div>
  );
}