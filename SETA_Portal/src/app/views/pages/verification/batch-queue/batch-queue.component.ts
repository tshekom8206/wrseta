import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, interval, takeUntil } from 'rxjs';

import { BatchVerificationService, BatchJobStatus, BatchIdItem, RetryingItemInfo } from '../../../../core/services/batch-verification.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-batch-queue',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <div>
        <h1 class="page-title">Batch Queue</h1>
        <p class="page-subtitle">Monitor and manage batch verification jobs</p>
      </div>
      <button class="btn btn-primary" (click)="showSubmitModal = true">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        New Batch
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="row g-3 mb-4">
      <div class="col-md-3">
        <div class="stat-card">
          <div class="stat-icon bg-primary-subtle">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="9" x2="15" y2="9"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ getStatusCount('PENDING') + getStatusCount('PROCESSING') }}</span>
            <span class="stat-label">In Queue</span>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stat-card">
          <div class="stat-icon bg-warning-subtle">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ getTotalRetrying() }}</span>
            <span class="stat-label">Retrying</span>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stat-card">
          <div class="stat-icon bg-success-subtle">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ getStatusCount('COMPLETED') }}</span>
            <span class="stat-label">Completed</span>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stat-card">
          <div class="stat-icon bg-danger-subtle">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ getStatusCount('FAILED') + getStatusCount('PARTIAL') }}</span>
            <span class="stat-label">Failed/Partial</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Results Legend -->
    <div class="legend-card mb-4" [class.collapsed]="legendCollapsed">
      <div class="legend-header" (click)="legendCollapsed = !legendCollapsed">
        <div class="d-flex align-items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span class="legend-title">Results Legend</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="chevron">
          @if (legendCollapsed) {
            <polyline points="6 9 12 15 18 9"></polyline>
          } @else {
            <polyline points="18 15 12 9 6 15"></polyline>
          }
        </svg>
      </div>
      @if (!legendCollapsed) {
        <div class="legend-body">
          <div class="legend-item">
            <span class="badge bg-success-subtle text-success">G</span>
            <div class="legend-content">
              <strong>Green - Verified</strong>
              <span>ID verified successfully via DHA. No duplicate enrollment found.</span>
            </div>
          </div>
          <div class="legend-item">
            <span class="badge bg-warning-subtle text-warning">Y</span>
            <div class="legend-content">
              <strong>Yellow - Review Required</strong>
              <span>ID not found in DHA database or requires manual verification.</span>
            </div>
          </div>
          <div class="legend-item">
            <span class="badge bg-danger-subtle text-danger">R</span>
            <div class="legend-content">
              <strong>Red - Blocked</strong>
              <span>ID belongs to deceased/suspended person, or currently enrolled at another SETA.</span>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- Filter Tabs -->
    <div class="card">
      <div class="card-header">
        <ul class="nav nav-tabs card-header-tabs">
          <li class="nav-item">
            <button class="nav-link" [class.active]="activeFilter === 'all'" (click)="setFilter('all')">
              All ({{ batches.length }})
            </button>
          </li>
          <li class="nav-item">
            <button class="nav-link" [class.active]="activeFilter === 'active'" (click)="setFilter('active')">
              <span class="badge bg-primary me-1">{{ getStatusCount('PENDING') + getStatusCount('PROCESSING') }}</span>
              Active
            </button>
          </li>
          <li class="nav-item">
            <button class="nav-link" [class.active]="activeFilter === 'completed'" (click)="setFilter('completed')">
              <span class="badge bg-success me-1">{{ getStatusCount('COMPLETED') }}</span>
              Completed
            </button>
          </li>
          <li class="nav-item">
            <button class="nav-link" [class.active]="activeFilter === 'failed'" (click)="setFilter('failed')">
              <span class="badge bg-danger me-1">{{ getStatusCount('FAILED') + getStatusCount('PARTIAL') }}</span>
              Failed
            </button>
          </li>
        </ul>
      </div>

      <div class="card-body p-0">
        @if (loading) {
          <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2 text-muted">Loading batches...</p>
          </div>
        } @else if (filteredBatches.length === 0) {
          <div class="text-center py-5">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted mb-3">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="9" x2="15" y2="9"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            <h5 class="text-muted">No batches found</h5>
            <p class="text-secondary">Submit a new batch to get started</p>
            <button class="btn btn-primary" (click)="showSubmitModal = true">
              Submit New Batch
            </button>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Batch ID</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Results</th>
                  <th>Retrying</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (batch of filteredBatches; track batch.batchJobId) {
                  <tr [class.table-active]="expandedBatchId === batch.batchJobId">
                    <td>
                      <code class="batch-id">{{ batch.batchJobId }}</code>
                    </td>
                    <td>
                      <span class="badge" [ngClass]="getStatusClass(batch.status)">
                        @if (batch.status === 'PROCESSING') {
                          <span class="spinner-border spinner-border-sm me-1" role="status"></span>
                        }
                        {{ batch.status }}
                      </span>
                    </td>
                    <td style="min-width: 150px;">
                      <div class="d-flex align-items-center gap-2">
                        <div class="progress flex-grow-1" style="height: 6px;">
                          <div class="progress-bar"
                               [ngClass]="getProgressClass(batch.status)"
                               [style.width.%]="batch.progressPercent">
                          </div>
                        </div>
                        <small class="text-muted">{{ batch.progressPercent }}%</small>
                      </div>
                      <small class="text-muted">{{ batch.processedCount }}/{{ batch.totalItems }}</small>
                    </td>
                    <td>
                      <div class="result-badges">
                        <span class="badge bg-success-subtle text-success">{{ batch.greenCount }} G</span>
                        <span class="badge bg-warning-subtle text-warning">{{ batch.yellowCount }} Y</span>
                        <span class="badge bg-danger-subtle text-danger">{{ batch.redCount }} R</span>
                      </div>
                    </td>
                    <td>
                      @if (batch.retryingCount && batch.retryingCount > 0) {
                        <span class="badge bg-warning text-dark">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                          </svg>
                          {{ batch.retryingCount }}
                        </span>
                      } @else {
                        <span class="text-muted">-</span>
                      }
                    </td>
                    <td>
                      <small>{{ batch.createdAt | date:'dd MMM HH:mm' }}</small>
                    </td>
                    <td>
                      <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-secondary"
                                (click)="toggleExpand(batch.batchJobId)"
                                [title]="expandedBatchId === batch.batchJobId ? 'Collapse' : 'Expand'">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            @if (expandedBatchId === batch.batchJobId) {
                              <polyline points="18 15 12 9 6 15"></polyline>
                            } @else {
                              <polyline points="6 9 12 15 18 9"></polyline>
                            }
                          </svg>
                        </button>
                        @if (batch.status === 'COMPLETED' || batch.status === 'PARTIAL') {
                          <button class="btn btn-outline-primary" (click)="viewResults(batch)" title="View Results">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                        }
                        @if (batch.status === 'FAILED' || batch.status === 'PARTIAL') {
                          <button class="btn btn-outline-warning" (click)="retryFailed(batch)" title="Retry Failed">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <polyline points="23 4 23 10 17 10"></polyline>
                              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                            </svg>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>

                  <!-- Expanded Details Row -->
                  @if (expandedBatchId === batch.batchJobId) {
                    <tr class="expanded-row">
                      <td colspan="7">
                        <div class="expanded-content">
                          <div class="row">
                            <div class="col-md-6">
                              <h6 class="mb-3">Batch Details</h6>
                              <dl class="row mb-0">
                                <dt class="col-sm-4">Created</dt>
                                <dd class="col-sm-8">{{ batch.createdAt | date:'dd MMM yyyy, HH:mm:ss' }}</dd>

                                <dt class="col-sm-4">Started</dt>
                                <dd class="col-sm-8">{{ batch.startedAt ? (batch.startedAt | date:'dd MMM yyyy, HH:mm:ss') : 'Not started' }}</dd>

                                <dt class="col-sm-4">Completed</dt>
                                <dd class="col-sm-8">{{ batch.completedAt ? (batch.completedAt | date:'dd MMM yyyy, HH:mm:ss') : 'In progress' }}</dd>

                                <dt class="col-sm-4">Current Activity</dt>
                                <dd class="col-sm-8">{{ batch.currentActivity || 'None' }}</dd>
                              </dl>
                            </div>
                            <div class="col-md-6">
                              @if (batch.retryingItems && batch.retryingItems.length > 0) {
                                <h6 class="mb-3">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1 text-warning">
                                    <polyline points="23 4 23 10 17 10"></polyline>
                                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                  </svg>
                                  Items Being Retried ({{ batch.retryingItems.length }})
                                </h6>
                                <div class="retrying-list">
                                  @for (item of batch.retryingItems; track item.idNumber) {
                                    <div class="retrying-item">
                                      <code>{{ maskIdNumber(item.idNumber) }}</code>
                                      <span class="badge bg-warning text-dark ms-2">
                                        Attempt {{ item.retryAttempt }}/{{ item.maxRetries }}
                                      </span>
                                      <small class="text-muted ms-2">{{ item.reason }}</small>
                                    </div>
                                  }
                                </div>
                              } @else if (batch.exhaustedRetriesCount && batch.exhaustedRetriesCount > 0) {
                                <div class="alert alert-danger py-2">
                                  <strong>{{ batch.exhaustedRetriesCount }}</strong> items failed after maximum retries
                                </div>
                              } @else {
                                <h6 class="mb-3">Summary</h6>
                                <div class="summary-stats">
                                  <div class="summary-item text-success">
                                    <span class="summary-value">{{ batch.greenCount }}</span>
                                    <span class="summary-label">Verified</span>
                                  </div>
                                  <div class="summary-item text-warning">
                                    <span class="summary-value">{{ batch.yellowCount }}</span>
                                    <span class="summary-label">Review</span>
                                  </div>
                                  <div class="summary-item text-danger">
                                    <span class="summary-value">{{ batch.redCount }}</span>
                                    <span class="summary-label">Blocked</span>
                                  </div>
                                  <div class="summary-item text-secondary">
                                    <span class="summary-value">{{ batch.failedCount }}</span>
                                    <span class="summary-label">Failed</span>
                                  </div>
                                </div>
                              }
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>

    <!-- Submit Modal -->
    @if (showSubmitModal) {
      <div class="modal-backdrop fade show"></div>
      <div class="modal fade show d-block" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Submit New Batch</h5>
              <button type="button" class="btn-close" (click)="closeModal()"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Paste ID Numbers (one per line)</label>
                <textarea
                  class="form-control font-monospace"
                  rows="10"
                  [(ngModel)]="newBatchInput"
                  placeholder="8501015009087&#10;9012125009088&#10;7803125009089"
                ></textarea>
                <div class="form-text">Maximum 500 records per batch</div>
              </div>

              @if (parseErrors.length > 0) {
                <div class="alert alert-warning py-2">
                  <strong>{{ parseErrors.length }} invalid IDs will be skipped:</strong>
                  <small class="d-block mt-1">{{ parseErrors.slice(0, 5).join(', ') }}{{ parseErrors.length > 5 ? '...' : '' }}</small>
                </div>
              }

              <div class="d-flex justify-content-between align-items-center">
                <span class="text-muted">
                  {{ validIdCount }} valid ID numbers found
                </span>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
              <button
                type="button"
                class="btn btn-primary"
                [disabled]="validIdCount === 0 || submitting"
                (click)="submitNewBatch()"
              >
                @if (submitting) {
                  <span class="spinner-border spinner-border-sm me-2"></span>
                  Submitting...
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                  Queue {{ validIdCount }} IDs
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      background: var(--bs-body-bg);
      border: 1px solid var(--bs-border-color);
      border-radius: 0.5rem;
    }

    .stat-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 0.5rem;
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1;
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--bs-secondary);
    }

    .batch-id {
      font-size: 0.75rem;
      background: var(--bs-light);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }

    .result-badges {
      display: flex;
      gap: 0.25rem;
    }

    .result-badges .badge {
      font-size: 0.6875rem;
      font-weight: 500;
    }

    .expanded-row {
      background: var(--bs-light) !important;
    }

    .expanded-content {
      padding: 1rem;
    }

    .retrying-list {
      max-height: 200px;
      overflow-y: auto;
    }

    .retrying-item {
      padding: 0.5rem;
      background: var(--bs-body-bg);
      border-radius: 0.25rem;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }

    .summary-stats {
      display: flex;
      gap: 1rem;
    }

    .summary-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.75rem 1rem;
      background: var(--bs-body-bg);
      border-radius: 0.375rem;
      min-width: 70px;
    }

    .summary-value {
      font-size: 1.25rem;
      font-weight: 700;
    }

    .summary-label {
      font-size: 0.6875rem;
      text-transform: uppercase;
    }

    .modal.show {
      background: rgba(0,0,0,0.3);
    }

    textarea.font-monospace {
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .nav-tabs .nav-link {
      border: none;
      color: var(--bs-secondary);
      padding: 0.75rem 1rem;
    }

    .nav-tabs .nav-link.active {
      color: var(--bs-primary);
      border-bottom: 2px solid var(--bs-primary);
      background: transparent;
    }

    .progress {
      background-color: var(--bs-gray-200);
    }

    /* Legend Card Styles */
    .legend-card {
      background: var(--bs-body-bg);
      border: 1px solid var(--bs-border-color);
      border-radius: 0.5rem;
      overflow: hidden;
    }

    .legend-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      cursor: pointer;
      user-select: none;
      background: var(--bs-light);
      transition: background-color 0.2s;
    }

    .legend-header:hover {
      background: var(--bs-gray-200);
    }

    .legend-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--bs-secondary);
    }

    .legend-header .chevron {
      color: var(--bs-secondary);
      transition: transform 0.2s;
    }

    .legend-body {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      padding: 1rem;
      border-top: 1px solid var(--bs-border-color);
    }

    .legend-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      flex: 1;
      min-width: 250px;
    }

    .legend-item .badge {
      padding: 0.35rem 0.65rem;
      font-size: 0.75rem;
      font-weight: 600;
      flex-shrink: 0;
    }

    .legend-content {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .legend-content strong {
      font-size: 0.8125rem;
      color: var(--bs-body-color);
    }

    .legend-content span {
      font-size: 0.75rem;
      color: var(--bs-secondary);
      line-height: 1.4;
    }

    @media (max-width: 768px) {
      .legend-body {
        flex-direction: column;
        gap: 1rem;
      }

      .legend-item {
        min-width: auto;
      }
    }
  `]
})
export class BatchQueueComponent implements OnInit, OnDestroy {
  private readonly batchService = inject(BatchVerificationService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  batches: BatchJobStatus[] = [];
  loading = true;
  activeFilter: 'all' | 'active' | 'completed' | 'failed' = 'all';
  expandedBatchId: string | null = null;
  legendCollapsed = false; // Show legend by default

  // Submit modal
  showSubmitModal = false;
  newBatchInput = '';
  submitting = false;
  parseErrors: string[] = [];

  get filteredBatches(): BatchJobStatus[] {
    switch (this.activeFilter) {
      case 'active':
        return this.batches.filter(b => b.status === 'PENDING' || b.status === 'PROCESSING');
      case 'completed':
        return this.batches.filter(b => b.status === 'COMPLETED');
      case 'failed':
        return this.batches.filter(b => b.status === 'FAILED' || b.status === 'PARTIAL');
      default:
        return this.batches;
    }
  }

  get validIdCount(): number {
    return this.parseIdNumbers().length;
  }

  ngOnInit(): void {
    this.loadBatches();

    // Auto-refresh every 5 seconds
    interval(5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadBatches(false));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBatches(showLoading = true): void {
    if (showLoading) this.loading = true;

    this.batchService.listBatches()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (batches) => {
          this.batches = batches.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          this.loading = false;
        },
        error: (error) => {
          console.error('Failed to load batches:', error);
          this.loading = false;
        }
      });
  }

  setFilter(filter: 'all' | 'active' | 'completed' | 'failed'): void {
    this.activeFilter = filter;
  }

  getStatusCount(status: string): number {
    return this.batches.filter(b => b.status === status).length;
  }

  getTotalRetrying(): number {
    return this.batches.reduce((sum, b) => sum + (b.retryingCount || 0), 0);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'bg-secondary';
      case 'PROCESSING': return 'bg-primary';
      case 'COMPLETED': return 'bg-success';
      case 'PARTIAL': return 'bg-warning text-dark';
      case 'FAILED': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  getProgressClass(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'bg-success';
      case 'PARTIAL': return 'bg-warning';
      case 'FAILED': return 'bg-danger';
      default: return 'bg-primary progress-bar-striped progress-bar-animated';
    }
  }

  toggleExpand(batchId: string): void {
    this.expandedBatchId = this.expandedBatchId === batchId ? null : batchId;
  }

  viewResults(batch: BatchJobStatus): void {
    // Navigate to batch verify page with results
    // For now, just expand the row
    this.expandedBatchId = batch.batchJobId;
  }

  retryFailed(batch: BatchJobStatus): void {
    this.batchService.retryFailed(batch.batchJobId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.success('Failed items queued for retry');
          this.loadBatches();
        },
        error: (error) => {
          this.notificationService.error('Failed to retry: ' + error.message);
        }
      });
  }

  maskIdNumber(idNumber: string): string {
    if (!idNumber || idNumber.length < 6) return idNumber;
    return idNumber.substring(0, 6) + '*****' + idNumber.substring(idNumber.length - 2);
  }

  // Modal methods
  closeModal(): void {
    this.showSubmitModal = false;
    this.newBatchInput = '';
    this.parseErrors = [];
  }

  parseIdNumbers(): string[] {
    if (!this.newBatchInput.trim()) return [];

    const lines = this.newBatchInput.split(/[\n\r,;\t]+/);
    const validIds: string[] = [];
    this.parseErrors = [];

    for (const line of lines) {
      const cleaned = line.replace(/\D/g, '');
      if (cleaned.length === 13) {
        validIds.push(cleaned);
      } else if (cleaned.length > 0) {
        this.parseErrors.push(cleaned);
      }
    }

    return [...new Set(validIds)]; // Remove duplicates
  }

  submitNewBatch(): void {
    const idNumbers = this.parseIdNumbers();
    if (idNumbers.length === 0) {
      this.notificationService.warning('No valid ID numbers found');
      return;
    }

    if (idNumbers.length > 500) {
      this.notificationService.error('Maximum 500 IDs per batch');
      return;
    }

    this.submitting = true;

    const batchItems: BatchIdItem[] = idNumbers.map((id, index) => ({
      idNumber: id,
      reference: `Item-${index + 1}`
    }));

    this.batchService.submitBatch(batchItems)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.submitting = false;
          this.closeModal();
          this.notificationService.success(`Batch ${response.batchJobId} queued with ${idNumbers.length} IDs`);
          this.loadBatches();
        },
        error: (error) => {
          this.submitting = false;
          this.notificationService.error('Failed to submit batch: ' + error.message);
        }
      });
  }
}
