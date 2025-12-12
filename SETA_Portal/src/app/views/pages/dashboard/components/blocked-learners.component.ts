import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { BlockedLearner } from '../../../../interfaces/dashboard.interface';

@Component({
  selector: 'app-blocked-learners',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="card-title mb-0">{{ 'dashboard.failedVerifications' | translate }}</h5>
        <span class="badge bg-danger">{{ blockedLearners.length }}</span>
      </div>
      <div class="card-body p-0">
        @if (loading) {
          <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">{{ 'common.loading' | translate }}</span>
            </div>
          </div>
        } @else if (blockedLearners.length === 0) {
          <div class="text-center py-4">
            <div class="text-success mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <p class="text-muted mb-0">{{ 'dashboard.noFailedVerifications' | translate }}</p>
          </div>
        } @else {
          <ul class="list-group list-group-flush">
            @for (learner of blockedLearners; track learner.idNumber) {
              <li class="list-group-item">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <div class="fw-semibold">{{ learner.learnerName }}</div>
                    <code class="text-muted small">{{ learner.maskedIdNumber }}</code>
                    <div class="mt-1">
                      @for (seta of learner.enrolledSetas; track seta) {
                        <span class="badge bg-secondary me-1">{{ seta }}</span>
                      }
                    </div>
                  </div>
                  <div class="text-end">
                    <span class="badge bg-danger">{{ learner.attemptCount }} attempts</span>
                    <div class="small text-muted mt-1">
                      {{ formatTime(learner.lastAttemptedAt) }}
                    </div>
                  </div>
                </div>
              </li>
            }
          </ul>
        }
      </div>
    </div>
  `,
  styles: [`
    .card {
      height: 100%;
    }

    .card-header {
      background: transparent;
      border-bottom: 1px solid var(--bs-border-color);
    }

    .card-title {
      font-size: 1rem;
      font-weight: 600;
    }

    .list-group-item {
      padding: 0.875rem 1rem;
      border-left: none;
      border-right: none;

      &:first-child {
        border-top: none;
      }

      &:last-child {
        border-bottom: none;
      }
    }

    code {
      font-size: 0.75rem;
      background: var(--bs-light);
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
    }

    .badge {
      font-size: 0.6875rem;
      font-weight: 600;
    }

    .spinner-border {
      width: 2rem;
      height: 2rem;
    }
  `]
})
export class BlockedLearnersComponent {
  @Input() blockedLearners: BlockedLearner[] = [];
  @Input() loading = false;

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
