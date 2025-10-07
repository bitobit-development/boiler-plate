import { useEffect, useRef } from 'react';

/**
 * POS Session Monitoring Hook
 *
 * Sends periodic heartbeat requests to keep the session alive
 * and track user activity. Call this hook in the main POS component
 * to enable automatic session renewal.
 *
 * @param intervalMs - Heartbeat interval in milliseconds (default: 5 minutes)
 * @param enabled - Whether heartbeat is enabled (default: true)
 */
export function usePOSSession(intervalMs: number = 5 * 60 * 1000, enabled: boolean = true) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const sendHeartbeat = async () => {
      try {
        const response = await fetch('/api/pos/heartbeat', {
          method: 'POST',
          credentials: 'include',
        });

        if (!response.ok) {
          console.warn('[usePOSSession] Heartbeat failed:', response.status);
        }
      } catch (error) {
        console.error('[usePOSSession] Heartbeat error:', error);
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval for periodic heartbeats
    intervalRef.current = setInterval(sendHeartbeat, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [intervalMs, enabled]);
}
