import { renderHook, act } from '@testing-library/react';
import { useActivityDetector } from '@/hooks/useActivityDetector';

describe('useActivityDetector', () => {
  let mockCallback: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    mockCallback = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Event Detection', () => {
    it('should detect mouse movement', () => {
      const { unmount } = renderHook(() => useActivityDetector(mockCallback));

      act(() => {
        const event = new MouseEvent('mousemove');
        window.dispatchEvent(event);
      });

      // Should be debounced, so wait for debounce time
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);
      unmount();
    });

    it('should detect keyboard activity', () => {
      const { unmount } = renderHook(() => useActivityDetector(mockCallback));

      act(() => {
        const event = new KeyboardEvent('keydown');
        window.dispatchEvent(event);
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);
      unmount();
    });

    it('should detect mouse clicks', () => {
      const { unmount } = renderHook(() => useActivityDetector(mockCallback));

      act(() => {
        const event = new MouseEvent('click');
        window.dispatchEvent(event);
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);
      unmount();
    });

    it('should detect scroll events', () => {
      const { unmount } = renderHook(() => useActivityDetector(mockCallback));

      act(() => {
        const event = new Event('scroll');
        window.dispatchEvent(event);
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);
      unmount();
    });

    it('should detect touch events', () => {
      const { unmount } = renderHook(() => useActivityDetector(mockCallback));

      act(() => {
        const event = new TouchEvent('touchstart', {
          touches: [{ clientX: 0, clientY: 0 } as Touch]
        });
        window.dispatchEvent(event);
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);
      unmount();
    });

    it('should detect all event types', () => {
      const { unmount } = renderHook(() => useActivityDetector(mockCallback));

      const events = [
        new MouseEvent('mousemove'),
        new KeyboardEvent('keydown'),
        new MouseEvent('click'),
        new Event('scroll'),
        new TouchEvent('touchstart', { touches: [] })
      ];

      events.forEach(event => {
        act(() => {
          window.dispatchEvent(event);
          jest.advanceTimersByTime(500);
        });
      });

      expect(mockCallback).toHaveBeenCalledTimes(events.length);
      unmount();
    });
  });

  describe('Debouncing Behavior', () => {
    it('should debounce rapid events', () => {
      const { unmount } = renderHook(() => useActivityDetector(mockCallback));

      // Fire multiple events rapidly
      act(() => {
        for (let i = 0; i < 10; i++) {
          const event = new MouseEvent('mousemove');
          window.dispatchEvent(event);
          jest.advanceTimersByTime(100); // Less than debounce time
        }
      });

      // Should only be called once due to debouncing
      expect(mockCallback).toHaveBeenCalledTimes(1);
      unmount();
    });

    it('should call callback for spaced out events', () => {
      const { unmount } = renderHook(() => useActivityDetector(mockCallback));

      act(() => {
        // First event
        window.dispatchEvent(new MouseEvent('mousemove'));
        jest.advanceTimersByTime(500);
      });

      act(() => {
        // Second event after debounce time
        window.dispatchEvent(new MouseEvent('mousemove'));
        jest.advanceTimersByTime(500);
      });

      act(() => {
        // Third event after debounce time
        window.dispatchEvent(new MouseEvent('mousemove'));
        jest.advanceTimersByTime(500);
      });

      expect(mockCallback).toHaveBeenCalledTimes(3);
      unmount();
    });

    it('should reset debounce timer on new event', () => {
      const { unmount } = renderHook(() => useActivityDetector(mockCallback));

      act(() => {
        window.dispatchEvent(new MouseEvent('mousemove'));
        jest.advanceTimersByTime(400); // Almost at debounce time
        window.dispatchEvent(new MouseEvent('click')); // Reset timer
        jest.advanceTimersByTime(400); // Not enough time since last event
      });

      expect(mockCallback).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(100); // Complete debounce time
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);
      unmount();
    });
  });

  describe('Cleanup on Unmount', () => {
    it('should remove all event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() => useActivityDetector(mockCallback));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    it('should not call callback after unmount', () => {
      const { unmount } = renderHook(() => useActivityDetector(mockCallback));

      unmount();

      act(() => {
        window.dispatchEvent(new MouseEvent('mousemove'));
        jest.advanceTimersByTime(500);
      });

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should clear pending debounced calls on unmount', () => {
      const { unmount } = renderHook(() => useActivityDetector(mockCallback));

      act(() => {
        window.dispatchEvent(new MouseEvent('mousemove'));
        // Don't advance timers yet
      });

      unmount();

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Callback Updates', () => {
    it('should use latest callback', () => {
      const firstCallback = jest.fn();
      const secondCallback = jest.fn();

      const { rerender } = renderHook(
        ({ callback }) => useActivityDetector(callback),
        { initialProps: { callback: firstCallback } }
      );

      act(() => {
        window.dispatchEvent(new MouseEvent('mousemove'));
        jest.advanceTimersByTime(500);
      });

      expect(firstCallback).toHaveBeenCalledTimes(1);
      expect(secondCallback).not.toHaveBeenCalled();

      // Update callback
      rerender({ callback: secondCallback });

      act(() => {
        window.dispatchEvent(new MouseEvent('mousemove'));
        jest.advanceTimersByTime(500);
      });

      expect(firstCallback).toHaveBeenCalledTimes(1); // No additional calls
      expect(secondCallback).toHaveBeenCalledTimes(1);
    });

    it('should handle callback that throws error', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });

      // Should not throw
      const { unmount } = renderHook(() => useActivityDetector(errorCallback));

      act(() => {
        window.dispatchEvent(new MouseEvent('mousemove'));
        jest.advanceTimersByTime(500);
      });

      expect(errorCallback).toHaveBeenCalled();
      unmount();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined callback gracefully', () => {
      const { unmount } = renderHook(() => useActivityDetector(undefined as any));

      // Should not throw
      act(() => {
        window.dispatchEvent(new MouseEvent('mousemove'));
        jest.advanceTimersByTime(500);
      });

      unmount();
    });

    it('should handle multiple hooks simultaneously', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const { unmount: unmount1 } = renderHook(() => useActivityDetector(callback1));
      const { unmount: unmount2 } = renderHook(() => useActivityDetector(callback2));

      act(() => {
        window.dispatchEvent(new MouseEvent('mousemove'));
        jest.advanceTimersByTime(500);
      });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      unmount1();
      unmount2();
    });

    it('should handle passive event listeners for performance', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const { unmount } = renderHook(() => useActivityDetector(mockCallback));

      // Check that passive option is used for scroll and touchstart
      const scrollCall = addEventListenerSpy.mock.calls.find(call => call[0] === 'scroll');
      const touchCall = addEventListenerSpy.mock.calls.find(call => call[0] === 'touchstart');

      expect(scrollCall?.[2]).toEqual(expect.objectContaining({ passive: true }));
      expect(touchCall?.[2]).toEqual(expect.objectContaining({ passive: true }));

      addEventListenerSpy.mockRestore();
      unmount();
    });
  });

  describe('Performance', () => {
    it('should not cause memory leaks', () => {
      const callbacks: jest.Mock[] = [];

      // Create and destroy multiple hooks
      for (let i = 0; i < 100; i++) {
        const callback = jest.fn();
        callbacks.push(callback);

        const { unmount } = renderHook(() => useActivityDetector(callback));

        act(() => {
          window.dispatchEvent(new MouseEvent('mousemove'));
          jest.advanceTimersByTime(500);
        });

        unmount();
      }

      // Verify no callbacks are called after all unmounts
      act(() => {
        window.dispatchEvent(new MouseEvent('mousemove'));
        jest.advanceTimersByTime(500);
      });

      callbacks.forEach(callback => {
        expect(callback).toHaveBeenCalledTimes(1); // Only the call before unmount
      });
    });
  });
});