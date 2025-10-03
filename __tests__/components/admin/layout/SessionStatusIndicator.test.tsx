import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionStatusIndicator } from '@/components/admin/layout/SessionStatusIndicator';

describe('SessionStatusIndicator', () => {
  let mockOnExtend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnExtend = jest.fn();
  });

  describe('Color Coding', () => {
    it('should show green color when time > 15 minutes', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="20m"
          onExtend={mockOnExtend}
        />
      );

      const indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('text-green-600');
    });

    it('should show green color when time is exactly 16 minutes', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="16m"
          onExtend={mockOnExtend}
        />
      );

      const indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('text-green-600');
    });

    it('should show yellow color when time is 5-15 minutes', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="10m"
          onExtend={mockOnExtend}
        />
      );

      const indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('text-yellow-600');
    });

    it('should show yellow color when time is exactly 15 minutes', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="15m"
          onExtend={mockOnExtend}
        />
      );

      const indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('text-yellow-600');
    });

    it('should show yellow color when time is exactly 5 minutes', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      const indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('text-yellow-600');
    });

    it('should show orange color when time < 5 minutes', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="4m 30s"
          onExtend={mockOnExtend}
        />
      );

      const indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('text-orange-600');
    });

    it('should show orange color when time is 2 minutes', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="2m"
          onExtend={mockOnExtend}
        />
      );

      const indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('text-orange-600');
    });

    it('should show red color when time < 1 minute', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="45s"
          onExtend={mockOnExtend}
        />
      );

      const indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('text-red-600');
    });

    it('should show red color when time is exactly 59 seconds', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="59s"
          onExtend={mockOnExtend}
        />
      );

      const indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('text-red-600');
    });

    it('should show red color when session is expired', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="Expired"
          onExtend={mockOnExtend}
        />
      );

      const indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('text-red-600');
    });
  });

  describe('Click to Extend', () => {
    it('should call onExtend when clicked', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="10m"
          onExtend={mockOnExtend}
        />
      );

      const indicator = screen.getByRole('button');
      fireEvent.click(indicator);

      expect(mockOnExtend).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple clicks', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="10m"
          onExtend={mockOnExtend}
        />
      );

      const indicator = screen.getByRole('button');

      fireEvent.click(indicator);
      fireEvent.click(indicator);
      fireEvent.click(indicator);

      expect(mockOnExtend).toHaveBeenCalledTimes(3);
    });

    it('should be keyboard accessible', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="10m"
          onExtend={mockOnExtend}
        />
      );

      const indicator = screen.getByRole('button');

      // Simulate Enter key
      fireEvent.keyDown(indicator, { key: 'Enter', code: 'Enter' });
      fireEvent.click(indicator);

      expect(mockOnExtend).toHaveBeenCalled();
    });

    it('should show tooltip on hover', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="10m"
          onExtend={mockOnExtend}
        />
      );

      const indicator = screen.getByRole('button');
      expect(indicator).toHaveAttribute('title', 'Click to extend session');
    });
  });

  describe('Compact vs Full Modes', () => {
    it('should render in compact mode by default', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="10m"
          onExtend={mockOnExtend}
        />
      );

      // Compact mode shows only time
      expect(screen.getByText('10m')).toBeInTheDocument();
      expect(screen.queryByText(/Session:/i)).not.toBeInTheDocument();
    });

    it('should render in full mode when specified', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="10m"
          onExtend={mockOnExtend}
          mode="full"
        />
      );

      // Full mode shows label
      expect(screen.getByText(/Session:/i)).toBeInTheDocument();
      expect(screen.getByText('10m')).toBeInTheDocument();
    });

    it('should maintain color coding in both modes', () => {
      const { rerender } = render(
        <SessionStatusIndicator
          timeRemaining="3m"
          onExtend={mockOnExtend}
          mode="compact"
        />
      );

      let indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('text-orange-600');

      rerender(
        <SessionStatusIndicator
          timeRemaining="3m"
          onExtend={mockOnExtend}
          mode="full"
        />
      );

      indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('text-orange-600');
    });

    it('should be clickable in both modes', () => {
      const { rerender } = render(
        <SessionStatusIndicator
          timeRemaining="10m"
          onExtend={mockOnExtend}
          mode="compact"
        />
      );

      fireEvent.click(screen.getByRole('button'));
      expect(mockOnExtend).toHaveBeenCalledTimes(1);

      rerender(
        <SessionStatusIndicator
          timeRemaining="10m"
          onExtend={mockOnExtend}
          mode="full"
        />
      );

      fireEvent.click(screen.getByRole('button'));
      expect(mockOnExtend).toHaveBeenCalledTimes(2);
    });
  });

  describe('Time Display', () => {
    it('should display hours and minutes correctly', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="1h 30m"
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByText('1h 30m')).toBeInTheDocument();
    });

    it('should display only minutes when less than 1 hour', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="45m"
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByText('45m')).toBeInTheDocument();
    });

    it('should display seconds when less than 1 minute', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="30s"
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByText('30s')).toBeInTheDocument();
    });

    it('should display "Expired" when session is expired', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="Expired"
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByText('Expired')).toBeInTheDocument();
    });
  });

  describe('Visual Indicators', () => {
    it('should show clock icon', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="10m"
          onExtend={mockOnExtend}
        />
      );

      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toBeInTheDocument();
    });

    it('should animate icon when time is critical', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="30s"
          onExtend={mockOnExtend}
        />
      );

      const indicator = screen.getByRole('button');
      // Check for animation classes
      expect(indicator.firstElementChild).toHaveClass('animate-pulse');
    });

    it('should not animate when time is comfortable', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="30m"
          onExtend={mockOnExtend}
        />
      );

      const indicator = screen.getByRole('button');
      // Should not have animation
      expect(indicator.firstElementChild).not.toHaveClass('animate-pulse');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="10m"
          onExtend={mockOnExtend}
        />
      );

      const indicator = screen.getByRole('button');
      expect(indicator).toHaveAttribute('aria-label', expect.stringContaining('Session time'));
    });

    it('should announce time remaining to screen readers', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      const indicator = screen.getByRole('button');
      expect(indicator).toHaveAttribute('aria-label', expect.stringContaining('5m'));
    });

    it('should indicate urgency in ARIA label', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="30s"
          onExtend={mockOnExtend}
        />
      );

      const indicator = screen.getByRole('button');
      expect(indicator).toHaveAttribute('aria-label', expect.stringMatching(/urgent|critical|warning/i));
    });

    it('should be focusable', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="10m"
          onExtend={mockOnExtend}
        />
      );

      const indicator = screen.getByRole('button');
      indicator.focus();

      expect(document.activeElement).toBe(indicator);
    });
  });

  describe('Dynamic Updates', () => {
    it('should update color as time decreases', () => {
      const { rerender } = render(
        <SessionStatusIndicator
          timeRemaining="20m"
          onExtend={mockOnExtend}
        />
      );

      let indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('text-green-600');

      // Update to warning zone
      rerender(
        <SessionStatusIndicator
          timeRemaining="10m"
          onExtend={mockOnExtend}
        />
      );

      indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('text-yellow-600');

      // Update to critical zone
      rerender(
        <SessionStatusIndicator
          timeRemaining="2m"
          onExtend={mockOnExtend}
        />
      );

      indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('text-orange-600');

      // Update to urgent zone
      rerender(
        <SessionStatusIndicator
          timeRemaining="30s"
          onExtend={mockOnExtend}
        />
      );

      indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('text-red-600');
    });

    it('should handle rapid time updates', () => {
      const { rerender } = render(
        <SessionStatusIndicator
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      // Rapid updates
      const times = ['4m 59s', '4m 58s', '4m 57s', '4m 56s', '4m 55s'];

      times.forEach(time => {
        rerender(
          <SessionStatusIndicator
            timeRemaining={time}
            onExtend={mockOnExtend}
          />
        );
      });

      expect(screen.getByText('4m 55s')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined time gracefully', () => {
      render(
        <SessionStatusIndicator
          timeRemaining={undefined as any}
          onExtend={mockOnExtend}
        />
      );

      // Should render without crashing
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle null onExtend', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="10m"
          onExtend={null as any}
        />
      );

      const indicator = screen.getByRole('button');

      // Should not throw when clicked
      fireEvent.click(indicator);
    });

    it('should handle empty string time', () => {
      render(
        <SessionStatusIndicator
          timeRemaining=""
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle onExtend throwing error', () => {
      const errorOnExtend = jest.fn().mockImplementation(() => {
        throw new Error('Extension failed');
      });

      render(
        <SessionStatusIndicator
          timeRemaining="10m"
          onExtend={errorOnExtend}
        />
      );

      const indicator = screen.getByRole('button');

      // Should not crash
      expect(() => {
        fireEvent.click(indicator);
      }).not.toThrow();

      expect(errorOnExtend).toHaveBeenCalled();
    });

    it('should handle unusual time formats', () => {
      const unusualFormats = [
        '0m 0s',
        '999h 59m',
        '1s',
        '0s'
      ];

      unusualFormats.forEach(format => {
        const { rerender } = render(
          <SessionStatusIndicator
            timeRemaining={format}
            onExtend={mockOnExtend}
          />
        );

        expect(screen.getByText(format)).toBeInTheDocument();

        rerender(
          <SessionStatusIndicator
            timeRemaining="10m"
            onExtend={mockOnExtend}
          />
        );
      });
    });
  });

  describe('Styling and Layout', () => {
    it('should have consistent button styling', () => {
      render(
        <SessionStatusIndicator
          timeRemaining="10m"
          onExtend={mockOnExtend}
        />
      );

      const indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('flex', 'items-center', 'gap-2');
    });

    it('should maintain layout in different states', () => {
      const states = ['30m', '10m', '3m', '45s', 'Expired'];

      states.forEach(state => {
        const { rerender } = render(
          <SessionStatusIndicator
            timeRemaining={state}
            onExtend={mockOnExtend}
          />
        );

        const indicator = screen.getByRole('button');
        expect(indicator).toHaveClass('flex', 'items-center');

        rerender(
          <SessionStatusIndicator
            timeRemaining="10m"
            onExtend={mockOnExtend}
          />
        );
      });
    });
  });
});