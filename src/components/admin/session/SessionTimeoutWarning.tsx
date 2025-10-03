'use client';

import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAdminSession } from '@/components/admin/providers/AdminSessionProvider';
import { cn } from '@/lib/utils';

export function SessionTimeoutWarning() {
  const {
    showWarning,
    timeRemaining,
    formattedTime,
    status,
    handleExtendSession,
    logout,
  } = useAdminSession();

  const [isExtending, setIsExtending] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Calculate progress percentage (5 minutes = 300 seconds = 100%)
  const progressPercentage = Math.max(0, Math.min(100, (timeRemaining / 300) * 100));

  // Determine icon and colors based on status
  const getStatusStyles = () => {
    switch (status) {
      case 'critical':
        return {
          icon: XCircle,
          iconColor: 'text-destructive',
          progressColor: 'bg-destructive',
          titleColor: 'text-destructive',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-warning',
          progressColor: 'bg-warning',
          titleColor: 'text-warning',
        };
      default:
        return {
          icon: Clock,
          iconColor: 'text-primary',
          progressColor: 'bg-primary',
          titleColor: 'text-foreground',
        };
    }
  };

  const { icon: StatusIcon, iconColor, progressColor, titleColor } = getStatusStyles();

  const handleExtend = async () => {
    setIsExtending(true);
    try {
      await handleExtendSession();
    } finally {
      setIsExtending(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Auto-focus on extend button when dialog opens
  useEffect(() => {
    if (showWarning) {
      // Focus the extend button after a short delay to ensure dialog is rendered
      const timer = setTimeout(() => {
        const extendButton = document.getElementById('session-extend-button');
        if (extendButton) {
          extendButton.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showWarning]);

  return (
    <Dialog open={showWarning} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        aria-labelledby="session-warning-title"
        aria-describedby="session-warning-description"
      >
        <DialogHeader>
          <DialogTitle
            id="session-warning-title"
            className={cn('flex items-center gap-2 text-xl', titleColor)}
          >
            <StatusIcon className={cn('size-5', iconColor)} aria-hidden="true" />
            Session Expiring Soon
          </DialogTitle>
          <DialogDescription id="session-warning-description" className="space-y-3">
            <p className="text-base">
              Your session will expire in{' '}
              <span
                className={cn(
                  'font-bold tabular-nums',
                  status === 'critical' ? 'text-destructive' : 'text-foreground'
                )}
                role="timer"
                aria-live="polite"
                aria-atomic="true"
              >
                {formattedTime}
              </span>
              .
            </p>
            <p className="text-sm text-muted-foreground">
              Click "Extend Session" to continue working, or "Logout" to end your session now.
            </p>
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar showing time remaining */}
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Time Remaining</span>
            <span className="tabular-nums">{formattedTime}</span>
          </div>
          <Progress
            value={progressPercentage}
            className="h-2"
            aria-label={`Session expires in ${formattedTime}`}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={isExtending || isLoggingOut}
            aria-label="Logout from session"
          >
            {isLoggingOut ? (
              <>
                <span className="animate-pulse">Logging out...</span>
              </>
            ) : (
              'Logout'
            )}
          </Button>
          <Button
            id="session-extend-button"
            onClick={handleExtend}
            disabled={isExtending || isLoggingOut}
            aria-label="Extend session for another 60 minutes"
            className={cn(
              status === 'critical' &&
                'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            )}
          >
            {isExtending ? (
              <>
                <Clock className="mr-2 size-4 animate-spin" aria-hidden="true" />
                <span>Extending...</span>
              </>
            ) : (
              <>
                <Clock className="mr-2 size-4" aria-hidden="true" />
                <span>Extend Session</span>
              </>
            )}
          </Button>
        </DialogFooter>

        {/* Additional warning for critical status */}
        {status === 'critical' && (
          <div
            className="mt-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            <AlertTriangle className="mb-1 inline-block size-4 mr-1" aria-hidden="true" />
            <strong>Critical:</strong> Your session is about to expire. Please save your work
            immediately.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}