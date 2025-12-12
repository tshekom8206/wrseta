import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RecentVerification } from '../../../../interfaces/dashboard.interface';

@Component({
  selector: 'app-recent-verifications',
  standalone: true,
  imports: [CommonModule, TranslateModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="card-title mb-0">{{ 'dashboard.recentActivity' | translate }}</h5>
        <a href="#" class="btn btn-sm btn-outline-primary" (click)="$event.preventDefault()">
          {{ 'common.view' | translate }} {{ 'common.actions' | translate }}
        </a>
      </div>
      <div class="card-body p-0">
        @if (loading) {
          <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">{{ 'common.loading' | translate }}</span>
            </div>
          </div>
        } @else if (verifications.length === 0) {
          <div class="text-center text-muted py-4">
            {{ 'verification.noResults' | translate }}
          </div>
        } @else {
          <div class="table-responsive">
            <table class="table table-hover mb-0" role="grid" aria-label="Recent verifications">
              <thead>
                <tr>
                  <th scope="col">{{ 'verification.idNumber' | translate }}</th>
                  <th scope="col">{{ 'learner.fullName' | translate }}</th>
                  <th scope="col">{{ 'verification.result' | translate }}</th>
                  <th scope="col">{{ 'common.time' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (item of verifications; track item.id) {
                  <tr>
                    <td>
                      <code class="text-dark">{{ item.maskedIdNumber }}</code>
                    </td>
                    <td>{{ item.learnerName || '-' }}</td>
                    <td>
                      <span
                        class="badge"
                        [class.bg-success]="item.status === 'GREEN'"
                        [class.bg-warning]="item.status === 'AMBER'"
                        [class.bg-danger]="item.status === 'RED'"
                        [class.text-dark]="item.status === 'AMBER'"
                      >
                        {{ getStatusLabel(item.status) | translate }}
                      </span>
                      @if (item.isDuplicate) {
                        <span class="badge bg-danger ms-1" title="Duplicate detected">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                          </svg>
                        </span>
                      }
                    </td>
                    <td>
                      <small class="text-muted">{{ formatTime(item.verifiedAt) }}</small>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
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

    table th {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--bs-secondary);
      border-bottom-width: 1px;
    }

    table td {
      font-size: 0.875rem;
      vertical-align: middle;
      padding: 0.75rem;
    }

    code {
      font-size: 0.8125rem;
      background: var(--bs-light);
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
    }

    .badge {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .spinner-border {
      width: 2rem;
      height: 2rem;
    }
  `]
})
export class RecentVerificationsComponent {
  @Input() verifications: RecentVerification[] = [];
  @Input() loading = false;

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
