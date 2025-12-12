import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil, forkJoin } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { RecentVerificationsComponent } from './components/recent-verifications.component';
import { BlockedLearnersComponent } from './components/blocked-learners.component';
import { VerificationChartComponent } from './components/verification-chart.component';

import {
  DashboardStats,
  VerificationTrend,
  RecentVerification,
  BlockedLearner
} from '../../../interfaces/dashboard.interface';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    StatCardComponent,
    RecentVerificationsComponent,
    BlockedLearnersComponent,
    VerificationChartComponent
  ],
  template: `
    <div class="dashboard">
      <div class="page-header">
        <h1 class="page-title">{{ 'dashboard.title' | translate }}</h1>
        <p class="page-subtitle">
          {{ 'dashboard.overview' | translate }}
          @if (currentUser) {
            <span class="ms-2">- {{ currentUser.setaName }}</span>
          }
        </p>
      </div>

      <!-- Stats Cards Row -->
      <div class="row g-3 mb-4">
        <div class="col-sm-6 col-lg-3">
          <app-stat-card
            [title]="'dashboard.totalLearners'"
            [value]="stats?.totalLearners ?? 0"
            icon="users"
            variant="primary"
            [subtitle]="(stats?.activeLearners ?? 0) + ' active'"
          />
        </div>
        <div class="col-sm-6 col-lg-3">
          <app-stat-card
            [title]="'dashboard.verificationsToday'"
            [value]="stats?.verificationsToday ?? 0"
            icon="check-square"
            variant="success"
            [trend]="getVerificationTrend()"
            [trendValue]="getVerificationTrendValue()"
          />
        </div>
        <div class="col-sm-6 col-lg-3">
          <app-stat-card
            [title]="'dashboard.duplicatesBlocked'"
            [value]="stats?.duplicatesBlockedToday ?? 0"
            icon="ban"
            variant="danger"
            [subtitle]="(stats?.duplicatesBlockedThisMonth ?? 0) + ' this month'"
          />
        </div>
        <div class="col-sm-6 col-lg-3">
          <app-stat-card
            [title]="'dashboard.successRate'"
            [value]="stats?.successRate ?? 0"
            icon="trending-up"
            variant="info"
            format="percent"
            [subtitle]="(stats?.averageResponseTime ?? 0) + 'ms avg response'"
          />
        </div>
      </div>

      <!-- Charts Row -->
      <div class="row g-4 mb-4">
        <div class="col-lg-8">
          <app-verification-chart
            [trends]="verificationTrends"
            [loading]="loadingTrends"
            [period]="chartPeriod"
            (periodChange)="onPeriodChange($event)"
          />
        </div>
        <div class="col-lg-4">
          <app-blocked-learners
            [blockedLearners]="blockedLearners"
            [loading]="loadingBlocked"
          />
        </div>
      </div>

      <!-- Recent Activity Row -->
      <div class="row g-4">
        <div class="col-12">
          <app-recent-verifications
            [verifications]="recentVerifications"
            [loading]="loadingRecent"
          />
        </div>
      </div>

      <!-- Quick Actions Row -->
      <div class="row g-4 mt-2">
        <div class="col-12">
          <div class="card">
            <div class="card-header">
              <h5 class="card-title mb-0">{{ 'dashboard.quickActions' | translate }}</h5>
            </div>
            <div class="card-body">
              <div class="d-flex flex-wrap gap-2">
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
                <a routerLink="/learners/enroll" class="btn btn-outline-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                    <line x1="20" y1="8" x2="20" y2="14"></line>
                    <line x1="23" y1="11" x2="17" y2="11"></line>
                  </svg>
                  {{ 'nav.enrollLearner' | translate }}
                </a>
                <a routerLink="/reports/verification" class="btn btn-outline-secondary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                    <line x1="12" y1="20" x2="12" y2="10"></line>
                    <line x1="18" y1="20" x2="18" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="16"></line>
                  </svg>
                  {{ 'nav.verificationReport' | translate }}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .dashboard .row.g-3 {
      display: flex;
      flex-wrap: wrap;
      align-items: stretch;
    }

    .dashboard .row.g-3 > [class*="col-"] {
      display: flex;
      flex-direction: column;
      flex: 1 1 0;
      min-width: 0;
    }

    .dashboard .row.g-3 > [class*="col-"] > app-stat-card {
      flex: 1;
      display: flex;
      height: 100%;
      width: 100%;
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
      color: var(--bs-dark);
    }

    .btn svg {
      vertical-align: -0.125em;
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroy$ = new Subject<void>();

  // Data
  stats: DashboardStats | null = null;
  verificationTrends: VerificationTrend[] = [];
  recentVerifications: RecentVerification[] = [];
  blockedLearners: BlockedLearner[] = [];

  // Loading states
  loadingStats = true;
  loadingTrends = true;
  loadingRecent = true;
  loadingBlocked = true;

  // Chart period
  chartPeriod = 30;

  get currentUser() {
    return this.authService.currentUser;
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    // Load all data in parallel
    forkJoin({
      stats: this.dashboardService.getStats(),
      trends: this.dashboardService.getVerificationTrends(30),
      recent: this.dashboardService.getRecentVerifications(10),
      blocked: this.dashboardService.getBlockedLearners(5)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ stats, trends, recent, blocked }) => {
          this.stats = stats;
          this.verificationTrends = trends;
          this.recentVerifications = recent;
          this.blockedLearners = blocked;

          this.loadingStats = false;
          this.loadingTrends = false;
          this.loadingRecent = false;
          this.loadingBlocked = false;
        },
        error: (error) => {
          console.error('Error loading dashboard data:', error);
          this.loadingStats = false;
          this.loadingTrends = false;
          this.loadingRecent = false;
          this.loadingBlocked = false;
        }
      });
  }

  onPeriodChange(days: number): void {
    this.chartPeriod = days;
    this.loadTrends();
  }

  private loadTrends(): void {
    this.loadingTrends = true;
    this.dashboardService
      .getVerificationTrends(this.chartPeriod)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (trends) => {
          this.verificationTrends = trends;
          this.loadingTrends = false;
        },
        error: () => {
          this.loadingTrends = false;
        }
      });
  }

  getVerificationTrend(): 'up' | 'down' | 'neutral' {
    if (!this.stats) return 'neutral';
    // Compare today vs weekly average
    const weeklyAvg = this.stats.verificationsThisWeek / 7;
    const todayCount = this.stats.verificationsToday;

    if (todayCount > weeklyAvg * 1.1) return 'up';
    if (todayCount < weeklyAvg * 0.9) return 'down';
    return 'neutral';
  }

  getVerificationTrendValue(): string {
    if (!this.stats) return '';
    const weeklyAvg = this.stats.verificationsThisWeek / 7;
    const todayCount = this.stats.verificationsToday;

    // Prevent division by zero
    if (weeklyAvg === 0) {
      return todayCount > 0 ? '+100%' : '';
    }

    const diff = ((todayCount - weeklyAvg) / weeklyAvg) * 100;

    if (!isFinite(diff) || Math.abs(diff) < 5) return '';
    return `${diff > 0 ? '+' : ''}${diff.toFixed(0)}%`;
  }
}
