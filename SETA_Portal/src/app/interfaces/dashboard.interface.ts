export interface DashboardStats {
  totalLearners: number;
  activeLearners: number;
  verificationsToday: number;
  verificationsThisWeek: number;
  verificationsThisMonth: number;
  duplicatesBlockedToday: number;
  duplicatesBlockedThisMonth: number;
  successRate: number;
  errorRate: number;
  averageResponseTime: number;
}

export interface VerificationTrend {
  date: string;
  total: number;
  green: number;
  amber: number;
  red: number;
  duplicates: number;
}

export interface RecentVerification {
  id: number;
  idNumber: string;
  maskedIdNumber: string;
  status: 'GREEN' | 'AMBER' | 'RED';
  learnerName?: string;
  verifiedBy: string;
  verifiedAt: Date;
  isDuplicate: boolean;
}

export interface BlockedLearner {
  idNumber: string;
  maskedIdNumber: string;
  learnerName: string;
  enrolledSetas: string[];
  lastAttemptedAt: Date;
  attemptCount: number;
}

export interface ActivityLog {
  id: number;
  action: string;
  description: string;
  performedBy: string;
  performedAt: Date;
  ipAddress?: string;
  details?: Record<string, unknown>;
}

export interface VerificationHistoryItem {
  verificationId: number;
  idNumber: string;
  firstName?: string;
  surname?: string;
  status: 'GREEN' | 'YELLOW' | 'RED' | 'AMBER';
  statusReason?: string;
  formatValid: boolean;
  luhnValid: boolean;
  dhaVerified: boolean;
  duplicateFound: boolean;
  conflictingSetaId?: number;
  verifiedBy: string;
  message?: string;
  verifiedAt: Date;
}

export interface VerificationHistoryResponse {
  verifications: VerificationHistoryItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface RecentVerificationHistoryResponse {
  verifications: VerificationHistoryItem[];
  count: number;
  setaId: number;
}

export interface EnrollmentReportItem {
  learnerId: number;
  idNumber: string;
  firstName?: string;
  surname?: string;
  dateOfBirth?: Date;
  gender?: string;
  learnershipCode?: string;
  learnershipName?: string;
  enrollmentYear?: number;
  province?: string;
  registrationDate: Date;
  status: string;
  enrollmentId?: string;
  createdBy?: string;
}

export interface EnrollmentReportResponse {
  enrollments: EnrollmentReportItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
