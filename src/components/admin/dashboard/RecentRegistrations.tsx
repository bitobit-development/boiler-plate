"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useSocket } from "@/components/admin/providers/SocketProvider";
import { adminApi } from "@/lib/api/admin";

interface Registration {
  id: string;
  name: string;
  email: string;
  licenseType: string;
  status: "pending" | "active" | "suspended";
  submittedAt: Date;
  location: string;
}

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  },
  active: {
    label: "Verified",
    icon: CheckCircle,
    color: "text-green-500 bg-green-500/10 border-green-500/20",
  },
  suspended: {
    label: "Rejected",
    icon: XCircle,
    color: "text-red-500 bg-red-500/10 border-red-500/20",
  },
};

export function RecentRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket, isConnected } = useSocket();

  // Fetch initial registrations from API
  useEffect(() => {
    async function fetchRegistrations() {
      try {
        const data = await adminApi.getRegistrations({
          page: 1,
          limit: 3, // Reduced from 5 to 3 for performance optimization
          sortBy: 'submittedAt',
          sortOrder: 'desc',
        });

        // Map database fields to component structure
        const mappedRegistrations = data.registrations.map((reg: any) => ({
          id: reg.id,
          name: `${reg.name || ''} ${reg.surname || ''}`.trim() || 'Unknown',
          email: reg.email,
          licenseType: reg.licenseType || 'Cannabis Business',
          status: reg.status,
          submittedAt: new Date(reg.submittedAt),
          location: reg.city && reg.province ? `${reg.city}, ${reg.province}` : 'N/A',
        }));

        setRegistrations(mappedRegistrations);
      } catch (error) {
        console.error('Failed to fetch registrations:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRegistrations();
  }, []);

  // Listen for real-time updates
  useEffect(() => {
    if (socket && isConnected) {
      socket.on("registration:update", (updatedRegistration: Registration) => {
        setRegistrations(prev =>
          prev.map(reg =>
            reg.id === updatedRegistration.id ? updatedRegistration : reg
          )
        );
      });

      socket.on("registration:new", (newRegistration: Registration) => {
        setRegistrations(prev => [newRegistration, ...prev].slice(0, 5));
      });

      return () => {
        socket.off("registration:update");
        socket.off("registration:new");
      };
    }
  }, [socket, isConnected]);

  const handleAction = (id: string, action: "approve" | "reject" | "view") => {
    console.log(`Action ${action} for registration ${id}`);
    // Implement action logic here
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-lg border bg-card/50 animate-pulse">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-48 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {registrations.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No subscribers found</p>
      ) : (
        registrations.map((registration) => {
        const status = statusConfig[registration.status] || statusConfig.pending;
        const StatusIcon = status.icon;

        return (
          <div
            key={registration.id}
            className={cn(
              "flex items-center gap-4 p-4 rounded-lg border bg-card/50 transition-all hover:bg-card hover:shadow-sm",
              registration.status === "pending" && "border-yellow-500/20"
            )}
          >
            {/* Avatar */}
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {registration.name
                  .split(" ")
                  .map(n => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">
                  {registration.name}
                </p>
                <Badge variant="outline" className={status.color}>
                  <StatusIcon className="mr-1 h-3 w-3" />
                  {status.label}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{registration.email}</span>
                <span>•</span>
                <span>{registration.licenseType}</span>
                <span>•</span>
                <span>{registration.location}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Submitted {format(registration.submittedAt, "MMM d, h:mm a")}
              </p>
            </div>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleAction(registration.id, "view")}>
                  View Details
                </DropdownMenuItem>
                {registration.status === "pending" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleAction(registration.id, "approve")}
                      className="text-green-500 focus:text-green-500"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve Subscriber
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleAction(registration.id, "reject")}
                      className="text-red-500 focus:text-red-500"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject Subscriber
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem>Send Email</DropdownMenuItem>
                <DropdownMenuItem>View Audit Log</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })
      )}
    </div>
  );
}