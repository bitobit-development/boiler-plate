"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Search, Settings, Moon, Sun, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useSocket } from "@/components/admin/providers/SocketProvider";
import { adminApi } from "@/lib/api/admin";
import { SessionStatusIndicator } from "@/components/admin/layout/SessionStatusIndicator";
import type { AuditLog } from "@/lib/types/admin";

interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  type: "info" | "success" | "warning" | "error";
}

export function AdminHeader() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const { socket, isConnected } = useSocket();
  const unreadCount = notifications.filter(n => !n.read).length;

  // Transform audit log to notification format
  const transformAuditLogToNotification = useCallback((log: AuditLog): Notification | null => {
    // Only transform registration-related audit logs
    if (log.entityType === "registration" || log.action.includes("registration")) {
      // Extract registration details from metadata or changes
      const registrationData = log.metadata || log.changes;
      const licenseType = registrationData?.licenseType || registrationData?.license_type || "Cannabis License";
      // Prioritize name from metadata (actual registration data) over userName (admin who created the log)
      const userName = registrationData?.name || log.userName || "User";

      return {
        id: log._id,
        title: "New Registration",
        description: `${userName} has registered for ${licenseType}`,
        timestamp: new Date(log.timestamp),
        read: false,
        type: "success",
      };
    }

    // For other important audit logs
    if (log.action === "user.created" || log.action === "subscriber.created") {
      return {
        id: log._id,
        title: "New User",
        description: `${log.userName} has joined the platform`,
        timestamp: new Date(log.timestamp),
        read: false,
        type: "info",
      };
    }

    return null;
  }, []);

  // Fetch initial notifications from audit logs
  useEffect(() => {
    const fetchInitialNotifications = async () => {
      setIsLoadingNotifications(true);
      try {
        const response: any = await adminApi.getRecentActivity(10);
        // Handle both array and object response formats
        const activities = Array.isArray(response) ? response : (response.activities || []);

        const transformedNotifications = activities
          .map((activity: AuditLog) => transformAuditLogToNotification(activity))
          .filter((n: Notification | null): n is Notification => n !== null)
          .slice(0, 10); // Limit to 10 most recent

        setNotifications(transformedNotifications);
      } catch (error) {
        console.error("Failed to fetch initial notifications:", error);
        // Set empty notifications on error
        setNotifications([]);
      } finally {
        setIsLoadingNotifications(false);
      }
    };

    fetchInitialNotifications();
  }, [transformAuditLogToNotification]);

  // Listen for real-time registration events via Socket.IO
  useEffect(() => {
    if (!socket || !isConnected) {
      console.log("Socket not connected, real-time notifications disabled");
      return;
    }

    // Listen for new registration events
    const handleNewRegistration = (data: {
      id: string;
      name: string;
      email: string;
      licenseType: string;
      timestamp: string;
      metadata?: any;
    }) => {
      const newNotification: Notification = {
        id: data.id || `reg-${Date.now()}`,
        title: "New Registration",
        description: `${data.name} has registered for ${data.licenseType}`,
        timestamp: new Date(data.timestamp || Date.now()),
        read: false,
        type: "success",
      };

      setNotifications(prev => {
        // Add new notification to the top, limit to 50 notifications
        const updated = [newNotification, ...prev].slice(0, 50);
        return updated;
      });

      // Play notification sound if available
      if (typeof window !== "undefined" && "Audio" in window) {
        try {
          const audio = new Audio("/notification-sound.mp3");
          audio.volume = 0.3;
          audio.play().catch(() => {
            // Silently fail if audio play is blocked
          });
        } catch {
          // Silently fail if audio is not supported
        }
      }
    };

    // Listen for audit log events that might be registrations
    const handleAuditLog = (auditLog: AuditLog) => {
      const notification = transformAuditLogToNotification(auditLog);
      if (notification) {
        setNotifications(prev => {
          // Check if notification already exists
          if (prev.some(n => n.id === notification.id)) {
            return prev;
          }
          // Add new notification to the top, limit to 50 notifications
          return [notification, ...prev].slice(0, 50);
        });
      }
    };

    // Subscribe to socket events
    socket.on("registration:new", handleNewRegistration);
    socket.on("audit:log", handleAuditLog);

    // Cleanup socket listeners
    return () => {
      socket.off("registration:new", handleNewRegistration);
      socket.off("audit:log", handleAuditLog);
    };
  }, [socket, isConnected, transformAuditLogToNotification]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Search Bar */}
      <div className="flex flex-1 items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search registrations, users, or logs..."
            className="pl-9 pr-4 bg-muted/50 border-muted focus:bg-background transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">ESC</span>
            </kbd>
          )}
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-3">
        {/* Session Status Indicator */}
        <SessionStatusIndicator mode="compact" />

        {/* Current Time */}
        <div className="hidden md:flex flex-col items-end text-sm">
          <span className="text-foreground font-medium">
            {format(currentTime, "h:mm a")}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(currentTime, "EEE, MMM d")}
          </span>
        </div>

        {/* Connection Status Indicator */}
        {!isConnected && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">Offline</span>
          </div>
        )}

        {/* Theme Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Sun className="mr-2 h-4 w-4" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Moon className="mr-2 h-4 w-4" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Laptop className="mr-2 h-4 w-4" />
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                  onClick={markAllAsRead}
                >
                  Mark all as read
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-96 overflow-y-auto">
              {isLoadingNotifications ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Loading notifications...
                </div>
              ) : notifications.length > 0 ? (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      "flex flex-col items-start gap-1 p-3 cursor-pointer",
                      !notification.read && "bg-accent/50"
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {notification.description}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(notification.timestamp)}
                    </span>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              )}
            </div>
            {notifications.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="justify-center text-sm font-medium">
                  View all notifications
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return `${days} day${days > 1 ? "s" : ""} ago`;
}