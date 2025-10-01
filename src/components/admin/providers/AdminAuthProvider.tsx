"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { tokenManager } from "@/lib/auth/tokenManager";

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
  isSuperAdmin: boolean;
  permissions?: string[];
}

interface AdminAuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      // Check session with backend (cookies are sent automatically)
      const response = await fetch("/api/admin/auth/session", {
        method: "GET",
        credentials: "include", // Include cookies
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Include cookies
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Login failed");
    }

    const data = await response.json();
    if (data.success) {
      // Store the JWT tokens in localStorage
      if (data.tokens) {
        tokenManager.setTokens(data.tokens);
      }

      setUser(data.user);
      router.push("/admin/dashboard");
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
        credentials: "include", // Include cookies
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear tokens from localStorage
      tokenManager.clearTokens();
      setUser(null);
      router.push("/admin/login");
    }
  };

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Redirect to login if not authenticated (except on login page)
  useEffect(() => {
    if (!isLoading && !user && pathname !== "/admin/login" && pathname.startsWith("/admin")) {
      router.push("/admin/login");
    }
  }, [user, isLoading, pathname, router]);

  // Redirect to dashboard if authenticated and on login page
  useEffect(() => {
    if (!isLoading && user && pathname === "/admin/login") {
      router.push("/admin/dashboard");
    }
  }, [user, isLoading, pathname, router]);

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}