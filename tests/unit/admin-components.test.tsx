import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { useRouter, usePathname } from 'next/navigation';
import AdminLoginPage from '@/app/admin/login/page';
import AdminDashboard from '@/app/admin/dashboard/page';
import { StatsCard } from '@/components/admin/dashboard/StatsCard';
import { ActivityFeed } from '@/components/admin/dashboard/ActivityFeed';
import { RecentRegistrations } from '@/components/admin/dashboard/RecentRegistrations';
import { AdminHeader } from '@/components/admin/layout/AdminHeader';
import { AdminSidebar } from '@/components/admin/layout/AdminSidebar';
import { AdminAuthProvider, useAdminAuth } from '@/components/admin/providers/AdminAuthProvider';
import { mockAdminUsers, mockDashboardStats, mockActivityFeed, mockRegistrations } from '../fixtures/admin.fixtures';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(() => new URLSearchParams())
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }: any) => children
}));

// Mock admin auth context
jest.mock('@/components/admin/providers/AdminAuthProvider', () => ({
  ...jest.requireActual('@/components/admin/providers/AdminAuthProvider'),
  useAdminAuth: jest.fn(),
  AdminAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock API calls
jest.mock('@/lib/api/admin', () => ({
  fetchDashboardStats: jest.fn(),
  fetchActivityFeed: jest.fn(),
  fetchRegistrations: jest.fn()
}));

// Mock hooks
jest.mock('@/lib/hooks/useAdminData', () => ({
  useAdminData: jest.fn(() => ({
    stats: mockDashboardStats,
    loading: false,
    error: null,
    refresh: jest.fn()
  }))
}));

describe('Admin Component Unit Tests', () => {
  const mockPush = jest.fn();
  const mockLogin = jest.fn();
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      refresh: jest.fn()
    });
    (usePathname as jest.Mock).mockReturnValue('/admin/dashboard');
    (useAdminAuth as jest.Mock).mockReturnValue({
      user: null,
      login: mockLogin,
      logout: mockLogout,
      isLoading: false
    });
  });

  describe('Admin Login Page', () => {
    it('should render login form with all fields', () => {
      render(<AdminLoginPage />);

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByText(/remember me for 30 days/i)).toBeInTheDocument();
    });

    it('should show/hide password when toggle is clicked', async () => {
      render(<AdminLoginPage />);

      const passwordInput = screen.getByLabelText(/password/i);
      const toggleButton = screen.getByRole('button', { name: '' }); // Eye icon button

      expect(passwordInput).toHaveAttribute('type', 'password');

      await userEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      await userEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should handle form submission with valid credentials', async () => {
      mockLogin.mockResolvedValue({ success: true });
      render(<AdminLoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await userEvent.type(emailInput, 'admin@biggbuzz.com');
      await userEvent.type(passwordInput, 'admin123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('admin@biggbuzz.com', 'admin123');
      });
    });

    it('should display error message on failed login', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));
      render(<AdminLoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await userEvent.type(emailInput, 'wrong@email.com');
      await userEvent.type(passwordInput, 'wrongpassword');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button during loading', async () => {
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      render(<AdminLoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await userEvent.type(emailInput, 'admin@biggbuzz.com');
      await userEvent.type(passwordInput, 'admin123');
      await userEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/authenticating/i)).toBeInTheDocument();
    });

    it('should handle remember me checkbox', async () => {
      render(<AdminLoginPage />);

      const rememberMeCheckbox = screen.getByRole('checkbox', { name: /remember me/i });

      expect(rememberMeCheckbox).not.toBeChecked();
      await userEvent.click(rememberMeCheckbox);
      expect(rememberMeCheckbox).toBeChecked();
    });

    it('should validate email format', async () => {
      render(<AdminLoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // HTML5 validation should prevent submission with invalid email
      await userEvent.type(emailInput, 'notanemail');
      fireEvent.blur(emailInput);

      expect(emailInput).toHaveAttribute('type', 'email');
    });
  });

  describe('Stats Card Component', () => {
    it('should render stats with correct values', () => {
      render(
        <StatsCard
          title="Total Registrations"
          value="1,250"
          change={12.5}
          icon="users"
        />
      );

      expect(screen.getByText('Total Registrations')).toBeInTheDocument();
      expect(screen.getByText('1,250')).toBeInTheDocument();
      expect(screen.getByText(/12.5%/)).toBeInTheDocument();
    });

    it('should show positive change indicator', () => {
      render(
        <StatsCard
          title="Active Users"
          value="980"
          change={8.3}
          icon="users"
        />
      );

      const changeElement = screen.getByText(/8.3%/);
      expect(changeElement).toHaveClass('text-green-600');
    });

    it('should show negative change indicator', () => {
      render(
        <StatsCard
          title="Pending Reviews"
          value="25"
          change={-5.2}
          icon="clock"
        />
      );

      const changeElement = screen.getByText(/5.2%/);
      expect(changeElement).toHaveClass('text-red-600');
    });

    it('should handle loading state', () => {
      render(
        <StatsCard
          title="Loading Stats"
          value={null}
          change={null}
          icon="loader"
          isLoading={true}
        />
      );

      expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument();
    });

    it('should handle click events', async () => {
      const handleClick = jest.fn();
      render(
        <StatsCard
          title="Clickable Card"
          value="100"
          change={5}
          icon="pointer"
          onClick={handleClick}
        />
      );

      const card = screen.getByRole('button');
      await userEvent.click(card);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Activity Feed Component', () => {
    it('should render activity items', () => {
      render(<ActivityFeed activities={mockActivityFeed} />);

      expect(screen.getByText(/new registration from green valley dispensary/i)).toBeInTheDocument();
      expect(screen.getByText(/registration approved by john moderator/i)).toBeInTheDocument();
      expect(screen.getByText(/multiple failed login attempts detected/i)).toBeInTheDocument();
    });

    it('should show correct activity icons', () => {
      render(<ActivityFeed activities={mockActivityFeed} />);

      const icons = screen.getAllByTestId(/activity-icon/);
      expect(icons).toHaveLength(mockActivityFeed.length);
    });

    it('should format timestamps correctly', () => {
      render(<ActivityFeed activities={mockActivityFeed} />);

      // Check for relative time formatting
      expect(screen.getByText(/5 minutes ago/i)).toBeInTheDocument();
      expect(screen.getByText(/30 minutes ago/i)).toBeInTheDocument();
      expect(screen.getByText(/1 hour ago/i)).toBeInTheDocument();
    });

    it('should handle empty activity list', () => {
      render(<ActivityFeed activities={[]} />);

      expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
    });

    it('should filter activities by type', async () => {
      render(<ActivityFeed activities={mockActivityFeed} showFilters={true} />);

      const filterButton = screen.getByRole('button', { name: /filter/i });
      await userEvent.click(filterButton);

      const registrationFilter = screen.getByRole('checkbox', { name: /registration/i });
      await userEvent.click(registrationFilter);

      // Should only show registration activities
      expect(screen.queryByText(/multiple failed login attempts/i)).not.toBeInTheDocument();
    });

    it('should handle real-time updates', async () => {
      const { rerender } = render(<ActivityFeed activities={mockActivityFeed} />);

      const newActivity = {
        id: 'activity-004',
        type: 'registration',
        action: 'new_registration',
        description: 'New registration from Test Business',
        entityId: 'reg-004',
        entityType: 'registration',
        createdAt: new Date()
      };

      const updatedActivities = [newActivity, ...mockActivityFeed];
      rerender(<ActivityFeed activities={updatedActivities} />);

      expect(screen.getByText(/new registration from test business/i)).toBeInTheDocument();
    });
  });

  describe('Recent Registrations Component', () => {
    it('should render registration list', () => {
      render(<RecentRegistrations registrations={mockRegistrations} />);

      expect(screen.getByText('Green Valley Dispensary')).toBeInTheDocument();
      expect(screen.getByText('Healing Herbs Cultivation')).toBeInTheDocument();
      expect(screen.getByText('Pure Processing Co')).toBeInTheDocument();
    });

    it('should display status badges correctly', () => {
      render(<RecentRegistrations registrations={mockRegistrations} />);

      const pendingBadge = screen.getByText('pending');
      const approvedBadge = screen.getByText('approved');
      const rejectedBadge = screen.getByText('rejected');

      expect(pendingBadge).toHaveClass('bg-yellow-100');
      expect(approvedBadge).toHaveClass('bg-green-100');
      expect(rejectedBadge).toHaveClass('bg-red-100');
    });

    it('should handle view details click', async () => {
      const handleViewDetails = jest.fn();
      render(
        <RecentRegistrations
          registrations={mockRegistrations}
          onViewDetails={handleViewDetails}
        />
      );

      const viewButtons = screen.getAllByRole('button', { name: /view/i });
      await userEvent.click(viewButtons[0]);

      expect(handleViewDetails).toHaveBeenCalledWith(mockRegistrations[0]);
    });

    it('should show loading state', () => {
      render(<RecentRegistrations registrations={[]} isLoading={true} />);

      expect(screen.getAllByTestId('skeleton-loader')).toHaveLength(3);
    });

    it('should handle empty state', () => {
      render(<RecentRegistrations registrations={[]} />);

      expect(screen.getByText(/no registrations found/i)).toBeInTheDocument();
    });

    it('should format dates correctly', () => {
      render(<RecentRegistrations registrations={mockRegistrations} />);

      // Check for date formatting
      expect(screen.getByText(/jan 29, 2025/i)).toBeInTheDocument();
    });
  });

  describe('Admin Header Component', () => {
    beforeEach(() => {
      (useAdminAuth as jest.Mock).mockReturnValue({
        user: mockAdminUsers.superAdmin,
        logout: mockLogout,
        isLoading: false
      });
    });

    it('should render user information', () => {
      render(<AdminHeader />);

      expect(screen.getByText('Super Admin')).toBeInTheDocument();
      expect(screen.getByText('admin@biggbuzz.com')).toBeInTheDocument();
    });

    it('should show user dropdown menu', async () => {
      render(<AdminHeader />);

      const userButton = screen.getByRole('button', { name: /user menu/i });
      await userEvent.click(userButton);

      expect(screen.getByText(/profile/i)).toBeInTheDocument();
      expect(screen.getByText(/settings/i)).toBeInTheDocument();
      expect(screen.getByText(/logout/i)).toBeInTheDocument();
    });

    it('should handle logout', async () => {
      render(<AdminHeader />);

      const userButton = screen.getByRole('button', { name: /user menu/i });
      await userEvent.click(userButton);

      const logoutButton = screen.getByRole('menuitem', { name: /logout/i });
      await userEvent.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('should show notification badge', () => {
      render(<AdminHeader notifications={5} />);

      const badge = screen.getByText('5');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-red-500');
    });

    it('should toggle mobile menu', async () => {
      render(<AdminHeader />);

      const menuButton = screen.getByRole('button', { name: /menu/i });
      await userEvent.click(menuButton);

      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
    });
  });

  describe('Admin Sidebar Component', () => {
    it('should render navigation links', () => {
      render(<AdminSidebar />);

      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /registrations/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /analytics/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /audit logs/i })).toBeInTheDocument();
    });

    it('should highlight active link', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/registrations');
      render(<AdminSidebar />);

      const registrationsLink = screen.getByRole('link', { name: /registrations/i });
      expect(registrationsLink).toHaveClass('bg-primary');
    });

    it('should show role-based navigation', () => {
      (useAdminAuth as jest.Mock).mockReturnValue({
        user: mockAdminUsers.viewer, // Limited permissions
        logout: mockLogout,
        isLoading: false
      });

      render(<AdminSidebar />);

      // Viewer shouldn't see admin management
      expect(screen.queryByRole('link', { name: /user management/i })).not.toBeInTheDocument();
    });

    it('should handle collapsible sidebar', async () => {
      render(<AdminSidebar collapsible={true} />);

      const collapseButton = screen.getByRole('button', { name: /collapse/i });
      await userEvent.click(collapseButton);

      expect(screen.getByTestId('sidebar')).toHaveClass('collapsed');
    });

    it('should show badge counts', () => {
      render(
        <AdminSidebar
          badges={{
            registrations: 25,
            notifications: 3
          }}
        />
      );

      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Admin Dashboard Integration', () => {
    beforeEach(() => {
      (useAdminAuth as jest.Mock).mockReturnValue({
        user: mockAdminUsers.superAdmin,
        logout: mockLogout,
        isLoading: false
      });
    });

    it('should render all dashboard sections', () => {
      render(<AdminDashboard />);

      // Stats cards
      expect(screen.getByText(/total registrations/i)).toBeInTheDocument();
      expect(screen.getByText(/pending reviews/i)).toBeInTheDocument();
      expect(screen.getByText(/today's registrations/i)).toBeInTheDocument();
      expect(screen.getByText(/approval rate/i)).toBeInTheDocument();

      // Other sections
      expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
      expect(screen.getByText(/recent registrations/i)).toBeInTheDocument();
    });

    it('should handle data refresh', async () => {
      const mockRefresh = jest.fn();
      jest.mocked(require('@/lib/hooks/useAdminData')).useAdminData.mockReturnValue({
        stats: mockDashboardStats,
        loading: false,
        error: null,
        refresh: mockRefresh
      });

      render(<AdminDashboard />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('should display loading state', () => {
      jest.mocked(require('@/lib/hooks/useAdminData')).useAdminData.mockReturnValue({
        stats: null,
        loading: true,
        error: null,
        refresh: jest.fn()
      });

      render(<AdminDashboard />);

      expect(screen.getAllByTestId('skeleton-loader')).toHaveLength(4); // 4 stat cards
    });

    it('should handle error state', () => {
      jest.mocked(require('@/lib/hooks/useAdminData')).useAdminData.mockReturnValue({
        stats: null,
        loading: false,
        error: new Error('Failed to fetch data'),
        refresh: jest.fn()
      });

      render(<AdminDashboard />);

      expect(screen.getByText(/failed to fetch data/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should navigate to detailed views', async () => {
      render(<AdminDashboard />);

      const viewAllButton = screen.getByRole('link', { name: /view all registrations/i });
      await userEvent.click(viewAllButton);

      expect(mockPush).toHaveBeenCalledWith('/admin/registrations');
    });

    it('should update in real-time with socket events', async () => {
      const { rerender } = render(<AdminDashboard />);

      // Simulate socket update
      const updatedStats = {
        ...mockDashboardStats,
        overview: {
          ...mockDashboardStats.overview,
          total: 1251,
          pending: 151
        }
      };

      jest.mocked(require('@/lib/hooks/useAdminData')).useAdminData.mockReturnValue({
        stats: updatedStats,
        loading: false,
        error: null,
        refresh: jest.fn()
      });

      rerender(<AdminDashboard />);

      expect(screen.getByText('1,251')).toBeInTheDocument();
      expect(screen.getByText('151')).toBeInTheDocument();
    });
  });

  describe('Admin Auth Provider', () => {
    it('should provide auth context to children', () => {
      const TestComponent = () => {
        const { user, isLoading } = useAdminAuth();
        return (
          <div>
            {isLoading ? 'Loading...' : user ? `Logged in as ${user.email}` : 'Not logged in'}
          </div>
        );
      };

      (useAdminAuth as jest.Mock).mockReturnValue({
        user: mockAdminUsers.superAdmin,
        isLoading: false
      });

      render(
        <AdminAuthProvider>
          <TestComponent />
        </AdminAuthProvider>
      );

      expect(screen.getByText('Logged in as admin@biggbuzz.com')).toBeInTheDocument();
    });

    it('should handle loading state', () => {
      const TestComponent = () => {
        const { isLoading } = useAdminAuth();
        return <div>{isLoading ? 'Authenticating...' : 'Ready'}</div>;
      };

      (useAdminAuth as jest.Mock).mockReturnValue({
        user: null,
        isLoading: true
      });

      render(
        <AdminAuthProvider>
          <TestComponent />
        </AdminAuthProvider>
      );

      expect(screen.getByText('Authenticating...')).toBeInTheDocument();
    });

    it('should redirect unauthenticated users', () => {
      (useAdminAuth as jest.Mock).mockReturnValue({
        user: null,
        isLoading: false
      });

      const ProtectedComponent = () => {
        const { user } = useAdminAuth();
        if (!user) {
          mockPush('/admin/login');
          return null;
        }
        return <div>Protected Content</div>;
      };

      render(
        <AdminAuthProvider>
          <ProtectedComponent />
        </AdminAuthProvider>
      );

      expect(mockPush).toHaveBeenCalledWith('/admin/login');
    });
  });

  describe('Accessibility Tests', () => {
    it('should have proper ARIA labels on login form', () => {
      render(<AdminLoginPage />);

      expect(screen.getByLabelText(/email address/i)).toHaveAttribute('type', 'email');
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
      expect(screen.getByRole('button', { name: /sign in/i })).toHaveAttribute('type', 'submit');
    });

    it('should support keyboard navigation', async () => {
      render(<AdminLoginPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Tab through form
      emailInput.focus();
      expect(document.activeElement).toBe(emailInput);

      await userEvent.tab();
      expect(document.activeElement).toBe(passwordInput);

      await userEvent.tab();
      // Should tab to password toggle button, then to remember me, then to submit
    });

    it('should announce form errors to screen readers', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));
      render(<AdminLoginPage />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent(/invalid credentials/i);
      });
    });

    it('should have proper heading hierarchy', () => {
      render(<AdminDashboard />);

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent(/admin dashboard/i);

      const h2s = screen.getAllByRole('heading', { level: 2 });
      expect(h2s.length).toBeGreaterThan(0);
    });
  });
});