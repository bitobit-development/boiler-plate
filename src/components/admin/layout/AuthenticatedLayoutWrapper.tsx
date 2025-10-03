"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";
import { AdminHeader } from "@/components/admin/layout/AdminHeader";
import { useAdminAuth } from "@/components/admin/providers/AdminAuthProvider";
import { SocketProvider } from "@/components/admin/providers/SocketProvider";
import { SessionTimeoutWarning } from "@/components/admin/session/SessionTimeoutWarning";

export function AuthenticatedLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // For login page or when not authenticated, show minimal layout (no sidebar/header)
  if (isLoginPage || !isAuthenticated) {
    return <>{children}</>;
  }

  // For authenticated users on non-login pages, show full admin layout
  return (
    <SocketProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar Navigation - Only visible when authenticated */}
        <AdminSidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header - Only visible when authenticated */}
          <AdminHeader />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="container mx-auto p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Session Timeout Warning Modal */}
      <SessionTimeoutWarning />
    </SocketProvider>
  );
}