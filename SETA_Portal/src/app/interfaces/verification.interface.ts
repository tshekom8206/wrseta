export interface VerificationRequest {
  idNumber: string;
  setaCode: string;
  checkDuplicates?: boolean;
}

export interface VerificationResponse {
  success: boolean;
  status: 'GREEN' | 'AMBER' | 'RED';
  idNumber: string;
  message: string;
  learnerInfo?: LearnerInfo;
  duplicateInfo?: DuplicateInfo;
  verifiedAt: Date;
  traceId?: string;
  source?: string;  // 'DHA_API', 'CACHE', or 'SIMULATED'
  errorCode?: string;
  needsManualReview?: boolean;
}

export interface LearnerInfo {
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: Date;
  gender: string;
  citizenship?: string;
  currentSeta?: string;
  enrollmentDate?: Date;
  status?: string;
}

export interface DuplicateInfo {
  isDuplicate: boolean;
  enrolledSetas: EnrolledSeta[];
  totalEnrollments: number;
}

export interface EnrolledSeta {
  setaCode: string;
  setaName: string;
  enrollmentDate: Date;
  status: string;
}

export interface BatchVerificationRequest {
  setaCode: string;
  idNumbers: string[];
  checkDuplicates?: boolean;
}

export interface BatchVerificationResponse {
  success: boolean;
  totalProcessed: number;
  totalGreen: number;
  totalAmber: number;
  totalRed: number;
  results: VerificationResult[];
  processedAt: Date;
}

export interface VerificationResult {
  idNumber: string;
  status: 'GREEN' | 'AMBER' | 'RED';
  message: string;
  isDuplicate: boolean;
  enrolledSetas?: string[];
}

export interface VerificationHistory {
  id: number;
  idNumber: string;
  setaCode: string;
  status: 'GREEN' | 'AMBER' | 'RED';
  isDuplicate: boolean;
  verifiedBy: string;
  verifiedAt: Date;
  requestType: 'Single' | 'Batch';
  batchId?: string;
}

export interface VerificationHistoryRequest {
  setaCode?: string;
  status?: string;
  requestType?: 'Single' | 'Batch';
  searchTerm?: string;
  startDate?: Date;
  endDate?: Date;
  page: number;
  pageSize: number;
}

export interface VerificationHistoryResponse {
  items: VerificationHistory[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
