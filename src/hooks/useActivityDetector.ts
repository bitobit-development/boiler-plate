'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseActivityDetectorOptions {
  /** Debounce time in milliseconds (default: 60000 = 1 minute) */
  debounceTime?: number;
  /** Events to track (default: ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']) */
  events?: string[];
  /** Whether the detector is enabled (default: true) */
  enabled?: boolean;
  /** Callback when activity is detected */
  onActivity?: () => void;
}

/**
 * Custom hook to detect user activity
 * Tracks user interactions and provides the last activity time
 */
export function useActivityDetector({
  debounceTime = 60000, // 1 minute default
  events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'],
  enabled = true,
  onActivity,
}: UseActivityDetectorOptions = {}) {
  const [lastActivityTime, setLastActivityTime] = useState<Date>(new Date());
  const lastTriggerTime = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleActivity = useCallback(() => {
    const now = Date.now();

    // Check if enough time has passed since last trigger
    if (now - lastTriggerTime.current >= debounceTime) {
      lastTriggerTime.current = now;
      const newActivityTime = new Date();
      setLastActivityTime(newActivityTime);

      // Call the callback if provided
      if (onActivity) {
        onActivity();
      }
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout to reset the debounce
    timeoutRef.current = setTimeout(() => {
      lastTriggerTime.current = 0;
    }, debounceTime);
  }, [debounceTime, onActivity]);

  useEffect(() => {
    if (!enabled) return;

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup function
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });

      // Clear timeout on unmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [events, handleActivity, enabled]);

  /**
   * Get the seconds since last activity
   */
  const getSecondsSinceLastActivity = useCallback(() => {
    return Math.floor((Date.now() - lastActivityTime.getTime()) / 1000);
  }, [lastActivityTime]);

  /**
   * Check if user has been idle for specified seconds
   */
  const isIdle = useCallback(
    (idleTimeInSeconds: number) => {
      return getSecondsSinceLastActivity() >= idleTimeInSeconds;
    },
    [getSecondsSinceLastActivity]
  );

  /**
   * Manually trigger activity (useful for programmatic activity detection)
   */
  const triggerActivity = useCallback(() => {
    handleActivity();
  }, [handleActivity]);

  return {
    lastActivityTime,
    getSecondsSinceLastActivity,
    isIdle,
    triggerActivity,
  };
}