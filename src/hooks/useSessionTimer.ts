'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getTimeRemaining, formatTimeRemaining } from '@/lib/auth/tokenManager';

interface UseSessionTimerOptions {
  /** Update interval in milliseconds (default: 1000 = 1 second) */
  updateInterval?: number;
  /** Only update when time remaining is less than this value in seconds (default: 600 = 10 minutes) */
  updateThreshold?: number;
  /** Warning threshold in seconds (default: 300 = 5 minutes) */
  warningThreshold?: number;
  /** Critical threshold in seconds (default: 60 = 1 minute) */
  criticalThreshold?: number;
  /** Whether the timer is enabled (default: true) */
  enabled?: boolean;
  /** Callback when warning threshold is reached */
  onWarning?: () => void;
  /** Callback when critical threshold is reached */
  onCritical?: () => void;
  /** Callback when session expires */
  onExpired?: () => void;
}

export type SessionStatus = 'active' | 'warning' | 'critical' | 'expired';

interface SessionTimerState {
  /** Time remaining in seconds */
  timeRemaining: number;
  /** Formatted time string (e.g., "1d 2h 30m", "45m 30s", "2m 15s") */
  formattedTime: string;
  /** Whether the session is in warning state */
  isWarning: boolean;
  /** Whether the session is in critical state */
  isCritical: boolean;
  /** Whether the session has expired */
  isExpired: boolean;
  /** Current session status */
  status: SessionStatus;
  /** Percentage of time remaining (0-100) */
  percentageRemaining: number;
}

/**
 * Custom hook for session countdown timer
 * Provides real-time session expiry tracking with formatted time display
 */
export function useSessionTimer({
  updateInterval = 1000,
  updateThreshold = 600, // 10 minutes
  warningThreshold = 300, // 5 minutes
  criticalThreshold = 60, // 1 minute
  enabled = true,
  onWarning,
  onCritical,
  onExpired,
}: UseSessionTimerOptions = {}): SessionTimerState {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredWarning = useRef(false);
  const hasTriggeredCritical = useRef(false);
  const hasTriggeredExpired = useRef(false);

  // Calculate derived state
  const isWarning = timeRemaining > 0 && timeRemaining <= warningThreshold;
  const isCritical = timeRemaining > 0 && timeRemaining <= criticalThreshold;
  const isExpired = timeRemaining <= 0;

  // Determine status
  const status: SessionStatus = isExpired
    ? 'expired'
    : isCritical
    ? 'critical'
    : isWarning
    ? 'warning'
    : 'active';

  // Calculate percentage remaining (assuming 60 minutes = 3600 seconds max session time)
  const maxSessionTime = 3600; // 60 minutes in seconds
  const percentageRemaining = Math.min(100, Math.max(0, (timeRemaining / maxSessionTime) * 100));

  // Format time
  const formattedTime = formatTimeRemaining(timeRemaining);

  // Update time function
  const updateTime = useCallback(() => {
    const remaining = getTimeRemaining();
    setTimeRemaining(remaining);

    // Trigger callbacks based on thresholds
    if (!hasTriggeredWarning.current && remaining > 0 && remaining <= warningThreshold) {
      hasTriggeredWarning.current = true;
      if (onWarning) onWarning();
    }

    if (!hasTriggeredCritical.current && remaining > 0 && remaining <= criticalThreshold) {
      hasTriggeredCritical.current = true;
      if (onCritical) onCritical();
    }

    if (!hasTriggeredExpired.current && remaining <= 0) {
      hasTriggeredExpired.current = true;
      if (onExpired) onExpired();
    }

    // Reset triggers when time increases (e.g., after session extension)
    if (remaining > warningThreshold) {
      hasTriggeredWarning.current = false;
    }
    if (remaining > criticalThreshold) {
      hasTriggeredCritical.current = false;
    }
    if (remaining > 0) {
      hasTriggeredExpired.current = false;
    }
  }, [warningThreshold, criticalThreshold, onWarning, onCritical, onExpired]);

  // Set up timer
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial update
    updateTime();

    // Set up interval based on threshold
    const setupInterval = () => {
      const currentRemaining = getTimeRemaining();

      // Clear existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Only set up interval if below threshold or expired
      if (currentRemaining <= updateThreshold || currentRemaining <= 0) {
        intervalRef.current = setInterval(updateTime, updateInterval);
      } else {
        // Check again in 30 seconds if above threshold
        intervalRef.current = setInterval(() => {
          updateTime();
          setupInterval(); // Re-evaluate whether to start frequent updates
        }, 30000); // 30 seconds
      }
    };

    setupInterval();

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, updateInterval, updateThreshold, updateTime]);

  /**
   * Force update the timer
   */
  const forceUpdate = useCallback(() => {
    updateTime();
  }, [updateTime]);

  return {
    timeRemaining,
    formattedTime,
    isWarning,
    isCritical,
    isExpired,
    status,
    percentageRemaining,
  };
}

/**
 * Hook for simple time formatting without full timer functionality
 */
export function useFormattedTime(seconds: number): string {
  return formatTimeRemaining(seconds);
}