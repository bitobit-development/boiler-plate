"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocket } from "@/components/admin/providers/SocketProvider";
import { adminApi } from "@/lib/api/admin";
import {
  AdminStats,
  Registration,
  AuditLog,
  AdminUser,
  DashboardActivity,
} from "@/lib/types/admin";
import { toast } from "@/hooks/use-toast";

// Dashboard Stats Hook
export function useDashboardStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useSocket();

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getStats();
      setStats(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch stats";
      setError(errorMessage);

      // Only show toast for non-circuit breaker errors
      if (!errorMessage.includes('temporarily unavailable')) {
        console.warn('Dashboard stats fetch failed:', errorMessage);
      }

      // Set fallback data to prevent UI crashes
      setStats({
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
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Listen for real-time stats updates
  useEffect(() => {
    if (!socket) return;

    const handleStatsUpdate = (updatedStats: Partial<AdminStats>) => {
      setStats((prev) => (prev ? { ...prev, ...updatedStats } : null));
    };

    socket.on("stats:update", handleStatsUpdate);

    return () => {
      socket.off("stats:update", handleStatsUpdate);
    };
  }, [socket]);

  return { stats, loading, error, refetch: fetchStats };
}

// Registrations Hook
export function useRegistrations(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const [data, setData] = useState<{
    registrations: Registration[];
    total: number;
    page: number;
    totalPages: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useSocket();

  const fetchRegistrations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminApi.getRegistrations(params);
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch registrations";
      setError(errorMessage);

      // Only show toast for non-circuit breaker errors
      if (!errorMessage.includes('temporarily unavailable')) {
        console.warn('Registrations fetch failed:', errorMessage);
      }

      // Set fallback data to prevent UI crashes
      setData({
        registrations: [],
        total: 0,
        page: params?.page || 1,
        totalPages: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  // Listen for real-time registration updates
  useEffect(() => {
    if (!socket || !data) return;

    const handleNewRegistration = (registration: Registration) => {
      setData((prev) => {
        if (!prev) return null;

        // Add to the beginning if on first page
        if (params?.page === 1 || !params?.page) {
          return {
            ...prev,
            registrations: [registration, ...prev.registrations].slice(
              0,
              params?.limit || 10
            ),
            total: prev.total + 1,
          };
        }
        // Just update total if not on first page
        return {
          ...prev,
          total: prev.total + 1,
        };
      });
    };

    const handleRegistrationUpdate = (updatedRegistration: Registration) => {
      setData((prev) => {
        if (!prev) return null;

        return {
          ...prev,
          registrations: prev.registrations.map((reg) =>
            reg._id === updatedRegistration._id ? updatedRegistration : reg
          ),
        };
      });
    };

    const handleRegistrationDelete = (registrationId: string) => {
      setData((prev) => {
        if (!prev) return null;

        return {
          ...prev,
          registrations: prev.registrations.filter(
            (reg) => reg._id !== registrationId
          ),
          total: prev.total - 1,
        };
      });
    };

    socket.on("registration:new", handleNewRegistration);
    socket.on("registration:update", handleRegistrationUpdate);
    socket.on("registration:delete", handleRegistrationDelete);

    return () => {
      socket.off("registration:new", handleNewRegistration);
      socket.off("registration:update", handleRegistrationUpdate);
      socket.off("registration:delete", handleRegistrationDelete);
    };
  }, [socket, data, params]);

  const updateStatus = async (
    id: string,
    status: "pending" | "approved" | "rejected",
    notes?: string
  ) => {
    try {
      const updated = await adminApi.updateRegistrationStatus(id, status, notes);

      // Optimistically update local state
      setData((prev) => {
        if (!prev) return null;

        return {
          ...prev,
          registrations: prev.registrations.map((reg) =>
            reg._id === id ? updated : reg
          ),
        };
      });

      toast({
        title: "Success",
        description: `Registration ${status}`,
        className: "bg-green-500/10 border-green-500/20",
      });

      return updated;
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update registration status",
        variant: "destructive",
      });
      throw err;
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetchRegistrations,
    updateStatus,
  };
}

// Recent Activity Hook
export function useRecentActivity(limit = 10) {
  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useSocket();

  const fetchActivity = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getRecentActivity(limit);

      // Handle both old format (array) and new format (object with activities)
      let logs = Array.isArray(response) ? response : response.activities || [];

      // Transform audit logs to dashboard activities if needed
      const transformed: DashboardActivity[] = logs.map((log: any) => {
        // If already in the right format, use it
        if (log.type && log.title && log.timestamp) {
          return log;
        }

        // Otherwise transform it
        return {
          type: getActivityType(log.entityType),
          title: log.action || log.title || 'Unknown Action',
          description: log.description || `${log.userName || 'System'} ${(log.action || '').toLowerCase()} ${log.entityType || ''}`,
          timestamp: new Date(log.timestamp || log.createdAt),
          user: log.userName || log.user || 'System',
          icon: log.icon || getActivityIcon(log.action),
          color: log.color || getActivityColor(log.entityType),
        };
      });

      setActivities(transformed);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch activity";
      setError(errorMessage);

      // Set empty activities to prevent UI crashes
      setActivities([]);

      if (!errorMessage.includes('temporarily unavailable')) {
        console.warn('Activity fetch failed:', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // Listen for real-time activity updates
  useEffect(() => {
    if (!socket) return;

    const handleNewActivity = (activity: DashboardActivity) => {
      setActivities((prev) => [activity, ...prev].slice(0, limit));
    };

    socket.on("activity:new", handleNewActivity);

    return () => {
      socket.off("activity:new", handleNewActivity);
    };
  }, [socket, limit]);

  return { activities, loading, error, refetch: fetchActivity };
}

// Admin Users Hook
export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useSocket();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getAdminUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
      toast({
        title: "Error",
        description: "Failed to load admin users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Listen for real-time user updates
  useEffect(() => {
    if (!socket) return;

    const handleUserUpdate = (updatedUser: AdminUser) => {
      setUsers((prev) =>
        prev.map((user) => (user.id === updatedUser.id ? updatedUser : user))
      );
    };

    const handleUserCreate = (newUser: AdminUser) => {
      setUsers((prev) => [...prev, newUser]);
    };

    const handleUserDelete = (userId: string) => {
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    };

    socket.on("admin:update", handleUserUpdate);
    socket.on("admin:create", handleUserCreate);
    socket.on("admin:delete", handleUserDelete);

    return () => {
      socket.off("admin:update", handleUserUpdate);
      socket.off("admin:create", handleUserCreate);
      socket.off("admin:delete", handleUserDelete);
    };
  }, [socket]);

  const createUser = async (userData: {
    email: string;
    name: string;
    password: string;
    role: "admin" | "super_admin";
    permissions: string[];
  }) => {
    try {
      const newUser = await adminApi.createAdminUser(userData);
      setUsers((prev) => [...prev, newUser]);

      toast({
        title: "Success",
        description: "Admin user created successfully",
        className: "bg-green-500/10 border-green-500/20",
      });

      return newUser;
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create admin user",
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateUser = async (
    id: string,
    userData: Partial<AdminUser>
  ) => {
    try {
      const updated = await adminApi.updateAdminUser(id, userData);
      setUsers((prev) =>
        prev.map((user) => (user.id === id ? updated : user))
      );

      toast({
        title: "Success",
        description: "Admin user updated successfully",
        className: "bg-green-500/10 border-green-500/20",
      });

      return updated;
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update admin user",
        variant: "destructive",
      });
      throw err;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await adminApi.deleteAdminUser(id);
      setUsers((prev) => prev.filter((user) => user.id !== id));

      toast({
        title: "Success",
        description: "Admin user deleted successfully",
        className: "bg-green-500/10 border-green-500/20",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete admin user",
        variant: "destructive",
      });
      throw err;
    }
  };

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  };
}

// Helper functions
function getActivityType(
  entityType: string
): DashboardActivity["type"] {
  switch (entityType.toLowerCase()) {
    case "registration":
      return "registration";
    case "review":
      return "review";
    case "admin":
    case "user":
      return "admin_action";
    default:
      return "system";
  }
}

function getActivityIcon(action: string): string {
  const actionLower = action.toLowerCase();
  if (actionLower.includes("create") || actionLower.includes("add"))
    return "Plus";
  if (actionLower.includes("update") || actionLower.includes("edit"))
    return "Edit";
  if (actionLower.includes("delete") || actionLower.includes("remove"))
    return "Trash";
  if (actionLower.includes("approve")) return "CheckCircle";
  if (actionLower.includes("reject")) return "XCircle";
  return "Activity";
}

function getActivityColor(entityType: string): string {
  switch (entityType.toLowerCase()) {
    case "registration":
      return "blue";
    case "review":
      return "purple";
    case "admin":
      return "orange";
    default:
      return "gray";
  }
}