"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  UserCheck,
  Clock,
  XCircle,
  CheckCircle,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useSocket } from "@/components/admin/providers/SocketProvider";
import { useRegistrations } from "@/lib/hooks/useAdminData";
import { adminApi } from "@/lib/api/admin";
import { toast } from "@/hooks/use-toast";
import { Registration } from "@/lib/types/admin";
import { RegistrationDetailsSheet } from "@/components/admin/registrations/RegistrationDetailsSheet";
import { PhoneNumberDisplay } from "@/components/admin/shared/PhoneNumberDisplay";

const statusConfig = {
  pending: {
    label: "Pending Review",
    icon: Clock,
    color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle,
    color: "text-green-500 bg-green-500/10 border-green-500/20",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    color: "text-red-500 bg-red-500/10 border-red-500/20",
  },
};

export default function RegistrationsPage() {
  const router = useRouter();
  const [selectedRegistrations, setSelectedRegistrations] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>("submittedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected" | null>(null);

  const { socket, isConnected } = useSocket();

  const {
    data,
    loading,
    error,
    refetch,
    updateStatus
  } = useRegistrations({
    page: currentPage,
    limit: 5, // Reduced from 10 to 5 for performance optimization
    search: searchQuery,
    status: statusFilter === "all" ? undefined : statusFilter,
    sortBy,
    sortOrder,
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handleSelectAll = (checked: boolean) => {
    if (checked && data) {
      setSelectedRegistrations(data.registrations.map(reg => reg._id));
    } else {
      setSelectedRegistrations([]);
    }
  };

  const handleSelectRegistration = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRegistrations(prev => [...prev, id]);
    } else {
      setSelectedRegistrations(prev => prev.filter(regId => regId !== id));
    }
  };

  const handleBulkAction = async (action: string) => {
    if (action === "Export") {
      try {
        const blob = await adminApi.exportRegistrations("csv");
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `registrations_${format(new Date(), "yyyy-MM-dd")}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Export Complete",
          description: "Registrations exported successfully",
          className: "bg-green-500/10 border-green-500/20",
        });
      } catch (error) {
        toast({
          title: "Export Failed",
          description: "Failed to export registrations",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Bulk Action",
        description: `${action} ${selectedRegistrations.length} registrations`,
      });
    }
    setSelectedRegistrations([]);
  };

  const handleViewDetails = (registration: Registration) => {
    setSelectedRegistration(registration);
    setDetailsSheetOpen(true);
  };

  const handleReview = (registration: Registration, action: "approved" | "rejected") => {
    setSelectedRegistration(registration);
    setReviewAction(action);
    setReviewNotes("");
    setReviewDialogOpen(true);
    setDetailsSheetOpen(false); // Close details sheet if open
  };

  const handleSubmitReview = async () => {
    if (!selectedRegistration || !reviewAction) return;

    try {
      await updateStatus(selectedRegistration._id, reviewAction, reviewNotes);
      setReviewDialogOpen(false);
      setSelectedRegistration(null);
      setReviewNotes("");
      setReviewAction(null);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleExport = async () => {
    try {
      const blob = await adminApi.exportRegistrations("csv");
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `all_registrations_${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Complete",
        description: "All registrations exported successfully",
        className: "bg-green-500/10 border-green-500/20",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export registrations",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscribers</h1>
          <p className="text-muted-foreground mt-2">
            Manage and review cannabis license subscribers
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            {selectedRegistrations.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Bulk Actions ({selectedRegistrations.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkAction("Approve")}>
                    Approve Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction("Reject")}>
                    Reject Selected
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleBulkAction("Export")}>
                    Export Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("Delete")}
                    className="text-red-500 focus:text-red-500"
                  >
                    Delete Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Table */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    {data && (
                      <Checkbox
                        checked={selectedRegistrations.length === data.registrations.length && data.registrations.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    )}
                  </TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  // Loading skeleton
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center">
                        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                        <p className="text-sm text-muted-foreground">Failed to load subscribers</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data && data.registrations.length > 0 ? (
                  data.registrations.map((registration) => {
                    const status = statusConfig[registration.status];
                    const StatusIcon = status.icon;

                    return (
                      <TableRow
                        key={registration._id}
                        className={cn(
                          "transition-colors cursor-pointer hover:bg-muted/50",
                          selectedRegistrations.includes(registration._id) && "bg-muted/50"
                        )}
                        onClick={() => handleViewDetails(registration)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedRegistrations.includes(registration._id)}
                            onCheckedChange={(checked) =>
                              handleSelectRegistration(registration._id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{registration.name} {registration.surname}</p>
                            <p className="text-xs text-muted-foreground">{registration.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm capitalize">
                          {registration.registrationType}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={status.color}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <PhoneNumberDisplay phone={registration.phone} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(registration.submittedAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleViewDetails(registration)}
                              >
                                View Details
                              </DropdownMenuItem>
                              {registration.documents && registration.documents.length > 0 && (
                                <DropdownMenuItem>View Documents</DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {registration.status === "pending" && (
                                <>
                                  <DropdownMenuItem
                                    className="text-green-500"
                                    onClick={() => handleReview(registration, "approved")}
                                  >
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-500"
                                    onClick={() => handleReview(registration, "rejected")}
                                  >
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No subscribers found</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((data.page - 1) * 10) + 1} to{" "}
                {Math.min(data.page * 10, data.total)} of{" "}
                {data.total} subscribers
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: data.totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      return (
                        page === 1 ||
                        page === data.totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      );
                    })
                    .map((page, index, array) => (
                      <div key={page} className="flex items-center">
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="mx-1 text-muted-foreground">...</span>
                        )}
                        <Button
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="h-8 w-8 p-0"
                        >
                          {page}
                        </Button>
                      </div>
                    ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(data.totalPages, prev + 1))}
                  disabled={currentPage === data.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Sheet */}
      <RegistrationDetailsSheet
        registration={selectedRegistration}
        open={detailsSheetOpen}
        onOpenChange={setDetailsSheetOpen}
        onApprove={(reg) => handleReview(reg, "approved")}
        onReject={(reg) => handleReview(reg, "rejected")}
      />

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approved" ? "Approve" : "Reject"} Subscriber
            </DialogTitle>
            <DialogDescription>
              {selectedRegistration && (
                <>Review subscriber {selectedRegistration.name} {selectedRegistration.surname}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Review Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this decision (optional)..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              className={cn(
                reviewAction === "approved"
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-red-500 hover:bg-red-600"
              )}
            >
              Confirm {reviewAction === "approved" ? "Approval" : "Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}