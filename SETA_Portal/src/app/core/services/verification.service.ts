import { Injectable, inject } from '@angular/core';
import { Observable, of, delay, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { AuthService } from '../auth/auth.service';
import {
  VerificationRequest,
  VerificationResponse,
  BatchVerificationRequest,
  BatchVerificationResponse,
  VerificationHistoryRequest,
  VerificationHistoryResponse,
  LearnerInfo,
  DuplicateInfo
} from '../../interfaces/verification.interface';

@Injectable({
  providedIn: 'root'
})
export class VerificationService {
  private readonly api = inject(ApiService);
  private readonly authService = inject(AuthService);

  private get setaCode(): string {
    return this.authService.currentUser?.setaCode ?? '';
  }

  /**
   * Verify a single ID number
   */
  verifySingle(idNumber: string): Observable<VerificationResponse> {
    // Validate ID format first
    if (!this.isValidIdNumber(idNumber)) {
      return throwError(() => ({
        success: false,
        message: 'Invalid South African ID number format'
      }));
    }

    // Return mock data for development
    return this.getMockVerificationResult(idNumber);

    // Actual API call (uncomment when API is ready):
    // const request: VerificationRequest = {
    //   idNumber,
    //   setaCode: this.setaCode,
    //   checkDuplicates: true
    // };
    // return this.api.post<VerificationResponse>('verification/verify', request);
  }

  /**
   * Verify multiple ID numbers in batch
   */
  verifyBatch(idNumbers: string[]): Observable<BatchVerificationResponse> {
    // Filter valid ID numbers
    const validIds = idNumbers.filter(id => this.isValidIdNumber(id));

    if (validIds.length === 0) {
      return throwError(() => ({
        success: false,
        message: 'No valid ID numbers provided'
      }));
    }

    // Return mock data for development
    return this.getMockBatchResult(validIds);

    // Actual API call:
    // const request: BatchVerificationRequest = {
    //   setaCode: this.setaCode,
    //   idNumbers: validIds,
    //   checkDuplicates: true
    // };
    // return this.api.post<BatchVerificationResponse>('verification/verify-batch', request);
  }

  /**
   * Get verification history
   */
  getHistory(request: VerificationHistoryRequest): Observable<VerificationHistoryResponse> {
    // Return mock data for development
    return this.getMockHistory(request);

    // Actual API call:
    // return this.api.get<VerificationHistoryResponse>('verification/history', { params: request as any });
  }

  /**
   * Validate SA ID number format (basic validation)
   */
  isValidIdNumber(idNumber: string): boolean {
    if (!idNumber || idNumber.length !== 13) return false;
    if (!/^\d{13}$/.test(idNumber)) return false;

    // Basic Luhn check for SA ID numbers
    const digits = idNumber.split('').map(Number);

    // Check date of birth portion
    const year = parseInt(idNumber.substring(0, 2), 10);
    const month = parseInt(idNumber.substring(2, 4), 10);
    const day = parseInt(idNumber.substring(4, 6), 10);

    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;

    // Check citizenship digit (0 = SA citizen, 1 = permanent resident)
    const citizenship = parseInt(idNumber.charAt(10), 10);
    if (citizenship !== 0 && citizenship !== 1) return false;

    return true;
  }

  /**
   * Extract date of birth from ID number
   */
  extractDateOfBirth(idNumber: string): Date | null {
    if (!this.isValidIdNumber(idNumber)) return null;

    const year = parseInt(idNumber.substring(0, 2), 10);
    const month = parseInt(idNumber.substring(2, 4), 10) - 1;
    const day = parseInt(idNumber.substring(4, 6), 10);

    // Determine century (00-24 = 2000s, 25-99 = 1900s)
    const fullYear = year <= 24 ? 2000 + year : 1900 + year;

    return new Date(fullYear, month, day);
  }

  /**
   * Extract gender from ID number
   */
  extractGender(idNumber: string): string {
    if (!this.isValidIdNumber(idNumber)) return 'Unknown';
    const genderDigits = parseInt(idNumber.substring(6, 10), 10);
    return genderDigits < 5000 ? 'Female' : 'Male';
  }

  /**
   * Mask ID number for display
   */
  maskIdNumber(idNumber: string): string {
    if (idNumber.length !== 13) return idNumber;
    return idNumber.substring(0, 6) + '*****' + idNumber.substring(11);
  }

  // ============== Mock Data Methods ==============

  private getMockVerificationResult(idNumber: string): Observable<VerificationResponse> {
    // Simulate different results based on ID number patterns
    const lastDigit = parseInt(idNumber.charAt(12), 10);
    let status: 'GREEN' | 'AMBER' | 'RED';
    let message: string;
    let duplicateInfo: DuplicateInfo | undefined;

    if (lastDigit <= 6) {
      // 70% GREEN
      status = 'GREEN';
      message = 'Clear - No duplicate enrollment found. Learner can be enrolled.';
    } else if (lastDigit <= 8) {
      // 20% AMBER
      status = 'AMBER';
      message = 'Warning - Previously enrolled at another SETA but currently inactive.';
      duplicateInfo = {
        isDuplicate: true,
        totalEnrollments: 1,
        enrolledSetas: [
          {
            setaCode: 'MICT',
            setaName: 'MICT SETA',
            enrollmentDate: new Date('2022-03-15'),
            status: 'Completed'
          }
        ]
      };
    } else {
      // 10% RED
      status = 'RED';
      message = 'Blocked - Currently enrolled at another SETA. Cannot enroll at this SETA.';
      duplicateInfo = {
        isDuplicate: true,
        totalEnrollments: 1,
        enrolledSetas: [
          {
            setaCode: 'MERSETA',
            setaName: 'MERSETA',
            enrollmentDate: new Date('2024-06-01'),
            status: 'Active'
          }
        ]
      };
    }

    const learnerInfo: LearnerInfo = {
      firstName: this.generateMockName('first'),
      lastName: this.generateMockName('last'),
      fullName: '',
      dateOfBirth: this.extractDateOfBirth(idNumber) || new Date(),
      gender: this.extractGender(idNumber),
      currentSeta: status === 'RED' ? duplicateInfo?.enrolledSetas[0]?.setaName : undefined,
      enrollmentDate: status === 'RED' ? duplicateInfo?.enrolledSetas[0]?.enrollmentDate : undefined,
      status: status === 'RED' ? 'Active' : undefined
    };
    learnerInfo.fullName = `${learnerInfo.firstName} ${learnerInfo.lastName}`;

    const response: VerificationResponse = {
      success: true,
      status,
      idNumber,
      message,
      learnerInfo,
      duplicateInfo: status !== 'GREEN' ? duplicateInfo : undefined,
      verifiedAt: new Date(),
      traceId: `VRF-${Date.now()}`
    };

    return of(response).pipe(delay(800));
  }

  private getMockBatchResult(idNumbers: string[]): Observable<BatchVerificationResponse> {
    const results = idNumbers.map(idNumber => {
      const lastDigit = parseInt(idNumber.charAt(12), 10);
      let status: 'GREEN' | 'AMBER' | 'RED';
      let message: string;
      let isDuplicate: boolean;

      if (lastDigit <= 6) {
        status = 'GREEN';
        message = 'Clear';
        isDuplicate = false;
      } else if (lastDigit <= 8) {
        status = 'AMBER';
        message = 'Previously enrolled (inactive)';
        isDuplicate = true;
      } else {
        status = 'RED';
        message = 'Currently enrolled elsewhere';
        isDuplicate = true;
      }

      return { idNumber, status, message, isDuplicate };
    });

    const response: BatchVerificationResponse = {
      success: true,
      totalProcessed: results.length,
      totalGreen: results.filter(r => r.status === 'GREEN').length,
      totalAmber: results.filter(r => r.status === 'AMBER').length,
      totalRed: results.filter(r => r.status === 'RED').length,
      results,
      processedAt: new Date()
    };

    return of(response).pipe(delay(1500));
  }

  private getMockHistory(request: VerificationHistoryRequest): Observable<VerificationHistoryResponse> {
    const items = [];
    const totalCount = 50;
    const pageSize = request.pageSize || 10;
    const page = request.page || 1;

    for (let i = 0; i < pageSize; i++) {
      const statuses: Array<'GREEN' | 'AMBER' | 'RED'> = ['GREEN', 'GREEN', 'GREEN', 'AMBER', 'RED'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      items.push({
        id: (page - 1) * pageSize + i + 1,
        idNumber: this.generateMockIdNumber(),
        setaCode: this.setaCode || 'WRSETA',
        status,
        isDuplicate: status !== 'GREEN',
        verifiedBy: 'staff.user',
        verifiedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        requestType: Math.random() > 0.3 ? 'Single' : 'Batch' as 'Single' | 'Batch'
      });
    }

    return of({
      items,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize)
    }).pipe(delay(500));
  }

  private generateMockIdNumber(): string {
    const year = Math.floor(Math.random() * 30) + 70;
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const sequence = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const citizenship = '0';
    const race = '8';
    const checksum = Math.floor(Math.random() * 10);

    return `${year}${month}${day}${sequence}${citizenship}${race}${checksum}`;
  }

  private generateMockName(type: 'first' | 'last'): string {
    const firstNames = ['Thabo', 'Nomvula', 'Sipho', 'Lerato', 'Kagiso', 'Palesa', 'Bongani', 'Zanele', 'Mandla', 'Lindiwe'];
    const lastNames = ['Mokoena', 'Dlamini', 'Nkosi', 'Molefe', 'Modise', 'Radebe', 'Zulu', 'Mthembu', 'Khumalo', 'Ndlovu'];

    const names = type === 'first' ? firstNames : lastNames;
    return names[Math.floor(Math.random() * names.length)];
  }
}
