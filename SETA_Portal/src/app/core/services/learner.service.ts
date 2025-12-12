import { Injectable, inject } from '@angular/core';
import { Observable, of, delay, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from '../auth/auth.service';
import {
  Learner,
  LearnerStatus,
  VerificationStatus,
  Qualification,
  QualificationStatus,
  LearnerEnrollRequest,
  LearnerSearchRequest,
  LearnerSearchResponse
} from '../../interfaces/learner.interface';

export interface QualificationOption {
  id: number;
  name: string;
  code: string;
  nqfLevel: number;
  credits: number;
}

@Injectable({
  providedIn: 'root'
})
export class LearnerService {
  private readonly api = inject(ApiService);
  private readonly authService = inject(AuthService);

  // Mock data storage
  private mockLearners: Learner[] = [];
  private initialized = false;

  private get setaCode(): string {
    return this.authService.currentUser?.setaCode ?? 'WRSETA';
  }

  constructor() {
    this.initializeMockData();
  }

  /**
   * Search and list learners with pagination
   */
  searchLearners(request: LearnerSearchRequest): Observable<LearnerSearchResponse> {
    // Return mock data for development
    return this.getMockSearchResults(request);

    // Actual API call:
    // return this.api.post<LearnerSearchResponse>('learners/search', request);
  }

  /**
   * Get learner by ID
   */
  getLearnerById(id: number): Observable<Learner | null> {
    const learner = this.mockLearners.find(l => l.id === id);
    return of(learner || null).pipe(delay(300));

    // Actual API call:
    // return this.api.get<Learner>(`learners/${id}`);
  }

  /**
   * Get learner by ID number
   */
  getLearnerByIdNumber(idNumber: string): Observable<Learner | null> {
    const learner = this.mockLearners.find(l => l.idNumber === idNumber);
    return of(learner || null).pipe(delay(300));

    // Actual API call:
    // return this.api.get<Learner>(`learners/by-id-number/${idNumber}`);
  }

  /**
   * Enroll a new learner
   */
  enrollLearner(request: LearnerEnrollRequest): Observable<Learner> {
    // Validate ID number format
    if (!this.isValidIdNumber(request.idNumber)) {
      return throwError(() => ({
        success: false,
        message: 'Invalid South African ID number format'
      }));
    }

    // Check if learner already exists
    const existing = this.mockLearners.find(l => l.idNumber === request.idNumber);
    if (existing) {
      return throwError(() => ({
        success: false,
        message: 'A learner with this ID number already exists'
      }));
    }

    // Create new learner
    const newLearner: Learner = {
      id: this.mockLearners.length + 1,
      idNumber: request.idNumber,
      firstName: request.firstName,
      lastName: request.lastName,
      fullName: `${request.firstName} ${request.lastName}`,
      email: request.email,
      phone: request.phone,
      dateOfBirth: this.extractDateOfBirth(request.idNumber) || new Date(),
      gender: this.extractGender(request.idNumber),
      setaId: 1,
      setaCode: this.setaCode,
      enrollmentDate: new Date(),
      status: LearnerStatus.Active,
      verificationStatus: VerificationStatus.Green,
      lastVerifiedAt: new Date(),
      qualifications: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add qualification if provided
    if (request.qualificationId) {
      const qual = this.getQualificationOptions().find(q => q.id === request.qualificationId);
      if (qual) {
        newLearner.qualifications.push({
          id: 1,
          name: qual.name,
          code: qual.code,
          nqfLevel: qual.nqfLevel,
          startDate: new Date(),
          status: QualificationStatus.InProgress,
          credits: qual.credits
        });
      }
    }

    this.mockLearners.unshift(newLearner);
    return of(newLearner).pipe(delay(800));

    // Actual API call:
    // return this.api.post<Learner>('learners/enroll', request);
  }

  /**
   * Update learner details
   */
  updateLearner(id: number, updates: Partial<Learner>): Observable<Learner> {
    const index = this.mockLearners.findIndex(l => l.id === id);
    if (index === -1) {
      return throwError(() => ({
        success: false,
        message: 'Learner not found'
      }));
    }

    this.mockLearners[index] = {
      ...this.mockLearners[index],
      ...updates,
      updatedAt: new Date()
    };

    return of(this.mockLearners[index]).pipe(delay(500));

    // Actual API call:
    // return this.api.put<Learner>(`learners/${id}`, updates);
  }

  /**
   * Deactivate a learner
   */
  deactivateLearner(id: number): Observable<boolean> {
    const learner = this.mockLearners.find(l => l.id === id);
    if (learner) {
      learner.status = LearnerStatus.Inactive;
      learner.isActive = false;
      learner.updatedAt = new Date();
    }
    return of(true).pipe(delay(500));

    // Actual API call:
    // return this.api.post<boolean>(`learners/${id}/deactivate`, {});
  }

  /**
   * Reactivate a learner
   */
  reactivateLearner(id: number): Observable<boolean> {
    const learner = this.mockLearners.find(l => l.id === id);
    if (learner) {
      learner.status = LearnerStatus.Active;
      learner.isActive = true;
      learner.updatedAt = new Date();
    }
    return of(true).pipe(delay(500));

    // Actual API call:
    // return this.api.post<boolean>(`learners/${id}/reactivate`, {});
  }

  /**
   * Get available qualifications for enrollment
   */
  getQualificationOptions(): QualificationOption[] {
    return [
      { id: 1, name: 'National Certificate: Wholesale and Retail Operations', code: 'NC-WRO', nqfLevel: 3, credits: 120 },
      { id: 2, name: 'Further Education and Training Certificate: Retail Supervision', code: 'FETC-RS', nqfLevel: 4, credits: 140 },
      { id: 3, name: 'National Certificate: Generic Management', code: 'NC-GM', nqfLevel: 5, credits: 120 },
      { id: 4, name: 'National Diploma: Retail Business Management', code: 'ND-RBM', nqfLevel: 5, credits: 240 },
      { id: 5, name: 'National Certificate: Supply Chain Management', code: 'NC-SCM', nqfLevel: 4, credits: 130 },
      { id: 6, name: 'Skills Programme: Customer Service Excellence', code: 'SP-CSE', nqfLevel: 3, credits: 30 },
      { id: 7, name: 'Skills Programme: Visual Merchandising', code: 'SP-VM', nqfLevel: 4, credits: 25 },
      { id: 8, name: 'Learnership: Retail Store Operations', code: 'LS-RSO', nqfLevel: 3, credits: 120 }
    ];
  }

  /**
   * Get learner statistics for the current SETA
   */
  getLearnerStats(): Observable<LearnerStats> {
    const setaLearners = this.mockLearners.filter(l => l.setaCode === this.setaCode);

    const stats: LearnerStats = {
      total: setaLearners.length,
      active: setaLearners.filter(l => l.status === LearnerStatus.Active).length,
      inactive: setaLearners.filter(l => l.status === LearnerStatus.Inactive).length,
      completed: setaLearners.filter(l => l.status === LearnerStatus.Completed).length,
      withdrawn: setaLearners.filter(l => l.status === LearnerStatus.Withdrawn).length,
      blocked: setaLearners.filter(l => l.status === LearnerStatus.Blocked).length,
      byGender: {
        male: setaLearners.filter(l => l.gender === 'Male').length,
        female: setaLearners.filter(l => l.gender === 'Female').length,
        other: setaLearners.filter(l => l.gender === 'Other').length
      },
      byVerificationStatus: {
        green: setaLearners.filter(l => l.verificationStatus === VerificationStatus.Green).length,
        amber: setaLearners.filter(l => l.verificationStatus === VerificationStatus.Amber).length,
        red: setaLearners.filter(l => l.verificationStatus === VerificationStatus.Red).length,
        notVerified: setaLearners.filter(l => l.verificationStatus === VerificationStatus.NotVerified).length
      }
    };

    return of(stats).pipe(delay(300));
  }

  // ============== Helper Methods ==============

  private isValidIdNumber(idNumber: string): boolean {
    if (!idNumber || idNumber.length !== 13) return false;
    if (!/^\d{13}$/.test(idNumber)) return false;

    const month = parseInt(idNumber.substring(2, 4), 10);
    const day = parseInt(idNumber.substring(4, 6), 10);

    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;

    const citizenship = parseInt(idNumber.charAt(10), 10);
    if (citizenship !== 0 && citizenship !== 1) return false;

    return true;
  }

  private extractDateOfBirth(idNumber: string): Date | null {
    if (!this.isValidIdNumber(idNumber)) return null;

    const year = parseInt(idNumber.substring(0, 2), 10);
    const month = parseInt(idNumber.substring(2, 4), 10) - 1;
    const day = parseInt(idNumber.substring(4, 6), 10);

    const fullYear = year <= 24 ? 2000 + year : 1900 + year;
    return new Date(fullYear, month, day);
  }

  private extractGender(idNumber: string): 'Male' | 'Female' | 'Other' {
    if (!this.isValidIdNumber(idNumber)) return 'Other';
    const genderDigits = parseInt(idNumber.substring(6, 10), 10);
    return genderDigits < 5000 ? 'Female' : 'Male';
  }

  // ============== Mock Data Methods ==============

  private getMockSearchResults(request: LearnerSearchRequest): Observable<LearnerSearchResponse> {
    let filtered = [...this.mockLearners];

    // Filter by SETA if not searching cross-SETA
    if (request.setaCode) {
      filtered = filtered.filter(l => l.setaCode === request.setaCode);
    } else {
      filtered = filtered.filter(l => l.setaCode === this.setaCode);
    }

    // Filter by search term
    if (request.searchTerm) {
      const term = request.searchTerm.toLowerCase();
      filtered = filtered.filter(l =>
        l.fullName.toLowerCase().includes(term) ||
        l.idNumber.includes(term) ||
        l.email?.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (request.status) {
      filtered = filtered.filter(l => l.status === request.status);
    }

    // Filter by verification status
    if (request.verificationStatus) {
      filtered = filtered.filter(l => l.verificationStatus === request.verificationStatus);
    }

    // Sort
    if (request.sortBy) {
      filtered.sort((a, b) => {
        const aVal = (a as any)[request.sortBy!];
        const bVal = (b as any)[request.sortBy!];
        const direction = request.sortDirection === 'desc' ? -1 : 1;

        if (aVal < bVal) return -1 * direction;
        if (aVal > bVal) return 1 * direction;
        return 0;
      });
    }

    // Paginate
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / request.pageSize);
    const start = (request.page - 1) * request.pageSize;
    const items = filtered.slice(start, start + request.pageSize);

    return of({
      items,
      totalCount,
      page: request.page,
      pageSize: request.pageSize,
      totalPages
    }).pipe(delay(500));
  }

  private initializeMockData(): void {
    if (this.initialized) return;
    this.initialized = true;

    const firstNames = ['Thabo', 'Nomvula', 'Sipho', 'Lerato', 'Kagiso', 'Palesa', 'Bongani', 'Zanele', 'Mandla', 'Lindiwe',
      'Themba', 'Mpho', 'Tshepiso', 'Dineo', 'Kabelo', 'Nthabiseng', 'Tshepo', 'Kgomotso', 'Siyabonga', 'Nokuthula'];
    const lastNames = ['Mokoena', 'Dlamini', 'Nkosi', 'Molefe', 'Modise', 'Radebe', 'Zulu', 'Mthembu', 'Khumalo', 'Ndlovu',
      'Mahlangu', 'Sibanda', 'Maseko', 'Ngwenya', 'Chauke', 'Mabaso', 'Maluleke', 'Sithole', 'Vilakazi', 'Zwane'];

    const statuses = [LearnerStatus.Active, LearnerStatus.Active, LearnerStatus.Active, LearnerStatus.Completed, LearnerStatus.Inactive];
    const verificationStatuses = [VerificationStatus.Green, VerificationStatus.Green, VerificationStatus.Green, VerificationStatus.Amber, VerificationStatus.Red];
    const qualifications = this.getQualificationOptions();

    // Generate 75 mock learners
    for (let i = 0; i < 75; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const idNumber = this.generateMockIdNumber();
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const verificationStatus = verificationStatuses[Math.floor(Math.random() * verificationStatuses.length)];
      const enrollmentDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000 * 2);

      // Assign qualification
      const qual = qualifications[Math.floor(Math.random() * qualifications.length)];
      const learnerQualifications: Qualification[] = [{
        id: i + 1,
        name: qual.name,
        code: qual.code,
        nqfLevel: qual.nqfLevel,
        startDate: enrollmentDate,
        endDate: status === LearnerStatus.Completed ? new Date() : undefined,
        status: status === LearnerStatus.Completed ? QualificationStatus.Completed : QualificationStatus.InProgress,
        credits: qual.credits
      }];

      this.mockLearners.push({
        id: i + 1,
        idNumber,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.co.za`,
        phone: `07${Math.floor(Math.random() * 10)}${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`,
        dateOfBirth: this.extractDateOfBirth(idNumber) || new Date(1990, 0, 1),
        gender: this.extractGender(idNumber),
        setaId: 1,
        setaCode: 'WRSETA',
        enrollmentDate,
        status,
        verificationStatus,
        lastVerifiedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        qualifications: learnerQualifications,
        isActive: status === LearnerStatus.Active,
        createdAt: enrollmentDate,
        updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
      });
    }
  }

  private generateMockIdNumber(): string {
    const year = Math.floor(Math.random() * 30) + 70; // 70-99 (1970-1999)
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const sequence = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const citizenship = '0';
    const race = '8';
    const checksum = Math.floor(Math.random() * 10);

    return `${year}${month}${day}${sequence}${citizenship}${race}${checksum}`;
  }
}

export interface LearnerStats {
  total: number;
  active: number;
  inactive: number;
  completed: number;
  withdrawn: number;
  blocked: number;
  byGender: {
    male: number;
    female: number;
    other: number;
  };
  byVerificationStatus: {
    green: number;
    amber: number;
    red: number;
    notVerified: number;
  };
}
