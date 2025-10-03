import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AdminSessionProvider, useAdminSession } from '@/components/admin/providers/AdminSessionProvider';
import * as tokenManager from '@/lib/auth/tokenManager';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

jest.mock('@/lib/auth/tokenManager', () => ({
  getSessionStatus: jest.fn(),
  extendSession: jest.fn(),
  refreshAccessToken: jest.fn(),
  getTimeRemaining: jest.fn(),
  formatTimeRemaining: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn();

// Test component to access context
const TestComponent = () => {
  const context = useAdminSession();
  return (
    <div>
      <div data-testid="expires-at">{context.sessionExpiresAt?.toString()}</div>
      <div data-testid="warning-visible">{context.isWarningVisible.toString()}</div>
      <div data-testid="time-remaining">{context.timeRemaining}</div>
      <div data-testid="formatted-time">{context.formattedTime}</div>
    </div>
  );
};

describe('AdminSessionProvider', () => {
  let mockRouter: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-03T10:00:00Z'));

    mockRouter = {
      push: jest.fn(),
      refresh: jest.fn()
    };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    // Default mock implementations
    (tokenManager.getSessionStatus as jest.Mock).mockResolvedValue({
      success: true,
      session: {
        expiresAt: new Date('2025-01-03T11:00:00Z').toISOString(),
        isActive: true
      }
    });

    (tokenManager.extendSession as jest.Mock).mockResolvedValue({
      success: true,
      session: {
        expiresAt: new Date('2025-01-03T11:00:00Z').toISOString()
      }
    });

    (tokenManager.refreshAccessToken as jest.Mock).mockResolvedValue({
      success: true,
      accessToken: 'new-token'
    });

    (tokenManager.getTimeRemaining as jest.Mock).mockReturnValue(60 * 60 * 1000);
    (tokenManager.formatTimeRemaining as jest.Mock).mockReturnValue('1h 0m');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Session Polling', () => {
    it('should poll session status on mount', async () => {
      render(
        <AdminSessionProvider>
          <TestComponent />
        </AdminSessionProvider>
      );

      await waitFor(() => {
        expect(tokenManager.getSessionStatus).toHaveBeenCalled();
      });

      expect(screen.getByTestId('expires-at')).toHaveTextContent('2025-01-03T11:00:00.000Z');
    });

    it('should poll session status every 30 seconds', async () => {
      render(
        <AdminSessionProvider>
          <TestComponent />
        </AdminSessionProvider>
      );

      expect(tokenManager.getSessionStatus).toHaveBeenCalledTimes(1);

      // Advance 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(tokenManager.getSessionStatus).toHaveBeenCalledTimes(2);
      });

      // Advance another 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(tokenManager.getSessionStatus).toHaveBeenCalledTimes(3);
      });
    });

    it('should stop polling on unmount', async () => {
      const { unmount } = render(
        <AdminSessionProvider>
          <TestComponent />
        </AdminSessionProvider>
      );

      await waitFor(() => {
        expect(tokenManager.getSessionStatus).toHaveBeenCalledTimes(1);
      });

      unmount();

      // Advance time after unmount
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      // Should not have made additional calls
      expect(tokenManager.getSessionStatus).toHaveBeenCalledTimes(1);
    });

    it('should handle polling errors gracefully', async () => {
      (tokenManager.getSessionStatus as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(
        <AdminSessionProvider>
          <TestComponent />
        </AdminSessionProvider>
      );

      await waitFor(() => {
        expect(tokenManager.getSessionStatus).toHaveBeenCalled();
      });

      // Should not crash and continue polling
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(tokenManager.getSessionStatus).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Auto-refresh When < 10 Minutes', () => {
    it('should auto-refresh when time remaining is less than 10 minutes', async () => {
      // Set initial session with 9 minutes remaining
      (tokenManager.getSessionStatus as jest.Mock).mockResolvedValue({
        success: true,
        session: {
          expiresAt: new Date('2025-01-03T10:09:00Z').toISOString(), // 9 minutes from now
          isActive: true
        }
      });
      (tokenManager.getTimeRemaining as jest.Mock).mockReturnValue(9 * 60 * 1000);

      render(
        <AdminSessionProvider>
          <TestComponent />
        </AdminSessionProvider>
      );

      await waitFor(() => {
        expect(tokenManager.refreshAccessToken).toHaveBeenCalled();
      });
    });

    it('should not auto-refresh when time remaining is more than 10 minutes', async () => {
      // Set initial session with 30 minutes remaining
      (tokenManager.getSessionStatus as jest.Mock).mockResolvedValue({
        success: true,
        session: {
          expiresAt: new Date('2025-01-03T10:30:00Z').toISOString(),
          isActive: true
        }
      });
      (tokenManager.getTimeRemaining as jest.Mock).mockReturnValue(30 * 60 * 1000);

      render(
        <AdminSessionProvider>
          <TestComponent />
        </AdminSessionProvider>
      );

      await waitFor(() => {
        expect(tokenManager.getSessionStatus).toHaveBeenCalled();
      });

      expect(tokenManager.refreshAccessToken).not.toHaveBeenCalled();
    });

    it('should update session after successful refresh', async () => {
      (tokenManager.getSessionStatus as jest.Mock).mockResolvedValue({
        success: true,
        session: {
          expiresAt: new Date('2025-01-03T10:09:00Z').toISOString(),
          isActive: true
        }
      });
      (tokenManager.getTimeRemaining as jest.Mock).mockReturnValue(9 * 60 * 1000);

      (tokenManager.refreshAccessToken as jest.Mock).mockResolvedValue({
        success: true,
        accessToken: 'new-token',
        expiresAt: new Date('2025-01-03T11:00:00Z').toISOString() // Extended to 60 minutes
      });

      render(
        <AdminSessionProvider>
          <TestComponent />
        </AdminSessionProvider>
      );

      await waitFor(() => {
        expect(tokenManager.refreshAccessToken).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByTestId('expires-at')).toHaveTextContent('2025-01-03T11:00:00.000Z');
      });
    });
  });

  describe('Activity Triggers Extension', () => {
    it('should extend session on user activity', async () => {
      render(
        <AdminSessionProvider>
          <TestComponent />
        </AdminSessionProvider>
      );

      await waitFor(() => {
        expect(tokenManager.getSessionStatus).toHaveBeenCalled();
      });

      // Simulate user activity
      act(() => {
        window.dispatchEvent(new MouseEvent('mousemove'));
      });

      // Wait for debounce
      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(tokenManager.extendSession).toHaveBeenCalled();
      });
    });

    it('should update session after activity extension', async () => {
      (tokenManager.extendSession as jest.Mock).mockResolvedValue({
        success: true,
        session: {
          expiresAt: new Date('2025-01-03T11:30:00Z').toISOString() // Extended
        }
      });

      render(
        <AdminSessionProvider>
          <TestComponent />
        </AdminSessionProvider>
      );

      await waitFor(() => {
        expect(tokenManager.getSessionStatus).toHaveBeenCalled();
      });

      // Trigger activity
      act(() => {
        window.dispatchEvent(new MouseEvent('click'));
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByTestId('expires-at')).toHaveTextContent('2025-01-03T11:30:00.000Z');
      });
    });

    it('should debounce multiple activity events', async () => {
      render(
        <AdminSessionProvider>
          <TestComponent />
        </AdminSessionProvider>
      );

      // Trigger multiple activities rapidly
      act(() => {
        for (let i = 0; i < 5; i++) {
          window.dispatchEvent(new MouseEvent('mousemove'));
          jest.advanceTimersByTime(100);
        }
      });

      // Complete debounce
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should only extend once due to debouncing
      await waitFor(() => {
        expect(tokenManager.extendSession).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Session Expiry Redirect', () => {
    it('should redirect to login when session expires', async () => {
      // Start with valid session
      render(
        <AdminSessionProvider>
          <TestComponent />
        </AdminSessionProvider>
      );

      await waitFor(() => {
        expect(tokenManager.getSessionStatus).toHaveBeenCalled();
      });

      // Simulate session expiry on next poll
      (tokenManager.getSessionStatus as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Session expired'
      });

      act(() => {
        jest.advanceTimersByTime(30000); // Trigger next poll
      });

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/admin/login');
      });
    });

    it('should redirect when session becomes inactive', async () => {
      render(
        <AdminSessionProvider>
          <TestComponent />
        </AdminSessionProvider>
      );

      // Simulate inactive session on next poll
      (tokenManager.getSessionStatus as jest.Mock).mockResolvedValue({
        success: true,
        session: {
          expiresAt: new Date('2025-01-03T11:00:00Z').toISOString(),
          isActive: false
        }
      });

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/admin/login');
      });
    });

    it('should not redirect for active sessions', async () => {
      render(
        <AdminSessionProvider>
          <TestComponent />
        </AdminSessionProvider>
      );

      // Poll multiple times with active session
      for (let i = 0; i < 5; i++) {
        act(() => {
          jest.advanceTimersByTime(30000);
        });

        await waitFor(() => {
          expect(tokenManager.getSessionStatus).toHaveBeenCalledTimes(i + 2);
        });
      }

      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe('Warning State Management', () => {
    it('should show warning when time remaining < 5 minutes', async () => {
      (tokenManager.getSessionStatus as jest.Mock).mockResolvedValue({
        success: true,
        session: {
          expiresAt: new Date('2025-01-03T10:04:00Z').toISOString(), // 4 minutes
          isActive: true
        }
      });
      (tokenManager.getTimeRemaining as jest.Mock).mockReturnValue(4 * 60 * 1000);
      (tokenManager.formatTimeRemaining as jest.Mock).mockReturnValue('4m');

      render(
        <AdminSessionProvider>
          <TestComponent />
        </AdminSessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('warning-visible')).toHaveTextContent('true');
      });
    });

    it('should hide warning when time remaining > 5 minutes', async () => {
      render(
        <AdminSessionProvider>
          <TestComponent />
        </AdminSessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('warning-visible')).toHaveTextContent('false');
      });
    });

    it('should update warning state dynamically', async () => {
      render(
        <AdminSessionProvider>
          <TestComponent />
        </AdminSessionProvider>
      );

      // Initially no warning
      await waitFor(() => {
        expect(screen.getByTestId('warning-visible')).toHaveTextContent('false');
      });

      // Update to warning threshold
      (tokenManager.getSessionStatus as jest.Mock).mockResolvedValue({
        success: true,
        session: {
          expiresAt: new Date('2025-01-03T10:04:30Z').toISOString(),
          isActive: true
        }
      });
      (tokenManager.getTimeRemaining as jest.Mock).mockReturnValue(4.5 * 60 * 1000);

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('warning-visible')).toHaveTextContent('true');
      });
    });
  });

  describe('Time Display Updates', () => {
    it('should update time remaining every second', async () => {
      let currentTime = 60 * 60 * 1000; // Start with 1 hour

      (tokenManager.getTimeRemaining as jest.Mock).mockImplementation(() => {
        return currentTime;
      });

      (tokenManager.formatTimeRemaining as jest.Mock).mockImplementation((ms) => {
        const minutes = Math.floor(ms / 60000);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      });

      render(
        <AdminSessionProvider>
          <TestComponent />
        </AdminSessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('formatted-time')).toHaveTextContent('1h 0m');
      });

      // Simulate time passing
      act(() => {
        currentTime = 59 * 60 * 1000 + 59000; // 59:59
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('formatted-time')).toHaveTextContent('59m');
      });
    });

    it('should handle time remaining calculation correctly', async () => {
      render(
        <AdminSessionProvider>
          <TestComponent />
        </AdminSessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('time-remaining')).toHaveTextContent('3600000'); // 60 minutes in ms
      });
    });
  });

  describe('Context Hook Usage', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAdminSession must be used within AdminSessionProvider');

      console.error = originalError;
    });

    it('should provide all context values', async () => {
      render(
        <AdminSessionProvider>
          <TestComponent />
        </AdminSessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('expires-at')).toBeDefined();
        expect(screen.getByTestId('warning-visible')).toBeDefined();
        expect(screen.getByTestId('time-remaining')).toBeDefined();
        expect(screen.getByTestId('formatted-time')).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle extension failures gracefully', async () => {
      (tokenManager.extendSession as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Extension failed'
      });

      render(
        <AdminSessionProvider>
          <TestComponent />
        </AdminSessionProvider>
      );

      // Trigger activity
      act(() => {
        window.dispatchEvent(new MouseEvent('click'));
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should have attempted extension
      await waitFor(() => {
        expect(tokenManager.extendSession).toHaveBeenCalled();
      });

      // Session should remain unchanged
      expect(screen.getByTestId('expires-at')).toHaveTextContent('2025-01-03T11:00:00.000Z');
    });

    it('should handle refresh failures gracefully', async () => {
      (tokenManager.getSessionStatus as jest.Mock).mockResolvedValue({
        success: true,
        session: {
          expiresAt: new Date('2025-01-03T10:09:00Z').toISOString(),
          isActive: true
        }
      });
      (tokenManager.getTimeRemaining as jest.Mock).mockReturnValue(9 * 60 * 1000);

      (tokenManager.refreshAccessToken as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Refresh failed'
      });

      render(
        <AdminSessionProvider>
          <TestComponent />
        </AdminSessionProvider>
      );

      await waitFor(() => {
        expect(tokenManager.refreshAccessToken).toHaveBeenCalled();
      });

      // Should not crash
      expect(screen.getByTestId('expires-at')).toBeDefined();
    });
  });
});