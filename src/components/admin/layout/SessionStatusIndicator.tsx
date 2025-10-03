'use client';

import React from 'react';
import { Clock, CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAdminSession } from '@/components/admin/providers/AdminSessionProvider';
import { cn } from '@/lib/utils';

interface SessionStatusIndicatorProps {
  /** Display mode: 'compact' for header, 'full' for sidebar */
  mode?: 'compact' | 'full';
  /** Custom className */
  className?: string;
}

export function SessionStatusIndicator({
  mode = 'compact',
  className,
}: SessionStatusIndicatorProps) {
  const {
    isAuthenticated,
    isLoading,
    timeRemaining,
    formattedTime,
    status,
    handleExtendSession,
  } = useAdminSession();

  const [isExtending, setIsExtending] = React.useState(false);

  // Don't show if not authenticated or loading
  if (!isAuthenticated || isLoading) {
    return null;
  }

  const handleExtend = async () => {
    setIsExtending(true);
    try {
      await handleExtendSession();
    } finally {
      setIsExtending(false);
    }
  };

  // Determine icon and styles based on status and time remaining
  const getStatusConfig = () => {
    if (status === 'expired' || timeRemaining <= 0) {
      return {
        icon: XCircle,
        label: 'Session Expired',
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        borderColor: 'border-destructive',
        badgeVariant: 'destructive' as const,
        showExtend: false,
      };
    } else if (status === 'critical' || timeRemaining < 60) {
      return {
        icon: XCircle,
        label: `Critical: ${formattedTime}`,
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        borderColor: 'border-destructive',
        badgeVariant: 'destructive' as const,
        showExtend: true,
      };
    } else if (status === 'warning' || timeRemaining < 300) {
      return {
        icon: AlertTriangle,
        label: `Warning: ${formattedTime}`,
        color: 'text-warning',
        bgColor: 'bg-warning/10',
        borderColor: 'border-warning',
        badgeVariant: 'warning' as const,
        showExtend: true,
      };
    } else if (timeRemaining < 900) {
      // Less than 15 minutes - yellow
      return {
        icon: Clock,
        label: formattedTime,
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        badgeVariant: 'outline' as const,
        showExtend: true,
      };
    } else {
      // More than 15 minutes - green
      return {
        icon: CheckCircle,
        label: formattedTime,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        badgeVariant: 'outline' as const,
        showExtend: false,
      };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  // Calculate exact time for tooltip
  const getTooltipContent = () => {
    if (status === 'expired') {
      return 'Your session has expired. Please log in again.';
    }

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    if (minutes === 0) {
      return `Session expires in ${seconds} second${seconds !== 1 ? 's' : ''}`;
    } else if (minutes === 1) {
      return `Session expires in 1 minute and ${seconds} second${seconds !== 1 ? 's' : ''}`;
    } else {
      return `Session expires in ${minutes} minutes and ${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
  };

  // Compact mode for header
  if (mode === 'compact') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'relative gap-2 px-2 py-1 h-auto',
              config.color,
              config.showExtend && 'cursor-pointer hover:opacity-80',
              !config.showExtend && 'cursor-default hover:bg-transparent',
              className
            )}
            onClick={config.showExtend ? handleExtend : undefined}
            disabled={isExtending}
            aria-label={`Session status: ${config.label}. ${getTooltipContent()}`}
          >
            {isExtending ? (
              <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <StatusIcon className="size-4" aria-hidden="true" />
            )}
            <span className="text-xs font-medium tabular-nums">{config.label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p>{getTooltipContent()}</p>
          {config.showExtend && !isExtending && (
            <p className="mt-1 text-xs opacity-75">Click to extend session</p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Full mode for sidebar
  return (
    <div
      className={cn(
        'rounded-lg border p-3 space-y-2',
        config.bgColor,
        config.borderColor,
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={`Session status: ${getTooltipContent()}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn('size-4', config.color)} aria-hidden="true" />
          <span className="text-sm font-medium">Session Status</span>
        </div>
        <Badge variant={config.badgeVariant} className="text-xs">
          {status === 'expired' ? 'Expired' : formattedTime}
        </Badge>
      </div>

      <div className="text-xs text-muted-foreground">
        {getTooltipContent()}
      </div>

      {config.showExtend && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleExtend}
          disabled={isExtending}
          aria-label="Extend session for another 60 minutes"
        >
          {isExtending ? (
            <>
              <RefreshCw className="mr-2 size-3 animate-spin" aria-hidden="true" />
              Extending...
            </>
          ) : (
            <>
              <Clock className="mr-2 size-3" aria-hidden="true" />
              Extend Session
            </>
          )}
        </Button>
      )}
    </div>
  );
}