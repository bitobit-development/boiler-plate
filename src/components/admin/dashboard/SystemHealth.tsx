"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Server,
  Database,
  Wifi,
  Shield,
  Mail,
  CreditCard,
  CheckCircle,
  AlertCircle,
  XCircle,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSocket } from "@/components/admin/providers/SocketProvider";

interface SystemService {
  id: string;
  name: string;
  status: "operational" | "degraded" | "down";
  uptime: number;
  responseTime: number;
  icon: React.ComponentType<{ className?: string }>;
  lastChecked: Date;
}

const initialServices: SystemService[] = [
  {
    id: "api",
    name: "API Server",
    status: "operational",
    uptime: 99.99,
    responseTime: 45,
    icon: Server,
    lastChecked: new Date(),
  },
  {
    id: "database",
    name: "Database",
    status: "operational",
    uptime: 99.95,
    responseTime: 12,
    icon: Database,
    lastChecked: new Date(),
  },
  {
    id: "websocket",
    name: "WebSocket",
    status: "operational",
    uptime: 100,
    responseTime: 8,
    icon: Wifi,
    lastChecked: new Date(),
  },
  {
    id: "auth",
    name: "Authentication",
    status: "operational",
    uptime: 99.98,
    responseTime: 120,
    icon: Shield,
    lastChecked: new Date(),
  },
  {
    id: "email",
    name: "Email Service",
    status: "operational",
    uptime: 99.5,
    responseTime: 250,
    icon: Mail,
    lastChecked: new Date(),
  },
  {
    id: "payment",
    name: "Payment Gateway",
    status: "degraded",
    uptime: 98.5,
    responseTime: 450,
    icon: CreditCard,
    lastChecked: new Date(),
  },
];

const statusConfig = {
  operational: {
    label: "Operational",
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
  },
  degraded: {
    label: "Degraded",
    icon: AlertCircle,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20",
  },
  down: {
    label: "Down",
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
  },
};

export function SystemHealth() {
  const [services, setServices] = useState<SystemService[]>(initialServices);
  const { socket, isConnected } = useSocket();

  // Calculate overall system health
  const operationalCount = services.filter(s => s.status === "operational").length;
  const overallHealth = (operationalCount / services.length) * 100;

  // Listen for real-time health updates
  useEffect(() => {
    if (socket && isConnected) {
      socket.on("health:update", (updatedService: Partial<SystemService> & { id: string }) => {
        setServices(prev =>
          prev.map(service =>
            service.id === updatedService.id
              ? { ...service, ...updatedService, lastChecked: new Date() }
              : service
          )
        );
      });

      return () => {
        socket.off("health:update");
      };
    }
  }, [socket, isConnected]);

  // Simulate periodic health checks
  useEffect(() => {
    const interval = setInterval(() => {
      setServices(prev =>
        prev.map(service => ({
          ...service,
          responseTime: Math.max(5, service.responseTime + (Math.random() - 0.5) * 10),
          lastChecked: new Date(),
        }))
      );
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      {/* Overall Health Status */}
      <div className="rounded-lg border bg-card/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Overall System Health</span>
          </div>
          <Badge
            variant={overallHealth === 100 ? "default" : overallHealth >= 80 ? "secondary" : "destructive"}
            className={cn(
              overallHealth === 100 && "bg-green-500/10 text-green-500 border-green-500/20"
            )}
          >
            {overallHealth.toFixed(0)}% Healthy
          </Badge>
        </div>
        <Progress value={overallHealth} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {operationalCount} of {services.length} services operational
        </p>
      </div>

      {/* Individual Services */}
      <div className="space-y-3">
        {services.map((service) => {
          const Icon = service.icon;
          const status = statusConfig[service.status];
          const StatusIcon = status.icon;

          return (
            <div
              key={service.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                "hover:bg-card hover:shadow-sm",
                service.status === "operational" ? "bg-card/30" : "bg-card/50",
                status.borderColor
              )}
            >
              {/* Service Icon */}
              <div className={cn("rounded-lg p-2", status.bgColor)}>
                <Icon className={cn("h-4 w-4", status.color)} />
              </div>

              {/* Service Info */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{service.name}</p>
                  <div className="flex items-center gap-2">
                    <StatusIcon className={cn("h-3.5 w-3.5", status.color)} />
                    <span className={cn("text-xs font-medium", status.color)}>
                      {status.label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Uptime: {service.uptime}%</span>
                  <span>•</span>
                  <span>Response: {service.responseTime}ms</span>
                  <span>•</span>
                  <span>
                    Checked {formatRelativeTime(service.lastChecked)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span>Operational</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3 text-yellow-500" />
          <span>Degraded</span>
        </div>
        <div className="flex items-center gap-1">
          <XCircle className="h-3 w-3 text-red-500" />
          <span>Down</span>
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}