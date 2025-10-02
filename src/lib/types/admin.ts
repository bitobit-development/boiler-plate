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
  id?: string;
  name: string;
  surname?: string;
  email: string;
  phone: string;
  mobile?: string;
  companyName: string;
  companyWebsite?: string;
  registrationType: string;
  status: "pending" | "approved" | "rejected";
  ageVerified?: boolean;
  emailVerified?: boolean;
  mobileVerified?: boolean;
  source?: string;
  notes?: string;
  tags?: string[];
  documents?: Array<{
    id?: string;
    name: string;
    url?: string;
    type?: string;
    size?: number;
    uploadedAt?: Date | string;
  }>;
  customFields?: Record<string, any>;
  submittedAt: Date | string;
  reviewedAt?: Date;
  reviewedBy?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  // Extended data
  auditLogs?: any[];
  statusHistory?: any[];
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