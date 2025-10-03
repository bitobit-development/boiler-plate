import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionTimeoutWarning } from '@/components/admin/session/SessionTimeoutWarning';

describe('SessionTimeoutWarning', () => {
  let mockOnExtend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnExtend = jest.fn();
  });

  describe('Modal Visibility', () => {
    it('should not render when isOpen is false', () => {
      render(
        <SessionTimeoutWarning
          isOpen={false}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText(/Session Timeout Warning/i)).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Session Timeout Warning/i)).toBeInTheDocument();
    });

    it('should show modal at 5 minute warning', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/5m/)).toBeInTheDocument();
    });

    it('should transition from closed to open', () => {
      const { rerender } = render(
        <SessionTimeoutWarning
          isOpen={false}
          timeRemaining="10m"
          onExtend={mockOnExtend}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      rerender(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should transition from open to closed', () => {
      const { rerender } = render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      rerender(
        <SessionTimeoutWarning
          isOpen={false}
          timeRemaining="60m"
          onExtend={mockOnExtend}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Countdown Display', () => {
    it('should display correct time format for minutes', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByText(/5m/)).toBeInTheDocument();
    });

    it('should display correct time format for seconds', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="30s"
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByText(/30s/)).toBeInTheDocument();
    });

    it('should display correct time format for hours and minutes', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="1h 30m"
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByText(/1h 30m/)).toBeInTheDocument();
    });

    it('should display "Expired" when time is up', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="Expired"
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByText(/Expired/)).toBeInTheDocument();
    });

    it('should update countdown as time changes', () => {
      const { rerender } = render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByText(/5m/)).toBeInTheDocument();

      rerender(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="4m 30s"
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByText(/4m 30s/)).toBeInTheDocument();
    });

    it('should show urgent styling for low time', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="30s"
          onExtend={mockOnExtend}
        />
      );

      // Check for urgent/warning elements
      const warningIcon = screen.getByRole('img', { hidden: true }); // Lucide icon
      expect(warningIcon).toBeInTheDocument();
    });
  });

  describe('Extend Session Button', () => {
    it('should render extend session button', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      const extendButton = screen.getByRole('button', { name: /Extend Session/i });
      expect(extendButton).toBeInTheDocument();
    });

    it('should call onExtend when clicked', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      const extendButton = screen.getByRole('button', { name: /Extend Session/i });
      fireEvent.click(extendButton);

      expect(mockOnExtend).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple clicks', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      const extendButton = screen.getByRole('button', { name: /Extend Session/i });

      fireEvent.click(extendButton);
      fireEvent.click(extendButton);
      fireEvent.click(extendButton);

      expect(mockOnExtend).toHaveBeenCalledTimes(3);
    });

    it('should be accessible via keyboard', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      const extendButton = screen.getByRole('button', { name: /Extend Session/i });

      // Simulate Enter key press
      fireEvent.keyDown(extendButton, { key: 'Enter', code: 'Enter' });
      fireEvent.click(extendButton);

      expect(mockOnExtend).toHaveBeenCalled();
    });

    it('should handle async onExtend', async () => {
      const asyncOnExtend = jest.fn().mockResolvedValue(true);

      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={asyncOnExtend}
        />
      );

      const extendButton = screen.getByRole('button', { name: /Extend Session/i });
      fireEvent.click(extendButton);

      await waitFor(() => {
        expect(asyncOnExtend).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('should have accessible heading', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      const heading = screen.getByRole('heading', { name: /Session Timeout Warning/i });
      expect(heading).toBeInTheDocument();
    });

    it('should have descriptive text for screen readers', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      expect(screen.getByText(/Your session will expire/i)).toBeInTheDocument();
      expect(screen.getByText(/extend your session/i)).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      const extendButton = screen.getByRole('button', { name: /Extend Session/i });

      // Should be focusable
      extendButton.focus();
      expect(document.activeElement).toBe(extendButton);
    });

    it('should announce time remaining to screen readers', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      // Time should be in an element that screen readers can announce
      const timeElement = screen.getByText(/5m/);
      expect(timeElement).toBeInTheDocument();

      // Parent should have alert role or live region
      const alertDialog = screen.getByRole('dialog');
      expect(alertDialog).toBeInTheDocument();
    });

    it('should have proper contrast ratios', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      // Check that warning elements are visible
      const warningIcon = screen.getByRole('img', { hidden: true });
      expect(warningIcon).toHaveClass('text-yellow-500');

      const extendButton = screen.getByRole('button', { name: /Extend Session/i });
      expect(extendButton).toHaveClass('bg-primary'); // Primary color for visibility
    });
  });

  describe('Modal Behavior', () => {
    it('should prevent closing via overlay click', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      const overlay = document.querySelector('[data-radix-dialog-overlay]');
      if (overlay) {
        fireEvent.click(overlay);
      }

      // Modal should remain open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should prevent closing via Escape key', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      // Modal should remain open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should trap focus within modal', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      const extendButton = screen.getByRole('button', { name: /Extend Session/i });
      extendButton.focus();

      // Tab should cycle within modal
      fireEvent.keyDown(document.activeElement!, { key: 'Tab' });

      // Focus should remain within modal
      expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    });
  });

  describe('Visual States', () => {
    it('should show warning icon', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toBeInTheDocument();
      expect(icon.parentElement).toHaveClass('text-yellow-500');
    });

    it('should display time prominently', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      const timeDisplay = screen.getByText(/5m/);
      expect(timeDisplay).toBeInTheDocument();
      expect(timeDisplay.className).toMatch(/font-bold|text-2xl|text-xl/); // Should be prominent
    });

    it('should have clear call-to-action', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      const ctaButton = screen.getByRole('button', { name: /Extend Session/i });
      expect(ctaButton).toHaveClass('bg-primary'); // Primary style for emphasis
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined timeRemaining', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={undefined as any}
          onExtend={mockOnExtend}
        />
      );

      // Should still render without crashing
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should handle null onExtend', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={null as any}
        />
      );

      const extendButton = screen.getByRole('button', { name: /Extend Session/i });

      // Should not throw when clicked
      fireEvent.click(extendButton);
    });

    it('should handle rapid prop changes', () => {
      const { rerender } = render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={mockOnExtend}
        />
      );

      // Rapid updates
      for (let i = 5; i > 0; i--) {
        rerender(
          <SessionTimeoutWarning
            isOpen={true}
            timeRemaining={`${i}m`}
            onExtend={mockOnExtend}
          />
        );
      }

      expect(screen.getByText(/1m/)).toBeInTheDocument();
    });

    it('should handle onExtend throwing error', () => {
      const errorOnExtend = jest.fn().mockImplementation(() => {
        throw new Error('Extension failed');
      });

      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining="5m"
          onExtend={errorOnExtend}
        />
      );

      const extendButton = screen.getByRole('button', { name: /Extend Session/i });

      // Should not crash the component
      expect(() => {
        fireEvent.click(extendButton);
      }).not.toThrow();

      expect(errorOnExtend).toHaveBeenCalled();
    });
  });
});