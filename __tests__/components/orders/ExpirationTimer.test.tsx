import React from "react";
import { render, screen, act } from "@testing-library/react";
import { ExpirationTimer } from "@/components/orders/ExpirationTimer";

// Mock timers
jest.useFakeTimers();

describe("ExpirationTimer", () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("renders countdown timer for future expiration", () => {
    const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now

    render(<ExpirationTimer expiresAt={futureDate} />);

    // Check that timer is displayed
    expect(screen.getByRole("timer")).toBeInTheDocument();
    expect(screen.getByText(/01:59:/)).toBeInTheDocument();
  });

  it("shows warning state when less than 1 hour remains", () => {
    const soonDate = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

    render(<ExpirationTimer expiresAt={soonDate} />);

    const timer = screen.getByRole("timer");
    expect(timer).toHaveClass("bg-amber-50"); // Warning colors
  });

  it("shows expired state for past expiration", () => {
    const pastDate = new Date(Date.now() - 1000); // 1 second ago

    render(<ExpirationTimer expiresAt={pastDate} />);

    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  it("calls onExpired callback when timer expires", () => {
    const onExpired = jest.fn();
    const soonDate = new Date(Date.now() + 2000); // 2 seconds from now

    render(<ExpirationTimer expiresAt={soonDate} onExpired={onExpired} />);

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(onExpired).toHaveBeenCalled();
  });

  it("updates countdown every second", () => {
    const futureDate = new Date(Date.now() + 5000); // 5 seconds from now

    render(<ExpirationTimer expiresAt={futureDate} />);

    // Initial state
    expect(screen.getByRole("timer")).toBeInTheDocument();

    // Advance by 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Timer should still be visible and counting down
    expect(screen.getByRole("timer")).toBeInTheDocument();
  });

  it("has proper accessibility attributes", () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    render(<ExpirationTimer expiresAt={futureDate} />);

    const timer = screen.getByRole("timer");
    expect(timer).toHaveAttribute("aria-live", "polite");
    expect(timer).toHaveAttribute("aria-label");
  });
});
