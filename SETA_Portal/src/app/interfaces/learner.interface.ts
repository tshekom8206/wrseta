export interface Learner {
  id: number;
  idNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth: Date;
  gender: 'Male' | 'Female' | 'Other';
  setaId: number;
  setaCode: string;
  enrollmentDate: Date;
  status: LearnerStatus;
  verificationStatus: VerificationStatus;
  lastVerifiedAt?: Date;
  qualifications: Qualification[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum LearnerStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  Completed = 'Completed',
  Withdrawn = 'Withdrawn',
  Blocked = 'Blocked'
}

export enum VerificationStatus {
  NotVerified = 'NotVerified',
  Green = 'Green',
  Amber = 'Amber',
  Red = 'Red'
}

export interface Qualification {
  id: number;
  name: string;
  code: string;
  nqfLevel: number;
  startDate: Date;
  endDate?: Date;
  status: QualificationStatus;
  credits: number;
}

export enum QualificationStatus {
  InProgress = 'InProgress',
  Completed = 'Completed',
  Withdrawn = 'Withdrawn'
}

export interface LearnerEnrollRequest {
  idNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  qualificationId?: number;
}

export interface LearnerSearchRequest {
  searchTerm?: string;
  setaCode?: string;
  status?: LearnerStatus;
  verificationStatus?: VerificationStatus;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface LearnerSearchResponse {
  items: Learner[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
