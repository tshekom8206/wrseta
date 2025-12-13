import { Injectable, inject } from '@angular/core';
import { Observable, of, delay, throwError, map, catchError } from 'rxjs';
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

  // Cache for all learners from API (for stats calculation)
  private allLearnersCache: Learner[] = [];

  // Cache for currently viewed learner (passed from list to detail)
  private currentLearnerCache: Learner | null = null;

  private get setaCode(): string {
    return this.authService.currentUser?.setaCode ?? 'WRSETA';
  }

  private get setaId(): number {
    return this.authService.currentUser?.setaId ?? 1;
  }

  constructor() {
    this.initializeMockData();
  }

  /**
   * Search and list learners with pagination
   */
  searchLearners(request: LearnerSearchRequest): Observable<LearnerSearchResponse> {
    // Call the real API endpoint
    return this.api.get<any>(`learners/${this.setaId}`, {
      page: request.page.toString(),
      pageSize: request.pageSize.toString()
    }).pipe(
      map(response => {
        const data = response.data || response;
        const apiLearners = data.learners || [];

        // Map API response to Learner interface
        let learners: Learner[] = apiLearners.map((apiLearner: any) => this.mapApiLearnerToLearner(apiLearner));

        // Store all learners for stats calculation
        this.allLearnersCache = learners;

        // Apply client-side filtering if needed (since API doesn't support all filters yet)
        if (request.searchTerm) {
          const term = request.searchTerm.toLowerCase();
          learners = learners.filter(l =>
            l.fullName.toLowerCase().includes(term) ||
            l.idNumber.toLowerCase().includes(term) ||
            l.email?.toLowerCase().includes(term)
          );
        }

        if (request.status) {
          learners = learners.filter(l => l.status === request.status);
        }

        if (request.verificationStatus) {
          learners = learners.filter(l => l.verificationStatus === request.verificationStatus);
        }

        // Sort
        if (request.sortBy) {
          learners.sort((a, b) => {
            const aVal = (a as any)[request.sortBy!];
            const bVal = (b as any)[request.sortBy!];
            const direction = request.sortDirection === 'desc' ? -1 : 1;

            if (aVal < bVal) return -1 * direction;
            if (aVal > bVal) return 1 * direction;
            return 0;
          });
        }

        // Paginate (client-side since API returns all learners)
        const totalCount = learners.length;
        const totalPages = Math.ceil(totalCount / request.pageSize);
        const start = (request.page - 1) * request.pageSize;
        const items = learners.slice(start, start + request.pageSize);

        return {
          items,
          totalCount,
          page: request.page,
          pageSize: request.pageSize,
          totalPages
        };
      }),
      catchError(error => {
        console.error('Error fetching learners:', error);
        // Fallback to empty result
        return of({
          items: [],
          totalCount: 0,
          page: request.page,
          pageSize: request.pageSize,
          totalPages: 0
        });
      })
    );
  }

  /**
   * Map API learner response to Learner interface
   */
  private mapApiLearnerToLearner(apiLearner: any): Learner {
    const fullName = `${apiLearner.firstName || ''} ${apiLearner.surname || ''}`.trim();

    // Use the masked ID number as-is (API already masks it)
    const idNumberMasked = apiLearner.idNumberMasked || '';

    // Try to extract date of birth from unmasked parts if possible
    // The masked format is like "980806****084" - we can extract year/month/day from visible parts
    let dateOfBirth = new Date();
    let gender: 'Male' | 'Female' | 'Other' = 'Other';

    // Try to extract info from visible parts of masked ID
    if (idNumberMasked.length >= 6) {
      const yearPart = idNumberMasked.substring(0, 2);
      const monthPart = idNumberMasked.substring(2, 4);
      const dayPart = idNumberMasked.substring(4, 6);

      if (yearPart && monthPart && dayPart && !yearPart.includes('*') && !monthPart.includes('*') && !dayPart.includes('*')) {
        const year = parseInt(yearPart, 10);
        const month = parseInt(monthPart, 10) - 1;
        const day = parseInt(dayPart, 10);
        const fullYear = year <= 24 ? 2000 + year : 1900 + year;
        dateOfBirth = new Date(fullYear, month, day);
      }
    }

    // Map status
    let status: LearnerStatus = LearnerStatus.Active;
    if (apiLearner.status === 'Active') status = LearnerStatus.Active;
    else if (apiLearner.status === 'Completed') status = LearnerStatus.Completed;
    else if (apiLearner.status === 'Withdrawn') status = LearnerStatus.Withdrawn;
    else if (apiLearner.status === 'Inactive') status = LearnerStatus.Inactive;

    // Default verification status (API doesn't provide this yet)
    const verificationStatus = VerificationStatus.Green;

    // Map qualifications
    const qualifications: Qualification[] = [];
    if (apiLearner.learnershipCode || apiLearner.programmeName) {
      qualifications.push({
        id: 1,
        name: apiLearner.programmeName || apiLearner.learnershipCode || '',
        code: apiLearner.learnershipCode || '',
        nqfLevel: 0,
        startDate: new Date(apiLearner.registrationDate),
        status: status === LearnerStatus.Completed ? QualificationStatus.Completed : QualificationStatus.InProgress,
        credits: 0
      });
    }

    return {
      id: apiLearner.learnerId,
      idNumber: idNumberMasked, // Use masked ID as-is
      firstName: apiLearner.firstName || '',
      lastName: apiLearner.surname || '',
      fullName: fullName || 'Unknown Learner',
      email: undefined, // API doesn't provide email
      phone: undefined, // API doesn't provide phone
      dateOfBirth,
      gender,
      setaId: this.setaId,
      setaCode: this.setaCode,
      enrollmentDate: new Date(apiLearner.registrationDate),
      status,
      verificationStatus,
      lastVerifiedAt: new Date(apiLearner.registrationDate),
      qualifications,
      isActive: status === LearnerStatus.Active,
      createdAt: new Date(apiLearner.registrationDate),
      updatedAt: new Date(apiLearner.registrationDate)
    };
  }

  /**
   * Get learner by ID
   * First checks cache, then falls back to API or mock data
   */
  getLearnerById(id: number): Observable<Learner | null> {
    // Check if we have the learner in cache (passed from list)
    if (this.currentLearnerCache && this.currentLearnerCache.id === id) {
      return of(this.currentLearnerCache);
    }

    // Check all learners cache
    const cachedLearner = this.allLearnersCache.find(l => l.id === id);
    if (cachedLearner) {
      return of(cachedLearner);
    }

    // Fallback to mock data
    const learner = this.mockLearners.find(l => l.id === id);
    return of(learner || null).pipe(delay(300));

    // Actual API call:
    // return this.api.get<Learner>(`learners/detail/${id}`);
  }

  /**
   * Set the current learner (used when navigating from list to detail)
   */
  setCurrentLearner(learner: Learner): void {
    this.currentLearnerCache = learner;
  }

  /**
   * Clear the current learner cache
   */
  clearCurrentLearner(): void {
    this.currentLearnerCache = null;
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
    // Use cached learners if available, otherwise fetch
    if (this.allLearnersCache.length > 0) {
      return of(this.calculateStatsFromLearners(this.allLearnersCache));
    }

    // Fetch all learners to calculate stats
    return this.api.get<any>(`learners/${this.setaId}`, {
      page: '1',
      pageSize: '1000' // Get as many as possible for accurate stats
    }).pipe(
      map(response => {
        const data = response.data || response;
        const apiLearners = data.learners || [];
        const learners = apiLearners.map((apiLearner: any) => this.mapApiLearnerToLearner(apiLearner));

        // Cache for future use
        this.allLearnersCache = learners;

        return this.calculateStatsFromLearners(learners);
      }),
      catchError(error => {
        console.error('Error fetching learner stats:', error);
        // Return empty stats on error
        return of({
          total: 0,
          active: 0,
          inactive: 0,
          completed: 0,
          withdrawn: 0,
          blocked: 0,
          byGender: { male: 0, female: 0, other: 0 },
          byVerificationStatus: { green: 0, amber: 0, red: 0, notVerified: 0 }
        });
      })
    );
  }

  /**
   * Calculate stats from learners array
   */
  private calculateStatsFromLearners(learners: Learner[]): LearnerStats {
    return {
      total: learners.length,
      active: learners.filter(l => l.status === LearnerStatus.Active).length,
      inactive: learners.filter(l => l.status === LearnerStatus.Inactive).length,
      completed: learners.filter(l => l.status === LearnerStatus.Completed).length,
      withdrawn: learners.filter(l => l.status === LearnerStatus.Withdrawn).length,
      blocked: learners.filter(l => l.status === LearnerStatus.Blocked).length,
      byGender: {
        male: learners.filter(l => l.gender === 'Male').length,
        female: learners.filter(l => l.gender === 'Female').length,
        other: learners.filter(l => l.gender === 'Other').length
      },
      byVerificationStatus: {
        green: learners.filter(l => l.verificationStatus === VerificationStatus.Green).length,
        amber: learners.filter(l => l.verificationStatus === VerificationStatus.Amber).length,
        red: learners.filter(l => l.verificationStatus === VerificationStatus.Red).length,
        notVerified: learners.filter(l => l.verificationStatus === VerificationStatus.NotVerified).length
      }
    };
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
