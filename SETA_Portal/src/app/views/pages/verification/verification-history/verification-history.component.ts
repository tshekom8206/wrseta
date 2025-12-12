import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { VerificationService } from '../../../../core/services/verification.service';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  VerificationHistoryRequest,
  VerificationHistoryResponse
} from '../../../../interfaces/verification.interface';

interface HistoryItem {
  id: number;
  idNumber: string;
  setaCode: string;
  status: 'GREEN' | 'AMBER' | 'RED';
  isDuplicate: boolean;
  verifiedBy: string;
  verifiedAt: Date;
  requestType: 'Single' | 'Batch';
}

@Component({
  selector: 'app-verification-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  template: `
    <div class="verification-history">
      <div class="page-header d-flex justify-content-between align-items-start flex-wrap gap-3">
        <div>
          <h1 class="page-title">{{ 'verification.history' | translate }}</h1>
          <p class="page-subtitle">{{ 'verification.historySubtitle' | translate }}</p>
        </div>
        <div class="d-flex gap-2">
          <a routerLink="/verification/single" class="btn btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            {{ 'nav.singleVerify' | translate }}
          </a>
          <a routerLink="/verification/batch" class="btn btn-outline-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            {{ 'nav.batchVerify' | translate }}
          </a>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3">
          <div class="stat-card">
            <div class="stat-value text-primary">{{ totalCount }}</div>
            <div class="stat-label">{{ 'verification.totalVerifications' | translate }}</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="stat-card">
            <div class="stat-value text-success">{{ greenCount }}</div>
            <div class="stat-label">{{ 'verification.green' | translate }}</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="stat-card">
            <div class="stat-value text-warning">{{ amberCount }}</div>
            <div class="stat-label">{{ 'verification.amber' | translate }}</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="stat-card">
            <div class="stat-value text-danger">{{ redCount }}</div>
            <div class="stat-label">{{ 'verification.red' | translate }}</div>
          </div>
        </div>
      </div>

      <!-- Filters Card -->
      <div class="card mb-4">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-3">
              <label class="form-label" for="searchInput">{{ 'verification.searchId' | translate }}</label>
              <div class="input-group">
                <span class="input-group-text">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </span>
                <input
                  type="text"
                  id="searchInput"
                  class="form-control"
                  [(ngModel)]="searchTerm"
                  (ngModelChange)="onSearchChange($event)"
                  placeholder="{{ 'verification.searchPlaceholder' | translate }}"
                  maxlength="13"
                />
              </div>
            </div>
            <div class="col-md-2">
              <label class="form-label" for="statusFilter">{{ 'verification.status' | translate }}</label>
              <select
                id="statusFilter"
                class="form-select"
                [(ngModel)]="statusFilter"
                (ngModelChange)="onFilterChange()"
              >
                <option value="">{{ 'common.all' | translate }}</option>
                <option value="GREEN">{{ 'verification.green' | translate }}</option>
                <option value="AMBER">{{ 'verification.amber' | translate }}</option>
                <option value="RED">{{ 'verification.red' | translate }}</option>
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label" for="typeFilter">{{ 'verification.requestType' | translate }}</label>
              <select
                id="typeFilter"
                class="form-select"
                [(ngModel)]="typeFilter"
                (ngModelChange)="onFilterChange()"
              >
                <option value="">{{ 'common.all' | translate }}</option>
                <option value="Single">{{ 'verification.single' | translate }}</option>
                <option value="Batch">{{ 'verification.batch' | translate }}</option>
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label" for="startDate">{{ 'common.startDate' | translate }}</label>
              <input
                type="date"
                id="startDate"
                class="form-control"
                [(ngModel)]="startDate"
                (ngModelChange)="onFilterChange()"
              />
            </div>
            <div class="col-md-2">
              <label class="form-label" for="endDate">{{ 'common.endDate' | translate }}</label>
              <input
                type="date"
                id="endDate"
                class="form-control"
                [(ngModel)]="endDate"
                (ngModelChange)="onFilterChange()"
              />
            </div>
            <div class="col-md-1 d-flex align-items-end">
              <button class="btn btn-outline-secondary w-100" (click)="resetFilters()" title="Reset filters">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- History Table -->
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="card-title mb-0">
            {{ 'verification.recentActivity' | translate }}
            @if (!loading) {
              <span class="badge bg-secondary ms-2">{{ response?.totalCount ?? 0 }}</span>
            }
          </h5>
          <div class="d-flex gap-2 align-items-center">
            <button class="btn btn-outline-secondary btn-sm" (click)="exportHistory()" [disabled]="historyItems.length === 0">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              {{ 'common.export' | translate }}
            </button>
            <select class="form-select form-select-sm" style="width: auto;" [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange()">
              <option [value]="10">10</option>
              <option [value]="25">25</option>
              <option [value]="50">50</option>
            </select>
          </div>
        </div>
        <div class="card-body p-0">
          @if (loading) {
            <div class="text-center py-5">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <p class="mt-2 text-muted">{{ 'common.loading' | translate }}</p>
            </div>
          } @else if (historyItems.length === 0) {
            <div class="text-center py-5">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-muted mb-3">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <h5 class="text-muted">{{ 'verification.noHistory' | translate }}</h5>
              <p class="text-muted mb-4">{{ 'verification.noHistoryDesc' | translate }}</p>
              <a routerLink="/verification/single" class="btn btn-primary">
                {{ 'verification.startVerifying' | translate }}
              </a>
            </div>
          } @else {
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead>
                  <tr>
                    <th scope="col">{{ 'verification.idNumber' | translate }}</th>
                    <th scope="col">{{ 'verification.status' | translate }}</th>
                    <th scope="col">{{ 'verification.requestType' | translate }}</th>
                    <th scope="col">{{ 'verification.duplicate' | translate }}</th>
                    <th scope="col">{{ 'verification.verifiedBy' | translate }}</th>
                    <th scope="col">{{ 'verification.verifiedAt' | translate }}</th>
                    <th scope="col" class="text-end">{{ 'common.actions' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of historyItems; track item.id) {
                    <tr>
                      <td>
                        <code class="id-number">{{ maskIdNumber(item.idNumber) }}</code>
                      </td>
                      <td>
                        <span class="status-badge" [ngClass]="'status-' + item.status.toLowerCase()">
                          @if (item.status === 'GREEN') {
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                              <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                          } @else if (item.status === 'AMBER') {
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                              <line x1="12" y1="9" x2="12" y2="13"></line>
                              <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                          } @else {
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="15" y1="9" x2="9" y2="15"></line>
                              <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                          }
                          {{ item.status }}
                        </span>
                      </td>
                      <td>
                        <span class="badge" [ngClass]="item.requestType === 'Single' ? 'bg-light text-dark' : 'bg-info'">
                          {{ item.requestType }}
                        </span>
                      </td>
                      <td>
                        @if (item.isDuplicate) {
                          <span class="text-danger">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                              <line x1="12" y1="9" x2="12" y2="13"></line>
                              <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            {{ 'common.yes' | translate }}
                          </span>
                        } @else {
                          <span class="text-success">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            {{ 'common.no' | translate }}
                          </span>
                        }
                      </td>
                      <td>{{ item.verifiedBy }}</td>
                      <td>
                        <span [title]="item.verifiedAt | date:'dd MMM yyyy HH:mm:ss'">
                          {{ getRelativeTime(item.verifiedAt) }}
                        </span>
                      </td>
                      <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary" (click)="reverify(item.idNumber)" title="Re-verify">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="1 4 1 10 7 10"></polyline>
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            @if ((response?.totalPages ?? 0) > 1) {
              <div class="card-footer d-flex justify-content-between align-items-center">
                <div class="text-muted">
                  {{ 'common.showing' | translate }} {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, response?.totalCount ?? 0) }} {{ 'common.of' | translate }} {{ response?.totalCount }}
                </div>
                <nav aria-label="History pagination">
                  <ul class="pagination pagination-sm mb-0">
                    <li class="page-item" [class.disabled]="currentPage === 1">
                      <button class="page-link" (click)="goToPage(1)" [disabled]="currentPage === 1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="11 17 6 12 11 7"></polyline>
                          <polyline points="18 17 13 12 18 7"></polyline>
                        </svg>
                      </button>
                    </li>
                    <li class="page-item" [class.disabled]="currentPage === 1">
                      <button class="page-link" (click)="goToPage(currentPage - 1)" [disabled]="currentPage === 1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                      </button>
                    </li>
                    @for (page of getVisiblePages(); track page) {
                      <li class="page-item" [class.active]="page === currentPage">
                        <button class="page-link" (click)="goToPage(page)">{{ page }}</button>
                      </li>
                    }
                    <li class="page-item" [class.disabled]="currentPage === (response?.totalPages ?? 1)">
                      <button class="page-link" (click)="goToPage(currentPage + 1)" [disabled]="currentPage === (response?.totalPages ?? 1)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </button>
                    </li>
                    <li class="page-item" [class.disabled]="currentPage === (response?.totalPages ?? 1)">
                      <button class="page-link" (click)="goToPage(response?.totalPages ?? 1)" [disabled]="currentPage === (response?.totalPages ?? 1)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="13 17 18 12 13 7"></polyline>
                          <polyline points="6 17 11 12 6 7"></polyline>
                        </svg>
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .verification-history {
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .stat-card {
      background: var(--bs-white);
      border: 1px solid var(--bs-border-color);
      border-radius: 0.5rem;
      padding: 1.25rem;
      text-align: center;
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1.2;
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--bs-secondary);
      margin-top: 0.25rem;
    }

    .card {
      border: none;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .card-header {
      background: transparent;
      border-bottom: 1px solid var(--bs-border-color);
      padding: 1rem 1.25rem;
    }

    .card-title {
      font-size: 1rem;
      font-weight: 600;
    }

    .table {
      margin-bottom: 0;
    }

    .table th {
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--bs-secondary);
      border-bottom-width: 1px;
      padding: 0.75rem 1rem;
    }

    .table td {
      padding: 0.875rem 1rem;
      vertical-align: middle;
    }

    .id-number {
      font-size: 0.875rem;
      background: var(--bs-light);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-green {
      background: #d1fae5;
      color: #065f46;
    }

    .status-amber {
      background: #fef3c7;
      color: #92400e;
    }

    .status-red {
      background: #fee2e2;
      color: #991b1b;
    }

    .badge.bg-light {
      border: 1px solid var(--bs-border-color);
    }

    .card-footer {
      background: transparent;
      border-top: 1px solid var(--bs-border-color);
      padding: 0.75rem 1.25rem;
    }

    .pagination {
      gap: 0.25rem;
    }

    .page-link {
      border-radius: 0.25rem;
      padding: 0.375rem 0.625rem;
    }
  `]
})
export class VerificationHistoryComponent implements OnInit, OnDestroy {
  private readonly verificationService = inject(VerificationService);
  private readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject$ = new Subject<string>();

  // Expose Math for template
  Math = Math;

  // Data
  historyItems: HistoryItem[] = [];
  response: VerificationHistoryResponse | null = null;

  // Loading state
  loading = true;

  // Pagination
  currentPage = 1;
  pageSize = 10;

  // Filters
  searchTerm = '';
  statusFilter = '';
  typeFilter = '';
  startDate = '';
  endDate = '';

  // Stats
  totalCount = 0;
  greenCount = 0;
  amberCount = 0;
  redCount = 0;

  ngOnInit(): void {
    // Setup debounced search
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentPage = 1;
        this.loadHistory();
      });

    this.loadHistory();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadHistory(): void {
    this.loading = true;

    const request: VerificationHistoryRequest = {
      page: this.currentPage,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm || undefined,
      status: this.statusFilter as any || undefined,
      requestType: this.typeFilter as any || undefined,
      startDate: this.startDate ? new Date(this.startDate) : undefined,
      endDate: this.endDate ? new Date(this.endDate) : undefined
    };

    this.verificationService.getHistory(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.response = response;
          this.historyItems = response.items as HistoryItem[];
          this.totalCount = response.totalCount;

          // Calculate stats
          this.greenCount = this.historyItems.filter(i => i.status === 'GREEN').length;
          this.amberCount = this.historyItems.filter(i => i.status === 'AMBER').length;
          this.redCount = this.historyItems.filter(i => i.status === 'RED').length;

          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading history:', error);
          this.loading = false;
        }
      });
  }

  onSearchChange(term: string): void {
    this.searchSubject$.next(term);
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadHistory();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.typeFilter = '';
    this.startDate = '';
    this.endDate = '';
    this.currentPage = 1;
    this.loadHistory();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadHistory();
  }

  goToPage(page: number): void {
    const totalPages = this.response?.totalPages ?? 1;
    if (page >= 1 && page <= totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadHistory();
    }
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const totalPages = this.response?.totalPages ?? 1;
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  maskIdNumber(idNumber: string): string {
    return this.verificationService.maskIdNumber(idNumber);
  }

  getRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return new Date(date).toLocaleDateString('en-ZA', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } else if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  }

  reverify(idNumber: string): void {
    // Navigate to single verify with pre-filled ID
    window.location.href = `/verification/single?id=${idNumber}`;
  }

  exportHistory(): void {
    if (this.historyItems.length === 0) return;

    const headers = ['ID Number', 'Status', 'Type', 'Duplicate', 'Verified By', 'Verified At'];
    const rows = this.historyItems.map(item => [
      item.idNumber,
      item.status,
      item.requestType,
      item.isDuplicate ? 'Yes' : 'No',
      item.verifiedBy,
      new Date(item.verifiedAt).toISOString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `verification-history-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
