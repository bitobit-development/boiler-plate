"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserCheck,
  TrendingUp,
  Activity,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/components/admin/dashboard/StatsCard";
import { ActivityFeed } from "@/components/admin/dashboard/ActivityFeed";
import { RegistrationChart } from "@/components/admin/dashboard/RegistrationChart";
import { RecentRegistrations } from "@/components/admin/dashboard/RecentRegistrations";
import { SystemHealth } from "@/components/admin/dashboard/SystemHealth";
import { useSocket } from "@/components/admin/providers/SocketProvider";
import { useDashboardStats } from "@/lib/hooks/useAdminData";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const { stats, loading: statsLoading, error: statsError } = useDashboardStats();
  const [liveViewers, setLiveViewers] = useState(1);

  // Handle real-time viewer count
  useEffect(() => {
    if (socket && isConnected) {
      socket.on("dashboard:viewers", (count: number) => {
        setLiveViewers(count);
      });

      return () => {
        socket.off("dashboard:viewers");
      };
    }
  }, [socket, isConnected]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Dashboard Overview
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor your cannabis subscriber system in real-time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1.5">
            <div className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5" />
              <span className="text-xs">{liveViewers} viewing</span>
            </div>
          </Badge>
          <Badge
            variant={isConnected ? "default" : "secondary"}
            className={cn(
              "px-3 py-1.5",
              isConnected && "bg-green-500/10 text-green-500 border-green-500/20"
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-2 w-2 rounded-full",
                isConnected ? "bg-green-500 animate-pulse" : "bg-muted"
              )} />
              <span className="text-xs">{isConnected ? "Live" : "Offline"}</span>
            </div>
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statsLoading ? (
          // Loading skeletons
          <>
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32 mb-1" />
                <Skeleton className="h-3 w-40" />
              </Card>
            ))}
          </>
        ) : statsError ? (
          // Error state
          <Card className="col-span-full p-8">
            <div className="flex flex-col items-center text-center">
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-sm text-muted-foreground">Failed to load statistics</p>
            </div>
          </Card>
        ) : stats ? (
          <>
            <StatsCard
              title="Total Subscribers"
              value={(stats.totalRegistrations || 0).toLocaleString()}
              description="All-time subscribers"
              icon={Users}
              trend={{
                value: 12.5,
                isPositive: true,
              }}
              className="admin-card-hover"
            />
            <StatsCard
              title="Pending Review"
              value={(stats.pendingReviews || 0).toString()}
              description="Awaiting verification"
              icon={Clock}
              trend={{
                value: (stats.pendingReviews || 0) > 20 ? 5 : -3,
                isPositive: (stats.pendingReviews || 0) <= 20,
              }}
              variant="warning"
              className="admin-card-hover"
            />
            <StatsCard
              title="Approved Today"
              value={(stats.approvedToday || 0).toString()}
              description="Verified today"
              icon={CheckCircle}
              trend={{
                value: 8.2,
                isPositive: true,
              }}
              variant="success"
              className="admin-card-hover"
            />
            <StatsCard
              title="Processing Time"
              value={`${stats.averageProcessingTime || 0}h`}
              description="Average review time"
              icon={TrendingUp}
              trend={{
                value: 2.1,
                isPositive: (stats.averageProcessingTime || 0) < 24,
              }}
              className="admin-card-hover"
            />
            <StatsCard
              title="Active Admins"
              value={(stats.activeAdmins || 0).toString()}
              description="Currently online"
              icon={UserCheck}
              trend={{
                value: 0,
                isPositive: true,
              }}
              variant="default"
              className="admin-card-hover"
            />
            <StatsCard
              title="System Health"
              value="99.9%"
              description="Uptime last 30 days"
              icon={Activity}
              trend={{
                value: 0.1,
                isPositive: true,
              }}
              variant="success"
              className="admin-card-hover"
            />
          </>
        ) : null}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Registration Chart */}
        <Card className="lg:col-span-4 admin-card-hover">
          <CardHeader>
            <CardTitle>Subscriber Trends</CardTitle>
            <CardDescription>
              Daily subscriber volume over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegistrationChart />
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Live Activity</CardTitle>
            <CardDescription>
              Real-time system events and user actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFeed />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Registrations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Subscribers</CardTitle>
              <CardDescription>
                Latest subscribers requiring review
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <RecentRegistrations />
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Real-time monitoring of critical services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SystemHealth />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}