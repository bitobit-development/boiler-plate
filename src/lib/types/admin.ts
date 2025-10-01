export interface AdminStats {
  totalRegistrations: number;
  pendingReviews: number;
  approvedToday: number;
  rejectedToday: number;
  averageProcessingTime: number;
  activeAdmins: number;
  registrationTrend: Array<{
    date: string;
    count: number;
  }>;
  statusBreakdown: {
    pending: number;
    approved: number;
    rejected: number;
  };
}

export interface Registration {
  _id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  companyWebsite?: string;
  registrationType: "individual" | "business";
  status: "pending" | "approved" | "rejected";
  notes?: string;
  documents?: Array<{
    name: string;
    url: string;
    uploadedAt: Date;
  }>;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "super_admin";
  permissions: string[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  _id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export interface AdminNotification {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
}

export interface SocketEvent {
  event: string;
  data: any;
  timestamp: Date;
}

export interface DashboardActivity {
  type: "registration" | "review" | "admin_action" | "system";
  title: string;
  description: string;
  timestamp: Date;
  user?: string;
  icon?: string;
  color?: string;
}