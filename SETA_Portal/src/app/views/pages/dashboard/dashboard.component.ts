import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, takeUntil, forkJoin } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { IconService } from '../../../core/services/icon.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
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
    PageHeaderComponent,
    RecentVerificationsComponent,
    BlockedLearnersComponent,
    VerificationChartComponent
  ],
  template: `
    <div class="dashboard">
      <app-page-header
        titleKey="dashboard.title"
        subtitleKey="dashboard.overview"
        icon="layout"
        [showSetaName]="true"
      ></app-page-header>

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
      <div class="row g-4 mt-4">
        <div class="col-12">
          <div class="card">
            <div class="card-header quick-actions-header">
              <h5 class="card-title mb-0">
                <span class="card-title__icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    [innerHTML]="getSafeIcon('zap')"
                  ></svg>
                </span>
                {{ 'dashboard.quickActions' | translate }}
              </h5>
              <div class="quick-actions-underline"></div>
            </div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-sm-6 col-md-4 col-lg-3">
                  <a routerLink="/verification/single" class="quick-action-card">
                    <div class="quick-action-card__icon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        [innerHTML]="getSafeIcon('check-circle')"
                      ></svg>
                    </div>
                    <div class="quick-action-card__content">
                      <span class="quick-action-card__title">{{ 'nav.singleVerify' | translate }}</span>
                      <span class="quick-action-card__description">Verify a single learner</span>
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="quick-action-card__arrow"
                      [innerHTML]="getSafeIcon('chevron-right')"
                    ></svg>
                  </a>
                </div>
                <div class="col-sm-6 col-md-4 col-lg-3">
                  <a routerLink="/verification/batch" class="quick-action-card">
                    <div class="quick-action-card__icon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        [innerHTML]="getSafeIcon('upload')"
                      ></svg>
                    </div>
                    <div class="quick-action-card__content">
                      <span class="quick-action-card__title">{{ 'nav.batchVerify' | translate }}</span>
                      <span class="quick-action-card__description">Upload multiple verifications</span>
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="quick-action-card__arrow"
                      [innerHTML]="getSafeIcon('chevron-right')"
                    ></svg>
                  </a>
                </div>
                <div class="col-sm-6 col-md-4 col-lg-3">
                  <a routerLink="/learners/enroll" class="quick-action-card">
                    <div class="quick-action-card__icon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        [innerHTML]="getSafeIcon('user-plus')"
                      ></svg>
                    </div>
                    <div class="quick-action-card__content">
                      <span class="quick-action-card__title">{{ 'nav.enrollLearner' | translate }}</span>
                      <span class="quick-action-card__description">Add a new learner</span>
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="quick-action-card__arrow"
                      [innerHTML]="getSafeIcon('chevron-right')"
                    ></svg>
                  </a>
                </div>
                <div class="col-sm-6 col-md-4 col-lg-3">
                  <a routerLink="/reports/verification" class="quick-action-card">
                    <div class="quick-action-card__icon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        [innerHTML]="getSafeIcon('bar-chart-2')"
                      ></svg>
                    </div>
                    <div class="quick-action-card__content">
                      <span class="quick-action-card__title">{{ 'nav.verificationReport' | translate }}</span>
                      <span class="quick-action-card__description">View verification reports</span>
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="quick-action-card__arrow"
                      [innerHTML]="getSafeIcon('chevron-right')"
                    ></svg>
                  </a>
                </div>
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
      border-bottom: 1px solid var(--seta-bg-tertiary, #e9ecef);
      padding: 1rem 1.25rem;
    }

    .card-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--seta-text-primary, #212529);
      display: flex;
      align-items: center;
      gap: 0.625rem;

      &__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 0.5rem;
        background: rgba(0, 51, 102, 0.1);
        color: var(--seta-primary, #003366);
        flex-shrink: 0;

        svg {
          width: 18px;
          height: 18px;
        }
      }
    }

    .quick-actions-header {
      border-bottom: none;
      padding-bottom: 1.5rem;
      position: relative;
    }

    .quick-actions-underline {
      position: absolute;
      bottom: 0;
      left: 1.25rem;
      right: 1.25rem;
      height: 1px;
      background: var(--seta-primary, #003366);
    }

        .quick-action-card {
          display: flex;
          align-items: center;
          padding: 1.25rem;
          background: var(--bs-white);
          border-radius: 0.75rem;
          border: 2px solid var(--seta-primary, #003366);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transition: all 0.2s ease;
          text-decoration: none;
          color: inherit;
          height: 100%;
          position: relative;
          gap: 1rem;

          &:hover {
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
            transform: translateY(-2px);
            border-color: var(--seta-primary-dark, #002244);

        .quick-action-card__arrow {
          transform: translateX(4px);
          color: var(--seta-primary, #003366);
        }
      }

      &:focus {
        outline: 2px solid var(--seta-primary, #003366);
        outline-offset: 2px;
      }

      &__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border-radius: 0.625rem;
        background: var(--seta-primary, #003366);
        color: white;
        flex-shrink: 0;

        svg {
          width: 24px;
          height: 24px;
        }
      }

      &__content {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
        min-width: 0;
      }

      &__title {
        font-size: 1rem;
        font-weight: 600;
        color: var(--seta-text-primary, #212529);
        line-height: 1.3;
      }

      &__description {
        font-size: 0.8125rem;
        color: var(--seta-text-secondary, #6c757d);
        line-height: 1.4;
      }

      &__arrow {
        width: 20px;
        height: 20px;
        color: var(--seta-text-secondary, #6c757d);
        transition: all 0.2s ease;
        flex-shrink: 0;
      }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly dashboardService = inject(DashboardService);
  private readonly iconService = inject(IconService);
  private readonly sanitizer = inject(DomSanitizer);
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

  getSafeIcon(iconName: string): SafeHtml {
    const iconPath = this.iconService.getIconPath(iconName);
    return this.sanitizer.bypassSecurityTrustHtml(iconPath);
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
