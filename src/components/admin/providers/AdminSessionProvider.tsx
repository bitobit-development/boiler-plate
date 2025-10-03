'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useActivityDetector } from '@/hooks/useActivityDetector';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import {
  getSessionStatus,
  extendSession,
  refreshAccessToken,
  needsTokenRefresh,
  isSessionExpiringSoon,
  tokenManager,
  type SessionStatus,
} from '@/lib/auth/tokenManager';

interface SessionContextValue {
  /** Current session status from backend */
  sessionStatus: SessionStatus | null;
  /** Whether session is valid */
  isAuthenticated: boolean;
  /** Whether session is loading */
  isLoading: boolean;
  /** Last activity time */
  lastActivityTime: Date;
  /** Time remaining in seconds */
  timeRemaining: number;
  /** Formatted time string */
  formattedTime: string;
  /** Whether warning should be shown */
  showWarning: boolean;
  /** Session status type */
  status: 'active' | 'warning' | 'critical' | 'expired';
  /** Manually extend the session */
  handleExtendSession: () => Promise<void>;
  /** Manually refresh the session status */
  refreshSession: () => Promise<void>;
  /** Logout function */
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function useAdminSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useAdminSession must be used within AdminSessionProvider');
  }
  return context;
}

interface AdminSessionProviderProps {
  children: ReactNode;
  /** Poll interval in milliseconds (default: 5 minutes) */
  pollInterval?: number;
  /** Auto refresh threshold in minutes (default: 10 minutes) */
  autoRefreshThreshold?: number;
  /** Warning threshold in minutes (default: 5 minutes) */
  warningThreshold?: number;
}

export function AdminSessionProvider({
  children,
  pollInterval = 300000, // 5 minutes
  autoRefreshThreshold = 10, // 10 minutes
  warningThreshold = 5, // 5 minutes
}: AdminSessionProviderProps) {
  const router = useRouter();
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoRefreshRef = useRef<boolean>(false);

  // Activity detector
  const { lastActivityTime, triggerActivity } = useActivityDetector({
    debounceTime: 60000, // 1 minute
    enabled: true,
    onActivity: async () => {
      // Update last activity when user is active
      if (sessionStatus?.isValid && !autoRefreshRef.current) {
        // Check if we need to auto-refresh
        if (needsTokenRefresh()) {
          autoRefreshRef.current = true;
          await handleAutoRefresh();
          autoRefreshRef.current = false;
        }
      }
    },
  });

  // Session timer
  const {
    timeRemaining,
    formattedTime,
    isWarning,
    isCritical,
    isExpired,
    status,
  } = useSessionTimer({
    enabled: sessionStatus?.isValid ?? false,
    warningThreshold: warningThreshold * 60, // Convert to seconds
    onWarning: () => {
      setShowWarning(true);
    },
    onExpired: () => {
      handleSessionExpired();
    },
  });

  // Check session status
  const checkSession = useCallback(async () => {
    try {
      const status = await getSessionStatus();

      if (status) {
        setSessionStatus(status);

        // Auto-refresh if needed and not already refreshing
        if (status.needsRefresh && !autoRefreshRef.current) {
          autoRefreshRef.current = true;
          await handleAutoRefresh();
          autoRefreshRef.current = false;
        }
      } else {
        // Session invalid
        setSessionStatus(null);
        handleSessionExpired();
      }
    } catch (error) {
      console.error('Failed to check session status:', error);
      setSessionStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto refresh token
  const handleAutoRefresh = useCallback(async () => {
    try {
      const success = await refreshAccessToken();
      if (success) {
        // Refresh successful, check session status
        await checkSession();
        triggerActivity(); // Update activity time
      } else {
        // Refresh failed, session expired
        handleSessionExpired();
      }
    } catch (error) {
      console.error('Failed to auto-refresh token:', error);
      handleSessionExpired();
    }
  }, [checkSession, triggerActivity]);

  // Handle session expired
  const handleSessionExpired = useCallback(() => {
    // Clear tokens
    tokenManager.clearTokens();

    // Clear session status
    setSessionStatus(null);
    setShowWarning(false);

    // Redirect to login
    router.push('/admin/login?expired=true');
  }, [router]);

  // Manually extend session
  const handleExtendSession = useCallback(async () => {
    try {
      const status = await extendSession();
      if (status) {
        setSessionStatus(status);
        setShowWarning(false);
        triggerActivity(); // Update activity time
      } else {
        handleSessionExpired();
      }
    } catch (error) {
      console.error('Failed to extend session:', error);
      handleSessionExpired();
    }
  }, [handleSessionExpired, triggerActivity]);

  // Refresh session status
  const refreshSession = useCallback(async () => {
    await checkSession();
  }, [checkSession]);

  // Logout
  const logout = useCallback(async () => {
    try {
      // Call logout endpoint
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens and redirect
      tokenManager.clearTokens();
      setSessionStatus(null);
      router.push('/admin/login');
    }
  }, [router]);

  // Initial session check
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Set up polling
  useEffect(() => {
    if (!sessionStatus?.isValid) {
      // Clear interval if session is invalid
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    // Set up polling interval
    pollIntervalRef.current = setInterval(() => {
      checkSession();
    }, pollInterval);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [sessionStatus?.isValid, pollInterval, checkSession]);

  // Handle visibility change (tab focus)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && sessionStatus?.isValid) {
        // Tab became visible, check session
        checkSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sessionStatus?.isValid, checkSession]);

  // Auto-hide warning when time increases (after extension)
  useEffect(() => {
    if (!isWarning && !isCritical && showWarning) {
      setShowWarning(false);
    }
  }, [isWarning, isCritical, showWarning]);

  const contextValue: SessionContextValue = {
    sessionStatus,
    isAuthenticated: sessionStatus?.isValid ?? false,
    isLoading,
    lastActivityTime,
    timeRemaining,
    formattedTime,
    showWarning: showWarning && (isWarning || isCritical),
    status,
    handleExtendSession,
    refreshSession,
    logout,
  };

  return <SessionContext.Provider value={contextValue}>{children}</SessionContext.Provider>;
}