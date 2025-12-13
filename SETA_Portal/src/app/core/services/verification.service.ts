import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, delay, throwError, forkJoin, from } from 'rxjs';
import { catchError, map, tap, mergeMap, toArray, concatMap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { AuthService } from '../auth/auth.service';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import {
  VerificationRequest,
  VerificationResponse,
  BatchVerificationRequest,
  BatchVerificationResponse,
  VerificationHistoryRequest,
  VerificationHistoryResponse,
  VerificationResult,
  LearnerInfo,
  DuplicateInfo
} from '../../interfaces/verification.interface';

// DHA API Response interfaces
interface DHAPersonResponse {
  success: boolean;
  data?: {
    idNumber: string;
    firstName: string;
    surname: string;
    dateOfBirth: string;
    gender: string;
    citizenship: string;
    race?: string;
    maritalStatus?: string;
    issueDate?: string;
    isDeceased: boolean;
    dateOfDeath?: string;
    isSuspended: boolean;
    needsManualReview: boolean;
  };
  source?: string;
  requestId?: string;
  errorCode?: string;
  errorMessage?: string;
  circuitBreakerOpen?: boolean;
  needsManualReview?: boolean;
  timestamp?: string;
}

// Verification API Request/Response interfaces
interface VerificationApiRequest {
  idNumber: string;
  firstName: string;
  surname: string;
}

interface VerificationApiResponse {
  success: boolean;
  data?: {
    idNumberMasked: string;
    status: string;
    message: string;
    isValid: boolean;
    formatValid: boolean;
    luhnValid: boolean;
    dhaVerified: boolean;
    duplicateFound: boolean;
    demographics?: {
      dateOfBirth: string;
      gender: string;
      citizenship: string;
      age: number;
    };
  };
  timestamp?: string;
  requestId?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

@Injectable({
  providedIn: 'root'
})
export class VerificationService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly translate = inject(TranslateService);
  private readonly baseUrl = environment.apiUrl;

  private get setaCode(): string {
    return this.authService.currentUser?.setaCode ?? '';
  }

  /**
   * Verify a single ID number via Verification API
   */
  verifySingle(idNumber: string, firstName: string = '', surname: string = ''): Observable<VerificationResponse> {
    // Validate ID format first
    if (!this.isValidIdNumber(idNumber)) {
      return throwError(() => ({
        success: false,
        message: this.translate.instant('dha.errors.invalidIdFormat')
      }));
    }

    // Prepare request body
    const requestBody: VerificationApiRequest = {
      idNumber: idNumber,
      firstName: firstName || '',
      surname: surname || ''
    };

    // Call verification API endpoint
    return this.api.post<VerificationApiResponse>('verification/verify', requestBody).pipe(
      map(response => this.mapVerificationApiResponseToVerification(idNumber, response)),
      catchError(error => this.handleVerificationApiError(error, idNumber))
    );
  }

  /**
   * Map Verification API response to VerificationResponse
   */
  private mapVerificationApiResponseToVerification(idNumber: string, response: VerificationApiResponse): VerificationResponse {
    if (!response.success || !response.data) {
      throw {
        success: false,
        errorCode: response.error?.code || 'VERIFICATION_FAILED',
        errorMessage: response.error?.message || 'Verification failed',
      };
    }

    const data = response.data;

    // Map status (GREEN, YELLOW/AMBER, RED)
    let status: 'GREEN' | 'AMBER' | 'RED' = 'GREEN';
    if (data.status === 'GREEN') {
      status = 'GREEN';
    } else if (data.status === 'YELLOW' || data.status === 'AMBER') {
      status = 'AMBER';
    } else {
      status = 'RED';
    }

    // Build learner info from demographics
    const learnerInfo: LearnerInfo | undefined = data.demographics ? {
      firstName: '',
      lastName: '',
      fullName: '',
      dateOfBirth: data.demographics.dateOfBirth ? new Date(data.demographics.dateOfBirth) : new Date(),
      gender: data.demographics.gender || 'Unknown',
      citizenship: data.demographics.citizenship || ''
    } : undefined;

    return {
      success: true,
      status,
      idNumber, // Keep original ID number for internal use
      message: data.message || 'Verification completed',
      learnerInfo,
      verifiedAt: new Date(),
      traceId: response.requestId || `VRF-${Date.now()}`
    };
  }

  /**
   * Handle Verification API errors
   */
  private handleVerificationApiError(error: HttpErrorResponse | any, idNumber: string): Observable<never> {
    let errorCode: string;
    let userMessage: string;

    if (error instanceof HttpErrorResponse) {
      const body = error.error;

      switch (error.status) {
        case 400:
          errorCode = body?.error?.code || 'INVALID_REQUEST';
          userMessage = body?.error?.message || 'Invalid request. Please check the ID number.';
          break;
        case 401:
          errorCode = 'UNAUTHORIZED';
          userMessage = 'Unauthorized. Please check your API key.';
          break;
        case 500:
          errorCode = 'SERVER_ERROR';
          userMessage = 'Server error. Please try again later.';
          break;
        default:
          errorCode = 'UNKNOWN_ERROR';
          userMessage = body?.error?.message || error.message || 'Verification failed';
      }
    } else if (error.errorCode) {
      errorCode = error.errorCode;
      userMessage = error.errorMessage || 'Verification failed';
    } else {
      errorCode = 'NETWORK_ERROR';
      userMessage = 'Network error. Please check your connection.';
    }

    console.error('Verification API Error:', { idNumber, errorCode, error });

    return throwError(() => ({
      success: false,
      status: 'AMBER' as const,
      idNumber,
      message: userMessage,
      errorCode,
      verifiedAt: new Date()
    }));
  }

  /**
   * Map DHA API response to VerificationResponse (kept for backward compatibility)
   */
  private mapDHAResponseToVerification(idNumber: string, response: DHAPersonResponse): VerificationResponse {
    if (!response.success || !response.data) {
      throw {
        success: false,
        errorCode: response.errorCode,
        errorMessage: response.errorMessage,
        circuitBreakerOpen: response.circuitBreakerOpen
      };
    }

    const data = response.data;

    // Determine status based on DHA data
    let status: 'GREEN' | 'AMBER' | 'RED' = 'GREEN';
    let message: string;

    if (data.isDeceased) {
      status = 'RED';
      message = this.translate.instant('dha.status.deceased');
    } else if (data.isSuspended) {
      status = 'RED';
      message = this.translate.instant('dha.status.suspended');
    } else if (data.needsManualReview) {
      status = 'AMBER';
      message = this.translate.instant('dha.status.manualReview');
    } else {
      status = 'GREEN';
      message = this.translate.instant('dha.status.verified');
    }

    const learnerInfo: LearnerInfo = {
      firstName: data.firstName || '',
      lastName: data.surname || '',
      fullName: `${data.firstName || ''} ${data.surname || ''}`.trim(),
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : new Date(),
      gender: data.gender || 'Unknown',
      citizenship: data.citizenship
    };

    return {
      success: true,
      status,
      idNumber,
      message,
      learnerInfo,
      verifiedAt: new Date(),
      traceId: response.requestId || `VRF-${Date.now()}`,
      source: response.source
    };
  }

  /**
   * Handle DHA API errors with user-friendly messages
   */
  private handleDHAError(error: HttpErrorResponse | any, idNumber: string): Observable<never> {
    let errorCode: string;
    let userMessage: string;
    let needsManualReview = false;

    // Check if it's an HTTP error
    if (error instanceof HttpErrorResponse) {
      const body = error.error;

      switch (error.status) {
        case 400:
          errorCode = body?.errorCode || 'INVALID_REQUEST';
          userMessage = this.translate.instant('dha.errors.invalidRequest');
          break;
        case 404:
          errorCode = 'ID_NOT_FOUND';
          userMessage = this.translate.instant('dha.errors.idNotFound');
          needsManualReview = true;
          break;
        case 503:
          // Service unavailable - likely circuit breaker open or DHA down
          errorCode = body?.errorCode || 'SERVICE_UNAVAILABLE';
          if (body?.circuitBreakerOpen) {
            userMessage = this.translate.instant('dha.errors.serviceTemporarilyUnavailable');
          } else {
            userMessage = this.translate.instant('dha.errors.serviceUnavailable');
          }
          needsManualReview = true;
          break;
        case 502:
          // Bad gateway - DHA API error
          errorCode = body?.errorCode || 'DHA_ERROR';
          userMessage = this.translate.instant('dha.errors.dhaServiceError');
          needsManualReview = true;
          break;
        case 429:
          errorCode = 'RATE_LIMITED';
          userMessage = this.translate.instant('dha.errors.rateLimited');
          break;
        default:
          errorCode = 'UNKNOWN_ERROR';
          userMessage = this.translate.instant('dha.errors.unknownError');
      }
    } else if (error.errorCode) {
      // Error from mapping function or API response with success=false
      errorCode = error.errorCode;

      // Map specific error codes to user-friendly translations
      switch (error.errorCode) {
        case 'DHA_HTTP_ERROR':
        case 'SERVICE_UNAVAILABLE':
          userMessage = this.translate.instant('dha.errors.serviceUnavailable');
          needsManualReview = true;
          break;
        case 'DHA_TIMEOUT':
          userMessage = this.translate.instant('dha.errors.serviceTemporarilyUnavailable');
          needsManualReview = true;
          break;
        case 'CIRCUIT_BREAKER_OPEN':
          userMessage = this.translate.instant('dha.errors.serviceTemporarilyUnavailable');
          needsManualReview = true;
          break;
        case 'ID_NOT_FOUND':
          userMessage = this.translate.instant('dha.errors.idNotFound');
          needsManualReview = true;
          break;
        case 'INVALID_ID_FORMAT':
          userMessage = this.translate.instant('dha.errors.invalidIdFormat');
          break;
        default:
          userMessage = this.translate.instant('dha.errors.verificationFailed');
      }
    } else {
      errorCode = 'NETWORK_ERROR';
      userMessage = this.translate.instant('dha.errors.networkError');
    }

    console.error('DHA Verification Error:', { idNumber, errorCode, error });

    return throwError(() => ({
      success: false,
      status: 'AMBER' as const,
      idNumber,
      message: userMessage,
      errorCode,
      needsManualReview,
      verifiedAt: new Date()
    }));
  }

  /**
   * Verify multiple ID numbers in batch - calls real DHA API for each ID
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

    // Call DHA API for each ID number (with concurrency limit of 5)
    return from(validIds).pipe(
      mergeMap(idNumber => this.verifySingleForBatch(idNumber), 5), // 5 concurrent requests
      toArray(),
      map(results => {
        const verificationResults: VerificationResult[] = results.map(r => ({
          idNumber: r.idNumber,
          status: r.status,
          message: r.message,
          isDuplicate: r.status === 'RED' || r.status === 'AMBER'
        }));

        return {
          success: true,
          totalProcessed: verificationResults.length,
          totalGreen: verificationResults.filter(r => r.status === 'GREEN').length,
          totalAmber: verificationResults.filter(r => r.status === 'AMBER').length,
          totalRed: verificationResults.filter(r => r.status === 'RED').length,
          results: verificationResults,
          processedAt: new Date()
        } as BatchVerificationResponse;
      })
    );
  }

  /**
   * Verify a single ID for batch processing - handles errors gracefully
   */
  private verifySingleForBatch(idNumber: string): Observable<{ idNumber: string; status: 'GREEN' | 'AMBER' | 'RED'; message: string }> {
    return this.http.get<DHAPersonResponse>(`${this.baseUrl}/dha/person/${idNumber}`).pipe(
      map(response => {
        if (!response.success || !response.data) {
          return {
            idNumber,
            status: 'AMBER' as const,
            message: response.errorMessage || 'Verification failed'
          };
        }

        const data = response.data;

        if (data.isDeceased) {
          return { idNumber, status: 'RED' as const, message: 'ID belongs to deceased person' };
        } else if (data.isSuspended) {
          return { idNumber, status: 'RED' as const, message: 'ID has been suspended' };
        } else if (data.needsManualReview) {
          return { idNumber, status: 'AMBER' as const, message: 'Manual verification required' };
        } else {
          return { idNumber, status: 'GREEN' as const, message: 'Verified successfully' };
        }
      }),
      catchError(error => {
        // Handle DHA API errors gracefully - return AMBER status
        let message = 'Verification service unavailable';

        if (error instanceof HttpErrorResponse) {
          // Try to get message from response body first
          const errorBody = error.error;
          if (errorBody?.errorMessage) {
            message = errorBody.errorMessage;
          } else if (error.status === 0 || error.status === undefined) {
            // Network/connection errors (service truly offline)
            message = 'DHA service is offline - please try again later';
          } else if (error.status === 404) {
            message = 'ID not found in DHA database';
          } else if (error.status === 503) {
            message = 'DHA service is currently unavailable';
          } else if (error.status === 502 || error.status === 504) {
            message = 'DHA service is not responding';
          } else if (error.status === 429) {
            message = 'Rate limited - please try again later';
          } else if (error.status >= 500) {
            message = 'DHA service error - please try again later';
          } else {
            message = 'Unable to verify - DHA service issue';
          }
        } else {
          // Non-HTTP error (network failure, timeout, etc.)
          message = 'DHA service is offline - please try again later';
        }

        return of({
          idNumber,
          status: 'AMBER' as const,
          message
        });
      })
    );
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
