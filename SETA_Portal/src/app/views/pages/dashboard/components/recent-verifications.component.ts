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
                <div class="verification-item__icon-wrapper" [class.icon-success]="item.status === 'GREEN'" [class.icon-warning]="item.status === 'AMBER'" [class.icon-danger]="item.status === 'RED'">
                  @if (item.status === 'GREEN') {
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  } @else if (item.status === 'AMBER') {
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  } @else {
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="15" y1="9" x2="9" y2="15"></line>
                      <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                  }
                </div>
                <div class="verification-item__content">
                  <div class="verification-item__header">
                    <div class="verification-item__name-wrapper">
                      <div class="verification-item__name">{{ item.learnerName || 'Verified Learner' }}</div>
                      <div class="verification-item__id">{{ item.maskedIdNumber }}</div>
                    </div>
                    <div class="verification-item__time">{{ formatTime(item.verifiedAt) }}</div>
                  </div>
                  <div class="verification-item__footer">
                    <span class="status-badge" [class.badge-success]="item.status === 'GREEN'" [class.badge-warning]="item.status === 'AMBER'" [class.badge-danger]="item.status === 'RED'">
                      @if (item.status === 'GREEN') {
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      }
                      {{ getStatusLabel(item.status) | translate }}
                    </span>
                    @if (item.isDuplicate) {
                      <span class="duplicate-badge" title="Duplicate detected">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
      background: linear-gradient(135deg, rgba(0, 133, 80, 0.05) 0%, rgba(0, 133, 80, 0.02) 100%);
      border-bottom: none;
      padding: 1.5rem 1.5rem 1.25rem;
      position: relative;
    }

    .recent-activity-header {
      padding-bottom: 1.5rem;
    }

    .recent-activity-underline {
      position: absolute;
      bottom: 0;
      left: 1.5rem;
      right: 1.5rem;
      height: 2px;
      background: linear-gradient(90deg, var(--seta-primary, #008550) 0%, transparent 100%);
      border-radius: 1px;
    }

    .card-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--seta-text-primary, #212529);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.75rem;

      &__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 0.75rem;
        background: linear-gradient(135deg, var(--seta-primary, #008550) 0%, var(--seta-primary-dark, #006640) 100%);
        color: white;
        flex-shrink: 0;
        box-shadow: 0 4px 12px rgba(0, 133, 80, 0.25);

        svg {
          width: 20px;
          height: 20px;
        }
      }
    }

    .recent-verifications-list {
      padding: 1rem;
    }

    .verification-item {
      display: flex;
      align-items: flex-start;
      padding: 1.25rem;
      margin-bottom: 0.75rem;
      border-radius: 1rem;
      border: 1px solid rgba(0, 0, 0, 0.06);
      background: var(--bs-white);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      gap: 1rem;
      position: relative;
      overflow: hidden;

      &:hover {
        background: linear-gradient(135deg, rgba(0, 133, 80, 0.02) 0%, rgba(0, 133, 80, 0.01) 100%);
        border-color: rgba(0, 133, 80, 0.15);
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);

        .verification-item__icon-wrapper {
          transform: scale(1.1) rotate(5deg);
        }
      }

      &:last-child {
        margin-bottom: 0;
      }

      &__icon-wrapper {
        width: 48px;
        height: 48px;
        border-radius: 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

        &.icon-success {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
        }

        &.icon-warning {
          background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);
          color: white;
        }

        &.icon-danger {
          background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
          color: white;
        }

        svg {
          width: 20px;
          height: 20px;
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
        margin-bottom: 0.75rem;
        gap: 1rem;
      }

      &__name-wrapper {
        flex: 1;
        min-width: 0;
      }

      &__name {
        font-size: 1rem;
        font-weight: 600;
        color: var(--seta-text-primary, #212529);
        line-height: 1.4;
        margin-bottom: 0.375rem;
      }

      &__time {
        font-size: 0.75rem;
        color: var(--seta-text-secondary, #6c757d);
        white-space: nowrap;
        flex-shrink: 0;
        background: var(--seta-bg-secondary, #f8f9fa);
        padding: 0.25rem 0.625rem;
        border-radius: 0.375rem;
        font-weight: 500;
      }

      &__id {
        font-size: 0.8125rem;
        font-family: 'Courier New', monospace;
        color: var(--seta-text-secondary, #6c757d);
        background: linear-gradient(135deg, rgba(0, 133, 80, 0.08) 0%, rgba(0, 133, 80, 0.04) 100%);
        padding: 0.375rem 0.75rem;
        border-radius: 0.5rem;
        display: inline-block;
        border: 1px solid rgba(0, 133, 80, 0.1);
        font-weight: 600;
      }

      &__footer {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        flex-wrap: wrap;
      }
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 600;
      padding: 0.5rem 0.875rem;
      border-radius: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;

      svg {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
      }

      &.badge-success {
        background: linear-gradient(135deg, rgba(40, 167, 69, 0.15) 0%, rgba(32, 201, 151, 0.15) 100%);
        color: #28a745;
        border: 1px solid rgba(40, 167, 69, 0.2);

        &:hover {
          background: linear-gradient(135deg, rgba(40, 167, 69, 0.2) 0%, rgba(32, 201, 151, 0.2) 100%);
          box-shadow: 0 4px 10px rgba(40, 167, 69, 0.2);
        }
      }

      &.badge-warning {
        background: linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, rgba(253, 126, 20, 0.15) 100%);
        color: #856404;
        border: 1px solid rgba(255, 193, 7, 0.2);

        &:hover {
          background: linear-gradient(135deg, rgba(255, 193, 7, 0.2) 0%, rgba(253, 126, 20, 0.2) 100%);
          box-shadow: 0 4px 10px rgba(255, 193, 7, 0.2);
        }
      }

      &.badge-danger {
        background: linear-gradient(135deg, rgba(220, 53, 69, 0.15) 0%, rgba(200, 35, 51, 0.15) 100%);
        color: #dc3545;
        border: 1px solid rgba(220, 53, 69, 0.2);

        &:hover {
          background: linear-gradient(135deg, rgba(220, 53, 69, 0.2) 0%, rgba(200, 35, 51, 0.2) 100%);
          box-shadow: 0 4px 10px rgba(220, 53, 69, 0.2);
        }
      }
    }

    .duplicate-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.5rem 0.875rem;
      border-radius: 0.5rem;
      background: linear-gradient(135deg, rgba(220, 53, 69, 0.15) 0%, rgba(200, 35, 51, 0.15) 100%);
      color: #dc3545;
      border: 1px solid rgba(220, 53, 69, 0.2);
      box-shadow: 0 2px 6px rgba(220, 53, 69, 0.15);
      transition: all 0.2s ease;

      &:hover {
        background: linear-gradient(135deg, rgba(220, 53, 69, 0.2) 0%, rgba(200, 35, 51, 0.2) 100%);
        box-shadow: 0 4px 10px rgba(220, 53, 69, 0.2);
        transform: translateY(-1px);
      }

      svg {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
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
