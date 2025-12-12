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
