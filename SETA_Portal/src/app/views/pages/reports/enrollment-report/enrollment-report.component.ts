import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { EnrollmentReportItem } from '../../../../interfaces/dashboard.interface';

interface EnrollmentReportData {
  period: string;
  totalEnrollments: number;
  activeCount: number;
  completedCount: number;
  withdrawnCount: number;
  uniqueLearners: number;
}

@Component({
  selector: 'app-enrollment-report',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, PageHeaderComponent],
  template: `
    <div class="enrollment-report">
      <app-page-header
        titleKey="reports.enrollmentReport"
        subtitleKey="reports.enrollmentReportSubtitle"
        icon="pie-chart"
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
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div class="summary-content">
                <div class="summary-value">{{ summary.totalEnrollments | number }}</div>
                <div class="summary-label">{{ 'reports.totalEnrollments' | translate }}</div>
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
                <div class="summary-value">{{ summary.activeCount | number }}</div>
                <div class="summary-label">{{ 'reports.activeEnrollments' | translate }}</div>
              </div>
            </div>
          </div>
          <div class="col-sm-6 col-xl-3">
            <div class="summary-card">
              <div class="summary-icon bg-info-subtle text-info">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <div class="summary-content">
                <div class="summary-value">{{ summary.completedCount | number }}</div>
                <div class="summary-label">{{ 'reports.completedEnrollments' | translate }}</div>
              </div>
            </div>
          </div>
          <div class="col-sm-6 col-xl-3">
            <div class="summary-card">
              <div class="summary-icon bg-warning-subtle text-warning">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                </svg>
              </div>
              <div class="summary-content">
                <div class="summary-value">{{ getCompletionRate() | number:'1.1-1' }}%</div>
                <div class="summary-label">{{ 'reports.completionRate' | translate }}</div>
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
                    <th class="text-end text-success">{{ 'reports.active' | translate }}</th>
                    <th class="text-end text-info">{{ 'reports.completed' | translate }}</th>
                    <th class="text-end text-warning">{{ 'reports.withdrawn' | translate }}</th>
                    <th class="text-end">{{ 'reports.uniqueLearners' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of reportData; track row.period) {
                    <tr>
                      <td class="fw-medium">{{ row.period }}</td>
                      <td class="text-end">{{ row.totalEnrollments | number }}</td>
                      <td class="text-end">
                        <span class="badge bg-success-subtle text-success">{{ row.activeCount }}</span>
                      </td>
                      <td class="text-end">
                        <span class="badge bg-info-subtle text-info">{{ row.completedCount }}</span>
                      </td>
                      <td class="text-end">
                        <span class="badge bg-warning-subtle text-warning">{{ row.withdrawnCount }}</span>
                      </td>
                      <td class="text-end">{{ row.uniqueLearners }}</td>
                    </tr>
                  }
                </tbody>
                <tfoot class="table-light">
                  <tr class="fw-bold">
                    <td>{{ 'reports.totals' | translate }}</td>
                    <td class="text-end">{{ summary.totalEnrollments | number }}</td>
                    <td class="text-end text-success">{{ summary.activeCount | number }}</td>
                    <td class="text-end text-info">{{ summary.completedCount | number }}</td>
                    <td class="text-end text-warning">{{ summary.withdrawnCount | number }}</td>
                    <td class="text-end">{{ summary.uniqueLearners | number }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <!-- Status Distribution -->
        <div class="row g-4">
          <div class="col-md-6">
            <div class="card h-100">
              <div class="card-header">
                <h5 class="card-title mb-0">{{ 'reports.statusDistribution' | translate }}</h5>
              </div>
              <div class="card-body">
                <div class="status-chart">
                  <div class="chart-bar">
                    <div class="bar-segment bg-success" [style.width.%]="getPercentage('active')"></div>
                    <div class="bar-segment bg-info" [style.width.%]="getPercentage('completed')"></div>
                    <div class="bar-segment bg-warning" [style.width.%]="getPercentage('withdrawn')"></div>
                  </div>
                  <div class="chart-legend mt-3">
                    <div class="legend-item">
                      <span class="legend-color bg-success"></span>
                      <span>{{ 'reports.active' | translate }} ({{ getPercentage('active') | number:'1.1-1' }}%)</span>
                    </div>
                    <div class="legend-item">
                      <span class="legend-color bg-info"></span>
                      <span>{{ 'reports.completed' | translate }} ({{ getPercentage('completed') | number:'1.1-1' }}%)</span>
                    </div>
                    <div class="legend-item">
                      <span class="legend-color bg-warning"></span>
                      <span>{{ 'reports.withdrawn' | translate }} ({{ getPercentage('withdrawn') | number:'1.1-1' }}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card h-100">
              <div class="card-header">
                <h5 class="card-title mb-0">{{ 'reports.learnersOverview' | translate }}</h5>
              </div>
              <div class="card-body">
                <div class="learner-stats">
                  <div class="stat-item">
                    <div class="stat-icon bg-primary-subtle text-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                    <div class="stat-content">
                      <div class="stat-value">{{ summary.uniqueLearners | number }}</div>
                      <div class="stat-label">{{ 'reports.uniqueLearners' | translate }}</div>
                    </div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-icon bg-success-subtle text-success">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                        <polyline points="17 6 23 6 23 12"></polyline>
                      </svg>
                    </div>
                    <div class="stat-content">
                      <div class="stat-value">{{ getCompletionRate() | number:'1.1-1' }}%</div>
                      <div class="stat-label">{{ 'reports.completionRate' | translate }}</div>
                    </div>
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
    .enrollment-report { animation: fadeIn 0.3s ease-out; }
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

    .learner-stats { display: flex; flex-direction: column; gap: 1rem; }
    .stat-item { display: flex; align-items: center; padding: 1rem; background: var(--bs-light); border-radius: 0.5rem; }
    .stat-icon { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 0.5rem; margin-right: 1rem; }
    .stat-content { flex: 1; }
    .stat-value { font-size: 1.25rem; font-weight: 700; }
    .stat-label { font-size: 0.875rem; color: var(--bs-secondary); }
  `]
})
export class EnrollmentReportComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly dashboardService = inject(DashboardService);

  reportType = 'weekly';
  startDate = '';
  endDate = '';
  loading = false;
  reportGenerated = false;

  reportData: EnrollmentReportData[] = [];
  summary: EnrollmentReportData = {
    period: 'Total',
    totalEnrollments: 0,
    activeCount: 0,
    completedCount: 0,
    withdrawnCount: 0,
    uniqueLearners: 0
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

    // Load enrollment data with date filtering
    this.dashboardService.getEnrollmentReport(1, 1000, undefined, undefined, undefined, startDateFormatted, endDateFormatted)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.processReportData(response.enrollments, startDate, endDate);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading enrollment report:', error);
          this.loading = false;
          this.reportGenerated = false;
        }
      });
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
        default:
          startDate = new Date(today);
      }
      startDate.setHours(0, 0, 0, 0);
    }

    return { startDate, endDate };
  }

  private processReportData(allEnrollments: EnrollmentReportItem[], startDate: Date, endDate: Date): void {
    // Filter to date range (API should have already filtered, but double-check)
    const filteredEnrollments = allEnrollments.filter(e => {
      if (!e.registrationDate) return false;
      const regDate = new Date(e.registrationDate);
      return regDate >= startDate && regDate <= endDate;
    });

    // Group enrollments by period based on report type
    const grouped: Map<string, EnrollmentReportItem[]> = new Map();

    filteredEnrollments.forEach(enrollment => {
      const regDate = new Date(enrollment.registrationDate);
      let periodKey: string;

      switch (this.reportType) {
        case 'daily':
          periodKey = regDate.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
          break;
        case 'weekly':
          const weekStart = new Date(regDate);
          weekStart.setDate(regDate.getDate() - regDate.getDay()); // Start of week (Sunday)
          periodKey = `Week of ${weekStart.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}`;
          break;
        case 'monthly':
          periodKey = regDate.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
          break;
        default:
          periodKey = regDate.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
      }

      if (!grouped.has(periodKey)) {
        grouped.set(periodKey, []);
      }
      grouped.get(periodKey)!.push(enrollment);
    });

    // Convert to report data format
    this.reportData = Array.from(grouped.entries()).map(([period, periodEnrollments]) => {
      const total = periodEnrollments.length;
      const active = periodEnrollments.filter(e => e.status === 'Active').length;
      const completed = periodEnrollments.filter(e => e.status === 'Completed').length;
      const withdrawn = periodEnrollments.filter(e => e.status === 'Withdrawn').length;
      const uniqueLearners = new Set(periodEnrollments.map(e => e.idNumber)).size;

      return {
        period,
        totalEnrollments: total,
        activeCount: active,
        completedCount: completed,
        withdrawnCount: withdrawn,
        uniqueLearners: uniqueLearners
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

    // Calculate summary from all filtered enrollments
    const uniqueLearners = new Set(filteredEnrollments.map(e => e.idNumber)).size;

    this.summary = {
      period: 'Total',
      totalEnrollments: filteredEnrollments.length,
      activeCount: filteredEnrollments.filter(e => e.status === 'Active').length,
      completedCount: filteredEnrollments.filter(e => e.status === 'Completed').length,
      withdrawnCount: filteredEnrollments.filter(e => e.status === 'Withdrawn').length,
      uniqueLearners: uniqueLearners
    };

    this.reportGenerated = true;
    this.loading = false;
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

  getCompletionRate(): number {
    if (this.summary.totalEnrollments === 0) return 0;
    return (this.summary.completedCount / this.summary.totalEnrollments) * 100;
  }

  getPercentage(status: 'active' | 'completed' | 'withdrawn'): number {
    if (this.summary.totalEnrollments === 0) return 0;
    const count = status === 'active' ? this.summary.activeCount :
      status === 'completed' ? this.summary.completedCount :
        this.summary.withdrawnCount;
    return (count / this.summary.totalEnrollments) * 100;
  }

  exportReport(format: 'csv' | 'pdf'): void {
    if (format === 'csv') {
      const headers = ['Period', 'Total', 'Active', 'Completed', 'Withdrawn', 'Unique Learners'];
      const rows = this.reportData.map(r => [r.period, r.totalEnrollments, r.activeCount, r.completedCount, r.withdrawnCount, r.uniqueLearners]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enrollment-report-${this.startDate}-${this.endDate}.csv`;
      a.click();
    } else {
      alert('PDF export would be implemented with a library like jsPDF');
    }
  }
}
