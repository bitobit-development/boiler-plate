import { AdminStats, Registration, AdminUser, AuditLog } from "@/lib/types/admin";
import { tokenManager } from "@/lib/auth/tokenManager";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface ApiOptions extends RequestInit {
  token?: string;
  retry?: number;
  maxRetries?: number;
  retryDelay?: number;
}

interface CircuitBreakerState {
  failureCount: number;
  lastFailureTime: number;
  isOpen: boolean;
}

// Circuit breaker for each endpoint
const circuitBreakers = new Map<string, CircuitBreakerState>();
const CIRCUIT_BREAKER_THRESHOLD = 5; // Open after 5 failures
const CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds before trying again

class AdminApiClient {
  private async request<T>(
    endpoint: string,
    options: ApiOptions = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? 3;
    const currentRetry = options.retry ?? 0;
    const retryDelay = options.retryDelay ?? 1000;

    // Check circuit breaker state
    const breaker = circuitBreakers.get(endpoint);
    if (breaker?.isOpen) {
      const timeSinceLastFailure = Date.now() - breaker.lastFailureTime;
      if (timeSinceLastFailure < CIRCUIT_BREAKER_TIMEOUT) {
        console.warn(`Circuit breaker open for ${endpoint}`);
        // Return cached data or empty response for GET requests
        if (options.method === 'GET' || !options.method) {
          return this.getFallbackResponse<T>(endpoint);
        }
        throw new Error('Service temporarily unavailable. Please try again later.');
      } else {
        // Reset circuit breaker after timeout
        breaker.isOpen = false;
        breaker.failureCount = 0;
      }
    }

    // Get token from tokenManager instead of localStorage directly
    let token = options.token || tokenManager.getAccessToken();

    // Check if access token is expiring soon and refresh if needed
    if (!token || tokenManager.isAccessTokenExpiringSoon()) {
      const refreshed = await this.refreshTokenIfNeeded();
      if (refreshed) {
        token = tokenManager.getAccessToken();
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: `Request failed: ${response.statusText}`,
        }));
        throw new Error(error.message || `Request failed: ${response.status}`);
      }

      // Reset circuit breaker on success
      if (breaker) {
        breaker.failureCount = 0;
        breaker.isOpen = false;
      }

      return response.json();
    } catch (error) {
      // Update circuit breaker state
      const breaker = circuitBreakers.get(endpoint) || {
        failureCount: 0,
        lastFailureTime: 0,
        isOpen: false,
      };

      breaker.failureCount++;
      breaker.lastFailureTime = Date.now();

      if (breaker.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
        breaker.isOpen = true;
        console.error(`Circuit breaker opened for ${endpoint} after ${breaker.failureCount} failures`);
      }

      circuitBreakers.set(endpoint, breaker);

      // Implement exponential backoff retry
      if (currentRetry < maxRetries) {
        const delay = retryDelay * Math.pow(2, currentRetry); // Exponential backoff
        console.log(`Retrying ${endpoint} after ${delay}ms (attempt ${currentRetry + 1}/${maxRetries})`);

        await new Promise(resolve => setTimeout(resolve, delay));

        return this.request<T>(endpoint, {
          ...options,
          retry: currentRetry + 1,
          maxRetries,
          retryDelay,
        });
      }

      // Return fallback for GET requests after all retries
      if (options.method === 'GET' || !options.method) {
        console.warn(`All retries failed for ${endpoint}, returning fallback response`);
        return this.getFallbackResponse<T>(endpoint);
      }

      throw error;
    }
  }

  private getFallbackResponse<T>(endpoint: string): T {
    // Return appropriate empty responses based on endpoint
    if (endpoint.includes('/stats')) {
      return {
        totalRegistrations: 0,
        pendingReviews: 0,
        approvedToday: 0,
        rejectedToday: 0,
        averageProcessingTime: 0,
        activeAdmins: 0,
        registrationTrend: [],
        statusBreakdown: {
          pending: 0,
          approved: 0,
          rejected: 0,
        },
      } as any;
    }

    if (endpoint.includes('/registrations')) {
      return {
        registrations: [],
        total: 0,
        page: 1,
        totalPages: 0,
        pagination: { page: 1, limit: 10, total: 0, pages: 0, hasNext: false, hasPrev: false },
      } as any;
    }

    if (endpoint.includes('/activity')) {
      return {
        activities: [],
        total: 0,
        limit: 20,
        offset: 0,
        hasMore: false,
        stats: { totalToday: 0, totalSuccess: 0, totalFailure: 0, uniqueUsers: 0 },
      } as any;
    }

    if (endpoint.includes('/users')) {
      return [] as any;
    }

    if (endpoint.includes('/audit')) {
      return { logs: [], total: 0, page: 1, totalPages: 0 } as any;
    }

    return {} as any;
  }

  // Dashboard Stats
  async getStats(): Promise<AdminStats> {
    return this.request<AdminStats>("/api/admin/dashboard/stats");
  }

  async getRecentActivity(limit = 10): Promise<AuditLog[]> {
    return this.request<AuditLog[]>(
      `/api/admin/dashboard/activity?limit=${limit}`
    );
  }

  // Registrations
  async getRegistrations(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<{
    registrations: Registration[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    return this.request(
      `/api/admin/registrations?${queryParams.toString()}`
    );
  }

  async getRegistrationById(id: string): Promise<Registration> {
    return this.request<Registration>(`/api/admin/registrations/${id}`);
  }

  async updateRegistrationStatus(
    id: string,
    status: "pending" | "approved" | "rejected",
    notes?: string
  ): Promise<Registration> {
    return this.request<Registration>(
      `/api/admin/registrations/${id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status, notes }),
      }
    );
  }

  async exportRegistrations(format: "csv" | "json" = "csv"): Promise<Blob> {
    const token = tokenManager.getAccessToken();

    const response = await fetch(
      `${API_BASE}/api/admin/registrations/export?format=${format}`,
      {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }

  // Admin Users
  async getAdminUsers(): Promise<AdminUser[]> {
    return this.request<AdminUser[]>("/api/admin/users");
  }

  async getAdminUserById(id: string): Promise<AdminUser> {
    return this.request<AdminUser>(`/api/admin/users/${id}`);
  }

  async createAdminUser(userData: {
    email: string;
    name: string;
    password: string;
    role: "admin" | "super_admin";
    permissions: string[];
  }): Promise<AdminUser> {
    return this.request<AdminUser>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async updateAdminUser(
    id: string,
    userData: Partial<{
      email: string;
      name: string;
      role: "admin" | "super_admin";
      permissions: string[];
      isActive: boolean;
    }>
  ): Promise<AdminUser> {
    return this.request<AdminUser>(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(userData),
    });
  }

  async deleteAdminUser(id: string): Promise<void> {
    await this.request<void>(`/api/admin/users/${id}`, {
      method: "DELETE",
    });
  }

  // Audit Logs
  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    logs: AuditLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    return this.request(`/api/admin/audit?${queryParams.toString()}`);
  }

  // Helper method to refresh token if needed
  private async refreshTokenIfNeeded(): Promise<boolean> {
    const refreshToken = tokenManager.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/api/admin/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // Refresh failed, clear tokens
        tokenManager.clearTokens();
        // Redirect to login
        if (typeof window !== "undefined") {
          window.location.href = "/admin/login";
        }
        return false;
      }

      const data = await response.json();
      // The refresh endpoint returns accessToken directly, not nested in tokens
      if (data.accessToken) {
        tokenManager.updateAccessToken(
          data.accessToken,
          data.accessExpiresAt
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return false;
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<{
    token: string;
    user: AdminUser;
  }> {
    return this.request("/api/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async logout(): Promise<void> {
    await this.request<void>("/api/admin/auth/logout", {
      method: "POST",
    });
  }

  async verifyToken(): Promise<{
    valid: boolean;
    user?: AdminUser;
  }> {
    return this.request("/api/admin/auth/verify");
  }

  async refreshToken(): Promise<{
    token: string;
    user: AdminUser;
  }> {
    return this.request("/api/admin/auth/refresh", {
      method: "POST",
    });
  }
}

export const adminApi = new AdminApiClient();