import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';

interface AuditLogEntry {
  id: number;
  action: string;
  category: 'AUTH' | 'VERIFICATION' | 'LEARNER' | 'ADMIN' | 'SYSTEM';
  description: string;
  userId: string;
  userName: string;
  ipAddress: string;
  userAgent: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  metadata?: Record<string, any>;
  createdAt: Date;
}

interface AuditReportApiItem {
  auditId: number;
  action: string;
  tableAffected?: string | null;
  recordId?: number | null;
  idNumber?: string | null;
  details?: string | null;
  userId?: string | null;
  ipAddress?: string | null;
  actionDate: string;
  success: boolean;
  category: 'AUTH' | 'VERIFICATION' | 'LEARNER' | 'ADMIN' | 'SYSTEM';
}

interface AuditReportApiResponse {
  items: AuditReportApiItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="audit-log">
      <div class="page-header d-flex justify-content-between align-items-start flex-wrap gap-3">
        <div>
          <h1 class="page-title">{{ 'reports.auditLog' | translate }}</h1>
          <p class="page-subtitle">{{ 'reports.auditLogSubtitle' | translate }}</p>
        </div>
        <button class="btn btn-outline-primary" (click)="exportLog()" [disabled]="logs.length === 0">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          {{ 'common.export' | translate }}
        </button>
      </div>

      <!-- Filters -->
      <div class="card mb-4">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-3">
              <label class="form-label">{{ 'reports.category' | translate }}</label>
              <select class="form-select" [(ngModel)]="categoryFilter" (ngModelChange)="applyFilters()">
                <option value="">{{ 'common.all' | translate }}</option>
                <option value="AUTH">{{ 'reports.categoryAuth' | translate }}</option>
                <option value="VERIFICATION">{{ 'reports.categoryVerification' | translate }}</option>
                <option value="LEARNER">{{ 'reports.categoryLearner' | translate }}</option>
                <option value="ADMIN">{{ 'reports.categoryAdmin' | translate }}</option>
                <option value="SYSTEM">{{ 'reports.categorySystem' | translate }}</option>
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label">{{ 'reports.status' | translate }}</label>
              <select class="form-select" [(ngModel)]="statusFilter" (ngModelChange)="applyFilters()">
                <option value="">{{ 'common.all' | translate }}</option>
                <option value="SUCCESS">{{ 'common.success' | translate }}</option>
                <option value="FAILURE">{{ 'common.failure' | translate }}</option>
                <option value="WARNING">{{ 'common.warning' | translate }}</option>
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label">{{ 'reports.user' | translate }}</label>
              <input type="text" class="form-control" [(ngModel)]="userFilter" (ngModelChange)="applyFilters()" placeholder="Username">
            </div>
            <div class="col-md-2">
              <label class="form-label">{{ 'common.startDate' | translate }}</label>
              <input type="date" class="form-control" [(ngModel)]="startDate" (ngModelChange)="applyFilters()">
            </div>
            <div class="col-md-2">
              <label class="form-label">{{ 'common.endDate' | translate }}</label>
              <input type="date" class="form-control" [(ngModel)]="endDate" (ngModelChange)="applyFilters()">
            </div>
            <div class="col-md-1 d-flex align-items-end">
              <button class="btn btn-outline-secondary w-100" (click)="resetFilters()" title="Reset">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Audit Log Table -->
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="card-title mb-0">
            {{ 'reports.activityLog' | translate }}
            <span class="badge bg-secondary ms-2">{{ filteredLogs.length }}</span>
          </h5>
          <select class="form-select form-select-sm" style="width: auto;" [(ngModel)]="pageSize" (ngModelChange)="updatePagination()">
            <option [value]="25">25</option>
            <option [value]="50">50</option>
            <option [value]="100">100</option>
          </select>
        </div>
        <div class="card-body p-0">
          @if (loading) {
            <div class="text-center py-5">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
            </div>
          } @else if (paginatedLogs.length === 0) {
            <div class="text-center py-5">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-muted mb-3">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <h5 class="text-muted">{{ 'reports.noLogs' | translate }}</h5>
            </div>
          } @else {
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>{{ 'reports.timestamp' | translate }}</th>
                    <th>{{ 'reports.category' | translate }}</th>
                    <th>{{ 'reports.action' | translate }}</th>
                    <th>{{ 'reports.user' | translate }}</th>
                    <th>{{ 'reports.status' | translate }}</th>
                    <th>{{ 'reports.ipAddress' | translate }}</th>
                    <th class="text-end">{{ 'common.details' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (log of paginatedLogs; track log.id) {
                    <tr>
                      <td>
                        <small class="text-muted">{{ log.createdAt | date:'dd MMM yyyy' }}</small><br>
                        <small>{{ log.createdAt | date:'HH:mm:ss' }}</small>
                      </td>
                      <td>
                        <span class="badge" [ngClass]="getCategoryClass(log.category)">
                          {{ log.category }}
                        </span>
                      </td>
                      <td>
                        <strong>{{ log.action }}</strong><br>
                        <small class="text-muted">{{ log.description }}</small>
                      </td>
                      <td>{{ log.userName }}</td>
                      <td>
                        <span class="status-badge" [ngClass]="'status-' + log.status.toLowerCase()">
                          @if (log.status === 'SUCCESS') {
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          } @else if (log.status === 'FAILURE') {
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          } @else {
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                              <line x1="12" y1="9" x2="12" y2="13"></line>
                              <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                          }
                          {{ log.status }}
                        </span>
                      </td>
                      <td><code>{{ log.ipAddress }}</code></td>
                      <td class="text-end">
                        <button class="btn btn-sm btn-outline-secondary" (click)="viewDetails(log)">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            @if (totalPages > 1) {
              <div class="card-footer d-flex justify-content-between align-items-center">
                <span class="text-muted">
                  {{ 'common.showing' | translate }} {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, filteredLogs.length) }} {{ 'common.of' | translate }} {{ filteredLogs.length }}
                </span>
                <nav>
                  <ul class="pagination pagination-sm mb-0">
                    <li class="page-item" [class.disabled]="currentPage === 1">
                      <button class="page-link" (click)="goToPage(currentPage - 1)">
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
                    <li class="page-item" [class.disabled]="currentPage === totalPages">
                      <button class="page-link" (click)="goToPage(currentPage + 1)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="9 18 15 12 9 6"></polyline>
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

      <!-- Details Modal -->
      @if (selectedLog) {
        <div class="modal-backdrop show" (click)="selectedLog = null"></div>
        <div class="modal show d-block" tabindex="-1">
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">{{ 'reports.logDetails' | translate }}</h5>
                <button type="button" class="btn-close" (click)="selectedLog = null"></button>
              </div>
              <div class="modal-body">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label text-muted">{{ 'reports.action' | translate }}</label>
                    <p class="mb-0 fw-medium">{{ selectedLog.action }}</p>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label text-muted">{{ 'reports.timestamp' | translate }}</label>
                    <p class="mb-0">{{ selectedLog.createdAt | date:'dd MMM yyyy HH:mm:ss' }}</p>
                  </div>
                  <div class="col-12">
                    <label class="form-label text-muted">{{ 'reports.description' | translate }}</label>
                    <p class="mb-0">{{ selectedLog.description }}</p>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label text-muted">{{ 'reports.user' | translate }}</label>
                    <p class="mb-0">{{ selectedLog.userName }} ({{ selectedLog.userId }})</p>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label text-muted">{{ 'reports.ipAddress' | translate }}</label>
                    <p class="mb-0"><code>{{ selectedLog.ipAddress }}</code></p>
                  </div>
                  <div class="col-12">
                    <label class="form-label text-muted">{{ 'reports.userAgent' | translate }}</label>
                    <p class="mb-0 small">{{ selectedLog.userAgent }}</p>
                  </div>
                  @if (selectedLog.metadata) {
                    <div class="col-12">
                      <label class="form-label text-muted">{{ 'reports.metadata' | translate }}</label>
                      <pre class="bg-light p-3 rounded mb-0"><code>{{ selectedLog.metadata | json }}</code></pre>
                    </div>
                  }
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" (click)="selectedLog = null">{{ 'common.close' | translate }}</button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .audit-log { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    .card { border: none; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card-header { background: transparent; border-bottom: 1px solid var(--bs-border-color); }
    .card-title { font-size: 1rem; font-weight: 600; }

    .table th { font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--bs-secondary); }
    .table td { vertical-align: middle; }

    .badge.bg-auth { background: #dbeafe; color: #1e40af; }
    .badge.bg-verification { background: #d1fae5; color: #065f46; }
    .badge.bg-learner { background: #fef3c7; color: #92400e; }
    .badge.bg-admin { background: #fce7f3; color: #9d174d; }
    .badge.bg-system { background: #e5e7eb; color: #374151; }

    .status-badge { display: inline-flex; align-items: center; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; }
    .status-success { background: #d1fae5; color: #065f46; }
    .status-failure { background: #fee2e2; color: #991b1b; }
    .status-warning { background: #fef3c7; color: #92400e; }

    .modal { background: rgba(0,0,0,0.5); }
    .pagination { gap: 0.25rem; }
    .page-link { border-radius: 0.25rem; }
  `]
})
export class AuditLogComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly api = inject(ApiService);
  Math = Math;

  logs: AuditLogEntry[] = [];
  filteredLogs: AuditLogEntry[] = [];
  paginatedLogs: AuditLogEntry[] = [];
  selectedLog: AuditLogEntry | null = null;
  loading = true;

  // Filters
  categoryFilter = '';
  statusFilter = '';
  userFilter = '';
  startDate = '';
  endDate = '';

  // Pagination
  currentPage = 1;
  pageSize = 25;
  totalPages = 1;

  ngOnInit(): void {
    // Default dates to today
    const today = new Date().toISOString().split('T')[0];
    this.startDate = today;
    this.endDate = today;
    this.loadLogs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadLogs(): void {
    this.loading = true;
    const params: Record<string, string | number | boolean> = {
      page: this.currentPage,
      pageSize: this.pageSize
    };

    if (this.startDate) params['startDate'] = this.startDate;
    if (this.endDate) params['endDate'] = this.endDate;
    if (this.userFilter) params['userId'] = this.userFilter;

    // Map UI status filter to API "success" filter
    if (this.statusFilter === 'SUCCESS') params['success'] = true;
    if (this.statusFilter === 'FAILURE') params['success'] = false;

    this.api.get<any>('reports/audit', params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (apiResponse) => {
          const payload: AuditReportApiResponse = (apiResponse?.data ?? apiResponse) as AuditReportApiResponse;

          const items = Array.isArray(payload?.items) ? payload.items : [];
          this.totalPages = payload?.totalPages ?? 1;

          this.logs = items.map(i => this.mapApiItemToLog(i));
          this.applyClientCategoryFilter();
          this.loading = false;
        },
        error: () => {
          this.logs = [];
          this.filteredLogs = [];
          this.paginatedLogs = [];
          this.totalPages = 1;
          this.loading = false;
        }
      });
  }

  private mapApiItemToLog(item: AuditReportApiItem): AuditLogEntry {
    const createdAt = item?.actionDate ? new Date(item.actionDate) : new Date();
    const description = item?.details || '';
    const action = item?.action || '';

    let status: AuditLogEntry['status'] = item?.success ? 'SUCCESS' : 'FAILURE';
    // Heuristic: treat "pending"/"review" as WARNING (useful for demo/YELLOW flows)
    const descLower = description.toLowerCase();
    if (item?.success && (descLower.includes('pending') || descLower.includes('review'))) {
      status = 'WARNING';
    }

    const metadata: Record<string, any> | undefined = {
      tableAffected: item?.tableAffected ?? undefined,
      recordId: item?.recordId ?? undefined,
      idNumber: item?.idNumber ?? undefined
    };

    return {
      id: item?.auditId ?? 0,
      action,
      category: item?.category ?? 'SYSTEM',
      description,
      userId: item?.userId ?? '',
      userName: item?.userId ?? '',
      ipAddress: item?.ipAddress ?? '',
      userAgent: 'SETA.API',
      status,
      metadata,
      createdAt
    };
  }

  private applyClientCategoryFilter(): void {
    this.filteredLogs = this.logs.filter(log => {
      if (this.categoryFilter && log.category !== this.categoryFilter) return false;
      if (this.statusFilter === 'WARNING' && log.status !== 'WARNING') return false;
      return true;
    });
    this.paginatedLogs = this.filteredLogs;
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadLogs();
  }

  resetFilters(): void {
    this.categoryFilter = '';
    this.statusFilter = '';
    this.userFilter = '';
    this.startDate = '';
    this.endDate = '';
    this.currentPage = 1;
    this.loadLogs();
  }

  updatePagination(): void {
    this.currentPage = 1;
    this.loadLogs();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadLogs();
    }
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - 2);
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  getCategoryClass(category: string): string {
    return `bg-${category.toLowerCase()}`;
  }

  viewDetails(log: AuditLogEntry): void {
    this.selectedLog = log;
  }

  exportLog(): void {
    const headers = ['Timestamp', 'Category', 'Action', 'Description', 'User', 'Status', 'IP Address'];
    const rows = this.filteredLogs.map(log => [
      new Date(log.createdAt).toISOString(),
      log.category,
      log.action,
      log.description,
      log.userName,
      log.status,
      log.ipAddress
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }
}
