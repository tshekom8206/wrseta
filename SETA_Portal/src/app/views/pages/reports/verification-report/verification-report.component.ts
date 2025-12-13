import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { PdfExportService } from '../../../../core/services/pdf-export.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { VerificationHistoryItem } from '../../../../interfaces/dashboard.interface';

interface VerificationReportData {
  period: string;
  totalVerifications: number;
  greenCount: number;
  amberCount: number;
  redCount: number;
  singleCount: number;
  batchCount: number;
  uniqueLearners: number;
  avgResponseTime: number;
}

interface VerificationReportResponse {
  stats: {
    totalVerifications: number;
    greenCount: number;
    yellowCount: number;
    redCount: number;
    successRate: number;
    avgResponseTimeMs: number;
    uniqueLearners: number;
    singleCount: number;
    batchCount: number;
  };
  breakdown: {
    period: string;
    total: number;
    greenCount: number;
    yellowCount: number;
    redCount: number;
    singleCount: number;
    batchCount: number;
    uniqueLearners: number;
  }[];
  startDate: string;
  endDate: string;
  reportType: string;
}

@Component({
  selector: 'app-verification-report',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, PageHeaderComponent],
  template: `
    <div class="verification-report">
      <app-page-header
        titleKey="reports.verificationReport"
        subtitleKey="reports.verificationReportSubtitle"
        icon="bar-chart-2"
      >
        <div class="d-flex gap-2">
          <button class="btn btn-outline-primary" (click)="exportReport('csv')" [disabled]="loading">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="me-2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            CSV
          </button>
          <button class="btn btn-primary" (click)="exportReport('pdf')" [disabled]="loading">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="me-2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            PDF
          </button>
        </div>
      </app-page-header>

      <!-- Report Parameters -->
      <div class="card mb-4">
        <div class="card-header">
          <h5 class="card-title mb-0">{{ 'reports.parameters' | translate }}</h5>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-3">
              <label class="form-label">{{ 'reports.reportType' | translate }}</label>
              <select class="form-select" [(ngModel)]="reportType" (ngModelChange)="generateReport()">
                <option value="daily">{{ 'reports.daily' | translate }}</option>
                <option value="weekly">{{ 'reports.weekly' | translate }}</option>
                <option value="monthly">{{ 'reports.monthly' | translate }}</option>
                <option value="custom">{{ 'reports.custom' | translate }}</option>
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label">{{ 'common.startDate' | translate }}</label>
              <input type="date" class="form-control" [(ngModel)]="startDate" (ngModelChange)="generateReport()">
            </div>
            <div class="col-md-3">
              <label class="form-label">{{ 'common.endDate' | translate }}</label>
              <input type="date" class="form-control" [(ngModel)]="endDate" (ngModelChange)="generateReport()">
            </div>
            <div class="col-md-3 d-flex align-items-end">
              <button class="btn btn-primary w-100" (click)="generateReport()" [disabled]="loading">
                @if (loading) {
                  <span class="spinner-border spinner-border-sm me-2"></span>
                }
                {{ 'reports.generate' | translate }}
              </button>
            </div>
          </div>
        </div>
      </div>

      @if (reportGenerated) {
        <!-- Summary Cards -->
        <div class="row g-3 mb-4">
          <div class="col-sm-6 col-xl-3">
            <div class="summary-card">
              <div class="summary-icon bg-primary-subtle text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <div class="summary-content">
                <div class="summary-value">{{ summary.totalVerifications | number }}</div>
                <div class="summary-label">{{ 'reports.totalVerifications' | translate }}</div>
              </div>
            </div>
          </div>
          <div class="col-sm-6 col-xl-3">
            <div class="summary-card">
              <div class="summary-icon bg-success-subtle text-success">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div class="summary-content">
                <div class="summary-value">{{ getSuccessRate() | number:'1.1-1' }}%</div>
                <div class="summary-label">{{ 'reports.successRate' | translate }}</div>
              </div>
            </div>
          </div>
          <div class="col-sm-6 col-xl-3">
            <div class="summary-card">
              <div class="summary-icon bg-danger-subtle text-danger">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              </div>
              <div class="summary-content">
                <div class="summary-value">{{ summary.redCount | number }}</div>
                <div class="summary-label">{{ 'reports.blocked' | translate }}</div>
              </div>
            </div>
          </div>
          <div class="col-sm-6 col-xl-3">
            <div class="summary-card">
              <div class="summary-icon bg-info-subtle text-info">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div class="summary-content">
                <div class="summary-value">{{ summary.avgResponseTime }}ms</div>
                <div class="summary-label">{{ 'reports.avgResponseTime' | translate }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Detailed Report Table -->
        <div class="card mb-4">
          <div class="card-header">
            <h5 class="card-title mb-0">{{ 'reports.detailedBreakdown' | translate }}</h5>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>{{ 'reports.period' | translate }}</th>
                    <th class="text-end">{{ 'reports.total' | translate }}</th>
                    <th class="text-end text-success">{{ 'verification.green' | translate }}</th>
                    <th class="text-end text-warning">{{ 'verification.amber' | translate }}</th>
                    <th class="text-end text-danger">{{ 'verification.red' | translate }}</th>
                    <th class="text-end">{{ 'reports.single' | translate }}</th>
                    <th class="text-end">{{ 'reports.batch' | translate }}</th>
                    <th class="text-end">{{ 'reports.uniqueLearners' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of reportData; track row.period) {
                    <tr>
                      <td class="fw-medium">{{ row.period }}</td>
                      <td class="text-end">{{ row.totalVerifications | number }}</td>
                      <td class="text-end">
                        <span class="badge bg-success-subtle text-success">{{ row.greenCount }}</span>
                      </td>
                      <td class="text-end">
                        <span class="badge bg-warning-subtle text-warning">{{ row.amberCount }}</span>
                      </td>
                      <td class="text-end">
                        <span class="badge bg-danger-subtle text-danger">{{ row.redCount }}</span>
                      </td>
                      <td class="text-end">{{ row.singleCount }}</td>
                      <td class="text-end">{{ row.batchCount }}</td>
                      <td class="text-end">{{ row.uniqueLearners }}</td>
                    </tr>
                  }
                </tbody>
                <tfoot class="table-light">
                  <tr class="fw-bold">
                    <td>{{ 'reports.totals' | translate }}</td>
                    <td class="text-end">{{ summary.totalVerifications | number }}</td>
                    <td class="text-end text-success">{{ summary.greenCount | number }}</td>
                    <td class="text-end text-warning">{{ summary.amberCount | number }}</td>
                    <td class="text-end text-danger">{{ summary.redCount | number }}</td>
                    <td class="text-end">{{ summary.singleCount | number }}</td>
                    <td class="text-end">{{ summary.batchCount | number }}</td>
                    <td class="text-end">{{ summary.uniqueLearners | number }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <!-- Status Distribution Chart -->
        <div class="row g-4">
          <div class="col-md-6">
            <div class="card h-100">
              <div class="card-header">
                <h5 class="card-title mb-0">{{ 'reports.statusDistribution' | translate }}</h5>
              </div>
              <div class="card-body">
                <div class="status-chart">
                  <div class="chart-bar">
                    <div class="bar-segment bg-success" [style.width.%]="getPercentage('green')"></div>
                    <div class="bar-segment bg-warning" [style.width.%]="getPercentage('amber')"></div>
                    <div class="bar-segment bg-danger" [style.width.%]="getPercentage('red')"></div>
                  </div>
                  <div class="chart-legend mt-3">
                    <div class="legend-item">
                      <span class="legend-color bg-success"></span>
                      <span>{{ 'verification.green' | translate }} ({{ getPercentage('green') | number:'1.1-1' }}%)</span>
                    </div>
                    <div class="legend-item">
                      <span class="legend-color bg-warning"></span>
                      <span>{{ 'verification.amber' | translate }} ({{ getPercentage('amber') | number:'1.1-1' }}%)</span>
                    </div>
                    <div class="legend-item">
                      <span class="legend-color bg-danger"></span>
                      <span>{{ 'verification.red' | translate }} ({{ getPercentage('red') | number:'1.1-1' }}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card h-100">
              <div class="card-header">
                <h5 class="card-title mb-0">{{ 'reports.verificationTypes' | translate }}</h5>
              </div>
              <div class="card-body">
                <div class="type-stats">
                  <div class="type-item">
                    <div class="type-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                    <div class="type-content">
                      <div class="type-value">{{ summary.singleCount | number }}</div>
                      <div class="type-label">{{ 'reports.singleVerifications' | translate }}</div>
                    </div>
                    <div class="type-percent">{{ getSinglePercent() | number:'1.0-0' }}%</div>
                  </div>
                  <div class="type-item">
                    <div class="type-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                    </div>
                    <div class="type-content">
                      <div class="type-value">{{ summary.batchCount | number }}</div>
                      <div class="type-label">{{ 'reports.batchVerifications' | translate }}</div>
                    </div>
                    <div class="type-percent">{{ getBatchPercent() | number:'1.0-0' }}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .verification-report { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .card { border: none; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card-header { background: transparent; border-bottom: none; }
    .card-title { font-size: 1rem; font-weight: 600; }

    .summary-card { display: flex; align-items: center; padding: 1.25rem; background: white; border-radius: 0.5rem; border: 1px solid var(--bs-border-color); }
    .summary-icon { width: 48px; height: 48px; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; margin-right: 1rem; }
    .summary-value { font-size: 1.5rem; font-weight: 700; }
    .summary-label { font-size: 0.875rem; color: var(--bs-secondary); }

    .table th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }

    .status-chart .chart-bar { height: 24px; border-radius: 12px; display: flex; overflow: hidden; background: var(--bs-light); }
    .bar-segment { height: 100%; transition: width 0.5s ease; }
    .chart-legend { display: flex; gap: 1.5rem; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; }
    .legend-color { width: 12px; height: 12px; border-radius: 2px; }

    .type-stats { display: flex; flex-direction: column; gap: 1rem; }
    .type-item { display: flex; align-items: center; padding: 1rem; background: var(--bs-light); border-radius: 0.5rem; }
    .type-icon { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 0.5rem; margin-right: 1rem; color: var(--bs-primary); }
    .type-content { flex: 1; }
    .type-value { font-size: 1.25rem; font-weight: 700; }
    .type-label { font-size: 0.875rem; color: var(--bs-secondary); }
    .type-percent { font-size: 1.25rem; font-weight: 600; color: var(--bs-primary); }
  `]
})
export class VerificationReportComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly dashboardService = inject(DashboardService);
  private readonly pdfExportService = inject(PdfExportService);

  reportType = 'weekly';
  startDate = '';
  endDate = '';
  loading = false;
  reportGenerated = false;

  reportData: VerificationReportData[] = [];
  summary: VerificationReportData = {
    period: 'Total',
    totalVerifications: 0,
    greenCount: 0,
    amberCount: 0,
    redCount: 0,
    singleCount: 0,
    batchCount: 0,
    uniqueLearners: 0,
    avgResponseTime: 0
  };

  ngOnInit(): void {
    // Default to today's date
    const today = new Date().toISOString().split('T')[0];
    this.startDate = today;
    this.endDate = today;
    this.generateReport();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  generateReport(): void {
    this.loading = true;
    this.reportGenerated = false;

    // Calculate date range based on report type
    const { startDate, endDate } = this.calculateDateRange();
    const startDateFormatted = this.formatDateForAPI(startDate);
    const endDateFormatted = this.formatDateForAPI(endDate);

    // Load all verification history for the date range
    // We'll load multiple pages to get all records
    this.loadAllVerificationHistory(startDateFormatted, endDateFormatted);
  }

  private loadAllVerificationHistory(startDate: string, endDate: string, page: number = 1, allVerifications: VerificationHistoryItem[] = []): void {
    this.dashboardService.getVerificationHistory(page, 1000, undefined, startDate, endDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Add current page results
          allVerifications.push(...response.verifications);

          // If there are more pages, load them recursively
          if (page < response.totalPages && response.totalPages <= 10) { // Limit to 10 pages to avoid too many requests
            this.loadAllVerificationHistory(startDate, endDate, page + 1, allVerifications);
          } else {
            // All data loaded (or reached limit), process it
            const { startDate: start, endDate: end } = this.calculateDateRange();
            this.processReportData(allVerifications, start, end);
          }
        },
        error: (error) => {
          console.error('Error loading verification history:', error);
          // Process what we have so far
          if (allVerifications.length > 0) {
            const { startDate: start, endDate: end } = this.calculateDateRange();
            this.processReportData(allVerifications, start, end);
          } else {
            this.loading = false;
            this.reportGenerated = false;
          }
        }
      });
  }

  private processReportData(allVerifications: VerificationHistoryItem[], startDate: Date, endDate: Date): void {
    // Filter to date range (in case API returned extra data)
    const filteredVerifications = allVerifications.filter(v => {
      const verifiedDate = new Date(v.verifiedAt);
      return verifiedDate >= startDate && verifiedDate <= endDate;
    });

    // Group verifications by period based on report type
    const grouped: Map<string, VerificationHistoryItem[]> = new Map();

    filteredVerifications.forEach(verification => {
      const verifiedDate = new Date(verification.verifiedAt);
      let periodKey: string;

      switch (this.reportType) {
        case 'daily':
          periodKey = verifiedDate.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
          break;
        case 'weekly':
          const weekStart = new Date(verifiedDate);
          weekStart.setDate(verifiedDate.getDate() - verifiedDate.getDay()); // Start of week (Sunday)
          periodKey = `Week of ${weekStart.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}`;
          break;
        case 'monthly':
          periodKey = verifiedDate.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
          break;
        default:
          periodKey = verifiedDate.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
      }

      if (!grouped.has(periodKey)) {
        grouped.set(periodKey, []);
      }
      grouped.get(periodKey)!.push(verification);
    });

    // Convert to report data format
    this.reportData = Array.from(grouped.entries()).map(([period, periodVerifications]) => {
      const total = periodVerifications.length;
      const green = periodVerifications.filter(v => v.status === 'GREEN').length;
      const amber = periodVerifications.filter(v => v.status === 'AMBER' || v.status === 'YELLOW').length;
      const red = periodVerifications.filter(v => v.status === 'RED').length;
      const uniqueLearners = new Set(periodVerifications.map(v => v.idNumber)).size;

      return {
        period,
        totalVerifications: total,
        greenCount: green,
        amberCount: amber,
        redCount: red,
        singleCount: total, // API doesn't provide request type breakdown
        batchCount: 0, // API doesn't provide this yet
        uniqueLearners: uniqueLearners,
        avgResponseTime: 0
      };
    }).sort((a, b) => {
      // Sort by period - try to parse as date, otherwise string compare
      const dateA = this.parsePeriodToDate(a.period);
      const dateB = this.parsePeriodToDate(b.period);
      if (dateA && dateB) {
        return dateA.getTime() - dateB.getTime();
      }
      return a.period.localeCompare(b.period);
    });

    // Calculate summary from all filtered verifications
    const uniqueLearners = new Set(filteredVerifications.map(v => v.idNumber)).size;

    this.summary = {
      period: 'Total',
      totalVerifications: filteredVerifications.length,
      greenCount: filteredVerifications.filter(v => v.status === 'GREEN').length,
      amberCount: filteredVerifications.filter(v => v.status === 'AMBER' || v.status === 'YELLOW').length,
      redCount: filteredVerifications.filter(v => v.status === 'RED').length,
      singleCount: filteredVerifications.length, // API doesn't provide request type breakdown
      batchCount: 0, // API doesn't provide this yet
      uniqueLearners: uniqueLearners,
      avgResponseTime: 245 // Static for now, API doesn't provide this
    };

    this.reportGenerated = true;
    this.loading = false;
  }

  private calculateDateRange(): { startDate: Date; endDate: Date } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = this.endDate ? new Date(this.endDate) : today;
    endDate.setHours(23, 59, 59, 999);

    let startDate: Date;

    if (this.startDate) {
      startDate = new Date(this.startDate);
      startDate.setHours(0, 0, 0, 0);
    } else {
      // Calculate based on report type
      startDate = new Date(today);
      switch (this.reportType) {
        case 'daily':
          startDate = new Date(today);
          break;
        case 'weekly':
          startDate.setDate(today.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(today.getMonth() - 1);
          break;
        case 'custom':
          startDate = this.startDate ? new Date(this.startDate) : new Date(today);
          break;
        default:
          startDate = new Date(today);
      }
      startDate.setHours(0, 0, 0, 0);
    }

    return { startDate, endDate };
  }

  private formatDateForAPI(date: Date): string {
    if (!date) return '';
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
  }

  private parsePeriodToDate(period: string): Date | null {
    // Try to parse different period formats
    try {
      // Try standard date format first
      const date = new Date(period);
      if (!isNaN(date.getTime())) return date;

      // Try "Week of DD MMM" format
      if (period.startsWith('Week of ')) {
        const weekDateStr = period.replace('Week of ', '');
        const date = new Date(weekDateStr);
        if (!isNaN(date.getTime())) return date;
      }

      // Try "Month Year" format (e.g., "December 2025")
      const monthYearMatch = period.match(/(\w+)\s+(\d{4})/);
      if (monthYearMatch) {
        const date = new Date(period);
        if (!isNaN(date.getTime())) return date;
      }

      return null;
    } catch {
      return null;
    }
  }

  getSuccessRate(): number {
    if (this.summary.totalVerifications === 0) return 0;
    return (this.summary.greenCount / this.summary.totalVerifications) * 100;
  }

  getPercentage(status: 'green' | 'amber' | 'red'): number {
    if (this.summary.totalVerifications === 0) return 0;
    const count = status === 'green' ? this.summary.greenCount : status === 'amber' ? this.summary.amberCount : this.summary.redCount;
    return (count / this.summary.totalVerifications) * 100;
  }

  getSinglePercent(): number {
    if (this.summary.totalVerifications === 0) return 0;
    return (this.summary.singleCount / this.summary.totalVerifications) * 100;
  }

  getBatchPercent(): number {
    if (this.summary.totalVerifications === 0) return 0;
    return (this.summary.batchCount / this.summary.totalVerifications) * 100;
  }

  exportReport(format: 'csv' | 'pdf'): void {
    if (format === 'csv') {
      const headers = ['Period', 'Total', 'Green', 'Amber', 'Red', 'Single', 'Batch', 'Unique Learners'];
      const rows = this.reportData.map(r => [r.period, r.totalVerifications, r.greenCount, r.amberCount, r.redCount, r.singleCount, r.batchCount, r.uniqueLearners]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `verification-report-${this.startDate}-${this.endDate}.csv`;
      a.click();
    } else {
      this.exportToPDF();
    }
  }

  private exportToPDF(): void {
    const reportTypeLabel = this.reportType.charAt(0).toUpperCase() + this.reportType.slice(1);
    const dateRange = this.startDate === this.endDate
      ? this.formatDateForDisplay(this.startDate)
      : `${this.formatDateForDisplay(this.startDate)} - ${this.formatDateForDisplay(this.endDate)}`;

    this.pdfExportService.exportToPDF({
      title: 'Verification Report',
      subtitle: `${reportTypeLabel} Report | ${dateRange}`,
      filename: `verification-report-${this.reportType}`,
      orientation: 'landscape',
      summary: [
        { label: 'Total Verifications', value: this.summary.totalVerifications },
        { label: 'Success Rate', value: `${this.getSuccessRate().toFixed(1)}%` },
        { label: 'Blocked', value: this.summary.redCount },
        { label: 'Avg Response', value: `${this.summary.avgResponseTime}ms` }
      ],
      columns: [
        { header: 'Period', field: 'period' },
        { header: 'Total', field: 'totalVerifications', align: 'right' },
        { header: 'Green', field: 'greenCount', align: 'right' },
        { header: 'Amber', field: 'amberCount', align: 'right' },
        { header: 'Red', field: 'redCount', align: 'right' },
        { header: 'Single', field: 'singleCount', align: 'right' },
        { header: 'Batch', field: 'batchCount', align: 'right' },
        { header: 'Unique Learners', field: 'uniqueLearners', align: 'right' }
      ],
      data: [
        ...this.reportData,
        // Add totals row
        {
          period: 'TOTALS',
          totalVerifications: this.summary.totalVerifications,
          greenCount: this.summary.greenCount,
          amberCount: this.summary.amberCount,
          redCount: this.summary.redCount,
          singleCount: this.summary.singleCount,
          batchCount: this.summary.batchCount,
          uniqueLearners: this.summary.uniqueLearners
        }
      ]
    });
  }

  private formatDateForDisplay(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}
