import { renderHook, act } from '@testing-library/react';
import { useSessionTimer } from '@/hooks/useSessionTimer';

describe('useSessionTimer', () => {
  let originalDateNow: typeof Date.now;

  beforeEach(() => {
    jest.useFakeTimers();
    originalDateNow = Date.now;
    Date.now = jest.fn(() => new Date('2025-01-03T10:00:00Z').getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
    Date.now = originalDateNow;
  });

  describe('Time Remaining Calculation', () => {
    it('should calculate correct time remaining', () => {
      const expiresAt = new Date('2025-01-03T10:30:00Z'); // 30 minutes from now

      const { result } = renderHook(() => useSessionTimer(expiresAt));

      expect(result.current.timeRemaining).toBe(30 * 60 * 1000); // 30 minutes in ms
    });

    it('should update time remaining every second', () => {
      const expiresAt = new Date('2025-01-03T10:30:00Z');

      const { result } = renderHook(() => useSessionTimer(expiresAt));

      expect(result.current.timeRemaining).toBe(30 * 60 * 1000);

      // Advance time by 1 second
      act(() => {
        Date.now = jest.fn(() => new Date('2025-01-03T10:00:01Z').getTime());
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.timeRemaining).toBe(30 * 60 * 1000 - 1000);

      // Advance time by another 10 seconds
      act(() => {
        Date.now = jest.fn(() => new Date('2025-01-03T10:00:11Z').getTime());
        jest.advanceTimersByTime(10000);
      });

      expect(result.current.timeRemaining).toBe(30 * 60 * 1000 - 11000);
    });

    it('should handle expired sessions', () => {
      const expiresAt = new Date('2025-01-03T09:59:00Z'); // 1 minute ago

      const { result } = renderHook(() => useSessionTimer(expiresAt));

      expect(result.current.timeRemaining).toBe(0);
      expect(result.current.isExpired).toBe(true);
    });

    it('should handle null expiry date', () => {
      const { result } = renderHook(() => useSessionTimer(null));

      expect(result.current.timeRemaining).toBe(0);
      expect(result.current.isExpired).toBe(true);
      expect(result.current.formattedTime).toBe('Expired');
    });

    it('should handle undefined expiry date', () => {
      const { result } = renderHook(() => useSessionTimer(undefined));

      expect(result.current.timeRemaining).toBe(0);
      expect(result.current.isExpired).toBe(true);
      expect(result.current.formattedTime).toBe('Expired');
    });
  });

  describe('Formatted Time Output', () => {
    it('should format hours and minutes', () => {
      const expiresAt = new Date('2025-01-03T12:30:00Z'); // 2.5 hours from now

      const { result } = renderHook(() => useSessionTimer(expiresAt));

      expect(result.current.formattedTime).toBe('2h 30m');
    });

    it('should format only minutes when less than 1 hour', () => {
      const expiresAt = new Date('2025-01-03T10:45:00Z'); // 45 minutes from now

      const { result } = renderHook(() => useSessionTimer(expiresAt));

      expect(result.current.formattedTime).toBe('45m');
    });

    it('should format seconds when less than 1 minute', () => {
      const expiresAt = new Date('2025-01-03T10:00:30Z'); // 30 seconds from now

      const { result } = renderHook(() => useSessionTimer(expiresAt));

      expect(result.current.formattedTime).toBe('30s');
    });

    it('should show "Expired" for expired sessions', () => {
      const expiresAt = new Date('2025-01-03T09:00:00Z'); // 1 hour ago

      const { result } = renderHook(() => useSessionTimer(expiresAt));

      expect(result.current.formattedTime).toBe('Expired');
    });

    it('should update formatted time as time passes', () => {
      const expiresAt = new Date('2025-01-03T10:01:00Z'); // 1 minute from now

      const { result } = renderHook(() => useSessionTimer(expiresAt));

      expect(result.current.formattedTime).toBe('1m');

      // Advance to 30 seconds remaining
      act(() => {
        Date.now = jest.fn(() => new Date('2025-01-03T10:00:30Z').getTime());
        jest.advanceTimersByTime(30000);
      });

      expect(result.current.formattedTime).toBe('30s');

      // Advance to expired
      act(() => {
        Date.now = jest.fn(() => new Date('2025-01-03T10:01:01Z').getTime());
        jest.advanceTimersByTime(31000);
      });

      expect(result.current.formattedTime).toBe('Expired');
    });
  });

  describe('Warning State Changes', () => {
    it('should trigger warning at 5 minutes', () => {
      const expiresAt = new Date('2025-01-03T10:05:00Z'); // 5 minutes from now

      const { result } = renderHook(() => useSessionTimer(expiresAt));

      expect(result.current.shouldWarn).toBe(true);
    });

    it('should trigger warning at 4 minutes', () => {
      const expiresAt = new Date('2025-01-03T10:04:00Z'); // 4 minutes from now

      const { result } = renderHook(() => useSessionTimer(expiresAt));

      expect(result.current.shouldWarn).toBe(true);
    });

    it('should not trigger warning at 6 minutes', () => {
      const expiresAt = new Date('2025-01-03T10:06:00Z'); // 6 minutes from now

      const { result } = renderHook(() => useSessionTimer(expiresAt));

      expect(result.current.shouldWarn).toBe(false);
    });

    it('should transition warning state as time passes', () => {
      const expiresAt = new Date('2025-01-03T10:06:00Z'); // 6 minutes from now

      const { result } = renderHook(() => useSessionTimer(expiresAt));

      expect(result.current.shouldWarn).toBe(false);

      // Advance to 5 minutes remaining
      act(() => {
        Date.now = jest.fn(() => new Date('2025-01-03T10:01:00Z').getTime());
        jest.advanceTimersByTime(60000);
      });

      expect(result.current.shouldWarn).toBe(true);
    });

    it('should maintain warning state until expiry', () => {
      const expiresAt = new Date('2025-01-03T10:03:00Z'); // 3 minutes from now

      const { result } = renderHook(() => useSessionTimer(expiresAt));

      expect(result.current.shouldWarn).toBe(true);

      // Advance time but still under 5 minutes
      act(() => {
        Date.now = jest.fn(() => new Date('2025-01-03T10:02:00Z').getTime());
        jest.advanceTimersByTime(120000);
      });

      expect(result.current.shouldWarn).toBe(true);
    });
  });

  describe('Callback Invocations', () => {
    it('should call onWarning when entering warning threshold', () => {
      const onWarning = jest.fn();
      const onExpired = jest.fn();
      const expiresAt = new Date('2025-01-03T10:06:00Z'); // 6 minutes from now

      const { result } = renderHook(() =>
        useSessionTimer(expiresAt, { onWarning, onExpired })
      );

      expect(onWarning).not.toHaveBeenCalled();

      // Advance to warning threshold
      act(() => {
        Date.now = jest.fn(() => new Date('2025-01-03T10:01:00Z').getTime());
        jest.advanceTimersByTime(60000);
      });

      expect(onWarning).toHaveBeenCalledTimes(1);
      expect(onExpired).not.toHaveBeenCalled();
    });

    it('should call onExpired when session expires', () => {
      const onWarning = jest.fn();
      const onExpired = jest.fn();
      const expiresAt = new Date('2025-01-03T10:01:00Z'); // 1 minute from now

      const { result } = renderHook(() =>
        useSessionTimer(expiresAt, { onWarning, onExpired })
      );

      expect(onExpired).not.toHaveBeenCalled();

      // Advance to expiry
      act(() => {
        Date.now = jest.fn(() => new Date('2025-01-03T10:01:01Z').getTime());
        jest.advanceTimersByTime(61000);
      });

      expect(onExpired).toHaveBeenCalledTimes(1);
    });

    it('should only call onWarning once', () => {
      const onWarning = jest.fn();
      const expiresAt = new Date('2025-01-03T10:04:00Z'); // 4 minutes from now

      renderHook(() => useSessionTimer(expiresAt, { onWarning }));

      // Already in warning state
      expect(onWarning).toHaveBeenCalledTimes(1);

      // Advance time but still in warning
      act(() => {
        Date.now = jest.fn(() => new Date('2025-01-03T10:01:00Z').getTime());
        jest.advanceTimersByTime(60000);
      });

      // Should not call again
      expect(onWarning).toHaveBeenCalledTimes(1);
    });

    it('should only call onExpired once', () => {
      const onExpired = jest.fn();
      const expiresAt = new Date('2025-01-03T09:59:00Z'); // Already expired

      renderHook(() => useSessionTimer(expiresAt, { onExpired }));

      expect(onExpired).toHaveBeenCalledTimes(1);

      // Advance time
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should not call again
      expect(onExpired).toHaveBeenCalledTimes(1);
    });

    it('should handle callbacks that throw errors', () => {
      const onWarning = jest.fn(() => {
        throw new Error('Warning error');
      });
      const onExpired = jest.fn(() => {
        throw new Error('Expired error');
      });

      const expiresAt = new Date('2025-01-03T10:04:00Z');

      // Should not throw
      const { result } = renderHook(() =>
        useSessionTimer(expiresAt, { onWarning, onExpired })
      );

      expect(result.current.shouldWarn).toBe(true);
      expect(onWarning).toHaveBeenCalled();
    });
  });

  describe('Expiry Date Updates', () => {
    it('should reset timer when expiry date changes', () => {
      const { result, rerender } = renderHook(
        ({ expiresAt }) => useSessionTimer(expiresAt),
        { initialProps: { expiresAt: new Date('2025-01-03T10:05:00Z') } }
      );

      expect(result.current.timeRemaining).toBe(5 * 60 * 1000);
      expect(result.current.shouldWarn).toBe(true);

      // Update expiry to extend session
      rerender({ expiresAt: new Date('2025-01-03T11:00:00Z') });

      expect(result.current.timeRemaining).toBe(60 * 60 * 1000);
      expect(result.current.shouldWarn).toBe(false);
    });

    it('should handle expiry date becoming null', () => {
      const { result, rerender } = renderHook(
        ({ expiresAt }) => useSessionTimer(expiresAt),
        { initialProps: { expiresAt: new Date('2025-01-03T10:30:00Z') } }
      );

      expect(result.current.isExpired).toBe(false);

      rerender({ expiresAt: null });

      expect(result.current.isExpired).toBe(true);
      expect(result.current.formattedTime).toBe('Expired');
    });
  });

  describe('Cleanup', () => {
    it('should clear interval on unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const expiresAt = new Date('2025-01-03T10:30:00Z');

      const { unmount } = renderHook(() => useSessionTimer(expiresAt));

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('should not update state after unmount', () => {
      const expiresAt = new Date('2025-01-03T10:30:00Z');
      const { result, unmount } = renderHook(() => useSessionTimer(expiresAt));

      const initialTime = result.current.timeRemaining;
      unmount();

      // Advance timers
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Time should not have changed after unmount
      expect(result.current.timeRemaining).toBe(initialTime);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long sessions', () => {
      const expiresAt = new Date('2025-01-10T10:00:00Z'); // 7 days from now

      const { result } = renderHook(() => useSessionTimer(expiresAt));

      expect(result.current.formattedTime).toBe('168h 0m');
      expect(result.current.shouldWarn).toBe(false);
    });

    it('should handle exact warning threshold', () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Exactly 5 minutes

      const { result } = renderHook(() => useSessionTimer(expiresAt));

      expect(result.current.shouldWarn).toBe(true);
    });

    it('should handle rapid expiry date changes', () => {
      const { result, rerender } = renderHook(
        ({ expiresAt }) => useSessionTimer(expiresAt),
        { initialProps: { expiresAt: new Date('2025-01-03T10:05:00Z') } }
      );

      // Rapid updates
      for (let i = 0; i < 10; i++) {
        const newExpiry = new Date(`2025-01-03T10:${10 + i}:00Z`);
        rerender({ expiresAt: newExpiry });
      }

      // Should handle last update correctly
      expect(result.current.timeRemaining).toBe(19 * 60 * 1000);
    });
  });

  describe('Performance', () => {
    it('should not cause excessive re-renders', () => {
      const renderCount = jest.fn();
      const expiresAt = new Date('2025-01-03T10:30:00Z');

      renderHook(() => {
        renderCount();
        return useSessionTimer(expiresAt);
      });

      const initialRenders = renderCount.mock.calls.length;

      // Advance time by 10 seconds (10 updates)
      act(() => {
        for (let i = 0; i < 10; i++) {
          jest.advanceTimersByTime(1000);
        }
      });

      // Should have re-rendered for each second
      expect(renderCount.mock.calls.length).toBe(initialRenders + 10);
    });
  });
});