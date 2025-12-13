import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, timer, of, throwError } from 'rxjs';
import { catchError, map, switchMap, takeUntil, takeWhile, tap, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

// Interfaces for the new async batch API
export interface BatchIdItem {
  idNumber: string;
  reference?: string;
}

export interface BatchSubmitRequest {
  idNumbers: BatchIdItem[];
  setaId?: number;
  setaCode: string;
  submittedByUserId: string;
  submittedByName: string;
}

export interface BatchSubmitResponse {
  success: boolean;
  batchJobId: string;
  message: string;
  totalItems: number;
  statusUrl: string;
}

export interface RetryingItemInfo {
  idNumber: string;
  retryAttempt: number;
  maxRetries: number;
  reason: string;
  nextRetryAt?: Date;
}

export interface BatchJobStatus {
  batchJobId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  totalItems: number;
  processedCount: number;
  greenCount: number;
  yellowCount: number;
  redCount: number;
  failedCount: number;
  progressPercent: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  // Retry tracking
  retryingCount?: number;
  exhaustedRetriesCount?: number;
  retryingItems?: RetryingItemInfo[];
  currentActivity?: string;
}

export interface BatchItemResult {
  itemIndex: number;
  idNumber: string;
  reference?: string;
  status: 'GREEN' | 'YELLOW' | 'RED' | 'FAILED';
  message: string;
  errorCode?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  processedAt: Date;
}

export interface BatchSummary {
  greenCount: number;
  yellowCount: number;
  redCount: number;
  failedCount: number;
  greenPercent: number;
  yellowPercent: number;
  redPercent: number;
  failedPercent: number;
}

export interface BatchResultsResponse {
  batchJobId: string;
  status: string;
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
  results: BatchItemResult[];
  summary: BatchSummary;
}

export interface BatchHealthResponse {
  healthy: boolean;
  timestamp: Date;
  components: {
    name: string;
    healthy: boolean;
    details: string;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class BatchVerificationService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  // Remove /api from baseUrl since we add it in each call
  private readonly baseUrl = environment.apiUrl.replace(/\/api$/, '');

  private readonly POLL_INTERVAL = 2000; // Poll every 2 seconds

  // Current batch job tracking
  private currentBatchId$ = new BehaviorSubject<string | null>(null);
  private batchStatus$ = new BehaviorSubject<BatchJobStatus | null>(null);
  private stopPolling$ = new Subject<void>();

  /** Observable for current batch status */
  get status$(): Observable<BatchJobStatus | null> {
    return this.batchStatus$.asObservable();
  }

  /** Get current batch ID */
  get currentBatchId(): string | null {
    return this.currentBatchId$.value;
  }

  /** Get current status synchronously */
  get currentStatus(): BatchJobStatus | null {
    return this.batchStatus$.value;
  }

  /**
   * Submit a batch for async processing
   */
  submitBatch(idNumbers: BatchIdItem[]): Observable<BatchSubmitResponse> {
    const currentUser = this.authService.currentUser;

    const request: BatchSubmitRequest = {
      idNumbers,
      setaCode: currentUser?.setaCode ?? 'UNKNOWN',
      submittedByUserId: String(currentUser?.id ?? ''),
      submittedByName: currentUser?.fullName ?? ''
    };

    return this.http.post<BatchSubmitResponse>(`${this.baseUrl}/api/batch`, request).pipe(
      tap(response => {
        if (response.success) {
          this.currentBatchId$.next(response.batchJobId);
          // Start polling automatically
          this.startPolling(response.batchJobId);
        }
      }),
      catchError(error => {
        console.error('Failed to submit batch:', error);
        return throwError(() => ({
          success: false,
          message: error.error?.message || 'Failed to submit batch for processing'
        }));
      })
    );
  }

  /**
   * Start polling for batch status
   */
  startPolling(batchJobId: string): void {
    this.stopPolling$.next(); // Stop any existing polling

    timer(0, this.POLL_INTERVAL).pipe(
      takeUntil(this.stopPolling$),
      switchMap(() => this.getBatchStatus(batchJobId)),
      tap(status => {
        this.batchStatus$.next(status);
      }),
      takeWhile(status => {
        const isComplete = ['COMPLETED', 'FAILED', 'PARTIAL'].includes(status.status);
        return !isComplete;
      }, true), // inclusive - emit the final status
      finalize(() => {
        console.log('Polling stopped for batch:', batchJobId);
      })
    ).subscribe({
      error: (error) => {
        console.error('Polling error:', error);
      }
    });
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    this.stopPolling$.next();
  }

  /**
   * Get batch status
   */
  getBatchStatus(batchJobId: string): Observable<BatchJobStatus> {
    return this.http.get<BatchJobStatus>(`${this.baseUrl}/api/batch/${batchJobId}/status`).pipe(
      map(response => ({
        ...response,
        createdAt: response.createdAt ? new Date(response.createdAt) : new Date(),
        startedAt: response.startedAt ? new Date(response.startedAt) : undefined,
        completedAt: response.completedAt ? new Date(response.completedAt) : undefined
      })),
      catchError(error => {
        console.error('Failed to get batch status:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get batch results (paginated)
   */
  getBatchResults(batchJobId: string, page: number = 1, pageSize: number = 50): Observable<BatchResultsResponse> {
    return this.http.get<BatchResultsResponse>(
      `${this.baseUrl}/api/batch/${batchJobId}/results`,
      { params: { page: page.toString(), pageSize: pageSize.toString() } }
    ).pipe(
      map(response => ({
        ...response,
        results: response.results.map(r => ({
          ...r,
          processedAt: new Date(r.processedAt)
        }))
      })),
      catchError(error => {
        console.error('Failed to get batch results:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get all results (non-paginated, up to max)
   */
  getAllResults(batchJobId: string): Observable<BatchItemResult[]> {
    return this.getBatchResults(batchJobId, 1, 500).pipe(
      map(response => response.results)
    );
  }

  /**
   * Check batch API health
   */
  checkHealth(): Observable<BatchHealthResponse> {
    return this.http.get<BatchHealthResponse>(`${this.baseUrl}/api/batch/health`).pipe(
      catchError(error => {
        console.error('Health check failed:', error);
        return of({
          healthy: false,
          timestamp: new Date(),
          components: [{
            name: 'API',
            healthy: false,
            details: 'Unable to connect to batch API'
          }]
        });
      })
    );
  }

  /**
   * Reset current batch state
   */
  reset(): void {
    this.stopPolling();
    this.currentBatchId$.next(null);
    this.batchStatus$.next(null);
  }

  /**
   * Check if a batch is currently being processed
   */
  get isProcessing(): boolean {
    const status = this.batchStatus$.value;
    return status !== null && ['PENDING', 'PROCESSING'].includes(status.status);
  }

  /**
   * Check if batch processing is complete
   */
  get isComplete(): boolean {
    const status = this.batchStatus$.value;
    return status !== null && ['COMPLETED', 'FAILED', 'PARTIAL'].includes(status.status);
  }

  /**
   * List all batch jobs
   */
  listBatches(): Observable<BatchJobStatus[]> {
    return this.http.get<{ batches: BatchJobStatus[] }>(`${this.baseUrl}/api/batch/list`).pipe(
      map(response => response.batches || []),
      catchError(error => {
        console.error('Failed to list batches:', error);
        return of([]);
      })
    );
  }

  /**
   * Retry failed items in a batch
   */
  retryFailed(batchJobId: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.baseUrl}/api/batch/${batchJobId}/retry`,
      {}
    );
  }
}
