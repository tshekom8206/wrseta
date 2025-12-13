import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IconService } from '../../../../core/services/icon.service';
import { BlockedLearner } from '../../../../interfaces/dashboard.interface';

@Component({
  selector: 'app-blocked-learners',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <div class="card-header blocked-learners-header">
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
              [innerHTML]="getSafeIcon('ban')"
            ></svg>
          </span>
          {{ 'dashboard.failedVerifications' | translate }}
        </h5>
        <div class="blocked-learners-underline"></div>
      </div>
      <div class="card-body p-0">
        @if (loading) {
          <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">{{ 'common.loading' | translate }}</span>
            </div>
          </div>
        } @else if (blockedLearners.length === 0) {
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
                [innerHTML]="getSafeIcon('check-circle')"
              ></svg>
            </div>
            <h6 class="empty-state__title">All Clear</h6>
            <p class="empty-state__message">No failed verification attempts today. Everything looks good!</p>
          </div>
        } @else {
          <div class="failed-verifications-list">
            @for (learner of blockedLearners; track learner.idNumber) {
              <div class="failed-verification-item">
                <div class="failed-verification-item__dot"></div>
                <div class="failed-verification-item__content">
                  <div class="failed-verification-item__name">{{ learner.learnerName }}</div>
                  <div class="failed-verification-item__id">{{ learner.maskedIdNumber }}</div>
                  <div class="failed-verification-item__setas">
                    @for (seta of learner.enrolledSetas; track seta) {
                      <span class="seta-tag">{{ seta }}</span>
                    }
                  </div>
                </div>
                <div class="failed-verification-item__meta">
                  <span class="attempt-badge">{{ learner.attemptCount }} attempts</span>
                  <div class="time-label">{{ formatTime(learner.lastAttemptedAt) }}</div>
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

    .blocked-learners-header {
      padding-bottom: 1.5rem;
    }

    .blocked-learners-underline {
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
        background: rgba(220, 53, 69, 0.1);
        color: #dc3545;
        flex-shrink: 0;

        svg {
          width: 18px;
          height: 18px;
        }
      }
    }

    .failed-verifications-list {
      padding: 0.5rem;
    }

    .failed-verification-item {
      display: flex;
      align-items: flex-start;
      padding: 1rem;
      margin-bottom: 0.5rem;
      border-radius: 0.625rem;
      border: 1px solid rgba(0, 0, 0, 0.06);
      background: var(--bs-white);
      transition: all 0.2s ease;
      gap: 0.875rem;

      &:hover {
        background: rgba(220, 53, 69, 0.03);
        border-color: rgba(220, 53, 69, 0.2);
        transform: translateX(2px);
      }

      &:last-child {
        margin-bottom: 0;
      }

      &__dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--bs-danger, #dc3545);
        flex-shrink: 0;
        margin-right: 1rem;
        margin-top: 0.5rem;
      }

      &__content {
        flex: 1;
        min-width: 0;
      }

      &__name {
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--seta-text-primary, #212529);
        margin-bottom: 0.25rem;
        line-height: 1.4;
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

      &__setas {
        display: flex;
        flex-wrap: wrap;
        gap: 0.375rem;
        margin-top: 0.375rem;
      }

      &__meta {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.375rem;
        flex-shrink: 0;
      }

      .seta-tag {
        display: inline-block;
        font-size: 0.6875rem;
        font-weight: 500;
        padding: 0.125rem 0.5rem;
        border-radius: 0.25rem;
        background: var(--seta-bg-secondary, #f8f9fa);
        color: var(--seta-text-secondary, #6c757d);
      }

      .attempt-badge {
        display: inline-block;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.25rem 0.625rem;
        border-radius: 0.375rem;
        background: rgba(220, 53, 69, 0.1);
        color: #dc3545;
      }

      .time-label {
        font-size: 0.75rem;
        color: var(--seta-text-secondary, #6c757d);
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
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: #28a745;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 1rem;

        svg {
          width: 48px;
          height: 48px;
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
export class BlockedLearnersComponent {
  private readonly iconService = inject(IconService);
  private readonly sanitizer = inject(DomSanitizer);

  @Input() blockedLearners: BlockedLearner[] = [];
  @Input() loading = false;

  getSafeIcon(iconName: string): SafeHtml {
    const iconPath = this.iconService.getIconPath(iconName);
    return this.sanitizer.bypassSecurityTrustHtml(iconPath);
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
      month: 'short'
    });
  }
}
