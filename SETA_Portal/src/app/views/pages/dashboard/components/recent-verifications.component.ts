import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IconService } from '../../../../core/services/icon.service';
import { RecentVerification } from '../../../../interfaces/dashboard.interface';

@Component({
  selector: 'app-recent-verifications',
  standalone: true,
  imports: [CommonModule, TranslateModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <div class="card-header recent-activity-header">
        <h5 class="card-title">
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
              [innerHTML]="getSafeIcon('clock')"
            ></svg>
          </span>
          {{ 'dashboard.recentActivity' | translate }}
        </h5>
        <div class="recent-activity-underline"></div>
      </div>
      <div class="card-body p-0">
        @if (loading) {
          <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">{{ 'common.loading' | translate }}</span>
            </div>
          </div>
        } @else if (verifications.length === 0) {
          <div class="empty-state">
            <div class="empty-state__icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                [innerHTML]="getSafeIcon('activity')"
              ></svg>
            </div>
            <h6 class="empty-state__title">No Recent Activity</h6>
            <p class="empty-state__message">Verification activity will appear here once verifications are processed.</p>
          </div>
        } @else {
          <div class="recent-verifications-list">
            @for (item of verifications; track item.id) {
              <div class="verification-item" [class.verification-item--duplicate]="item.isDuplicate">
                <div class="verification-item__status-dot" [class.status-green]="item.status === 'GREEN'" [class.status-amber]="item.status === 'AMBER'" [class.status-red]="item.status === 'RED'"></div>
                <div class="verification-item__content">
                  <div class="verification-item__header">
                    <div class="verification-item__name">{{ item.learnerName || 'Unknown' }}</div>
                    <div class="verification-item__time">{{ formatTime(item.verifiedAt) }}</div>
                  </div>
                  <div class="verification-item__id">{{ item.maskedIdNumber }}</div>
                  <div class="verification-item__footer">
                    <span class="status-badge" [class.badge-success]="item.status === 'GREEN'" [class.badge-warning]="item.status === 'AMBER'" [class.badge-danger]="item.status === 'RED'">
                      {{ getStatusLabel(item.status) | translate }}
                    </span>
                    @if (item.isDuplicate) {
                      <span class="duplicate-badge" title="Duplicate detected">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                          <line x1="12" y1="9" x2="12" y2="13"></line>
                          <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        Duplicate
                      </span>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .card {
      height: 100%;
      border: none;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .card-header {
      background: transparent;
      border-bottom: none;
      padding: 1rem 1.25rem;
      position: relative;
    }

    .recent-activity-header {
      padding-bottom: 1.5rem;
    }

    .recent-activity-underline {
      position: absolute;
      bottom: 0;
      left: 1.25rem;
      right: 1.25rem;
      height: 1px;
      background: var(--seta-bg-tertiary, #e9ecef);
    }

    .card-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--seta-text-primary, #212529);
      margin: 0;
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

    .recent-verifications-list {
      padding: 0.5rem;
    }

    .verification-item {
      display: flex;
      align-items: flex-start;
      padding: 1rem;
      margin-bottom: 0.5rem;
      border-radius: 0.625rem;
      border: 1px solid rgba(0, 0, 0, 0.06);
      background: var(--bs-white);
      transition: all 0.2s ease;
      gap: 0.875rem;
      position: relative;

      &:hover {
        background: var(--seta-bg-secondary, #f8f9fa);
        border-color: var(--seta-bg-tertiary, #e9ecef);
        transform: translateX(2px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }

      &--duplicate {
        border-left: 3px solid var(--bs-danger, #dc3545);
      }

      &:last-child {
        margin-bottom: 0;
      }

      &__status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
        margin-top: 0.5rem;

        &.status-green {
          background: var(--bs-success, #28a745);
        }

        &.status-amber {
          background: var(--bs-warning, #ffc107);
        }

        &.status-red {
          background: var(--bs-danger, #dc3545);
        }
      }

      &__content {
        flex: 1;
        min-width: 0;
      }

      &__header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.5rem;
        gap: 1rem;
      }

      &__name {
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--seta-text-primary, #212529);
        line-height: 1.4;
      }

      &__time {
        font-size: 0.75rem;
        color: var(--seta-text-secondary, #6c757d);
        white-space: nowrap;
        flex-shrink: 0;
      }

      &__id {
        font-size: 0.8125rem;
        font-family: 'Courier New', monospace;
        color: var(--seta-text-secondary, #6c757d);
        background: var(--seta-bg-secondary, #f8f9fa);
        padding: 0.125rem 0.5rem;
        border-radius: 0.25rem;
        display: inline-block;
        margin-bottom: 0.5rem;
      }

      &__footer {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.625rem;
      border-radius: 0.375rem;
      text-transform: uppercase;
      letter-spacing: 0.025em;

      &.badge-success {
        background: rgba(40, 167, 69, 0.1);
        color: #28a745;
      }

      &.badge-warning {
        background: rgba(255, 193, 7, 0.1);
        color: #856404;
      }

      &.badge-danger {
        background: rgba(220, 53, 69, 0.1);
        color: #dc3545;
      }
    }

    .duplicate-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      border-radius: 0.375rem;
      background: rgba(220, 53, 69, 0.1);
      color: #dc3545;

      svg {
        width: 12px;
        height: 12px;
      }
    }

    .spinner-border {
      width: 2rem;
      height: 2rem;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;

      &__icon {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: var(--seta-bg-secondary, #f8f9fa);
        color: var(--seta-text-secondary, #6c757d);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 1rem;

        svg {
          width: 32px;
          height: 32px;
        }
      }

      &__title {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--seta-text-primary, #212529);
        margin-bottom: 0.5rem;
      }

      &__message {
        font-size: 0.875rem;
        color: var(--seta-text-secondary, #6c757d);
        margin: 0;
        max-width: 280px;
        line-height: 1.5;
      }
    }
  `]
})
export class RecentVerificationsComponent {
  private readonly iconService = inject(IconService);
  private readonly sanitizer = inject(DomSanitizer);

  @Input() verifications: RecentVerification[] = [];
  @Input() loading = false;

  getSafeIcon(iconName: string): SafeHtml {
    const iconPath = this.iconService.getIconPath(iconName);
    return this.sanitizer.bypassSecurityTrustHtml(iconPath);
  }

  getStatusLabel(status: 'GREEN' | 'AMBER' | 'RED'): string {
    switch (status) {
      case 'GREEN': return 'verification.statusGreen';
      case 'AMBER': return 'verification.statusAmber';
      case 'RED': return 'verification.statusRed';
    }
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;

    return new Date(date).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
