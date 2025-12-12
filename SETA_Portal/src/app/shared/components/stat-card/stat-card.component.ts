import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

export type StatCardVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type StatCardTrend = 'up' | 'down' | 'neutral';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stat-card" [class]="'stat-card--' + variant" role="region" [attr.aria-label]="title">
      <div class="stat-card__icon">
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
          [innerHTML]="iconPath"
          aria-hidden="true"
        ></svg>
      </div>
      <div class="stat-card__content">
        <span class="stat-card__label">{{ title | translate }}</span>
        <div class="stat-card__value-row">
          <span class="stat-card__value">{{ formattedValue }}</span>
          @if (trend && trendValue) {
            <span class="stat-card__trend" [class]="'stat-card__trend--' + trend" [attr.aria-label]="trendLabel">
              @if (trend === 'up') {
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
              } @else if (trend === 'down') {
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                  <polyline points="17 18 23 18 23 12"></polyline>
                </svg>
              }
              <span>{{ trendValue }}</span>
            </span>
          }
        </div>
        @if (subtitle) {
          <span class="stat-card__subtitle">{{ subtitle }}</span>
        }
      </div>
    </div>
  `,
  styles: [`
    .stat-card {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem;
      background: var(--bs-white);
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: box-shadow 0.2s ease, transform 0.2s ease;

      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
      }

      &:focus-within {
        outline: 2px solid var(--seta-primary, var(--bs-primary));
        outline-offset: 2px;
      }
    }

    .stat-card__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 0.5rem;
      flex-shrink: 0;

      svg {
        width: 24px;
        height: 24px;
      }
    }

    .stat-card--primary .stat-card__icon {
      background: rgba(var(--bs-primary-rgb), 0.1);
      color: var(--seta-primary, var(--bs-primary));
    }

    .stat-card--success .stat-card__icon {
      background: rgba(25, 135, 84, 0.1);
      color: var(--bs-success);
    }

    .stat-card--warning .stat-card__icon {
      background: rgba(255, 193, 7, 0.15);
      color: var(--bs-warning);
    }

    .stat-card--danger .stat-card__icon {
      background: rgba(220, 53, 69, 0.1);
      color: var(--bs-danger);
    }

    .stat-card--info .stat-card__icon {
      background: rgba(13, 202, 240, 0.1);
      color: var(--bs-info);
    }

    .stat-card__content {
      flex: 1;
      min-width: 0;
    }

    .stat-card__label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--bs-secondary);
      margin-bottom: 0.25rem;
    }

    .stat-card__value-row {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
    }

    .stat-card__value {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--bs-dark);
      line-height: 1.2;
    }

    .stat-card__trend {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;

      svg {
        width: 14px;
        height: 14px;
      }
    }

    .stat-card__trend--up {
      background: rgba(25, 135, 84, 0.1);
      color: var(--bs-success);
    }

    .stat-card__trend--down {
      background: rgba(220, 53, 69, 0.1);
      color: var(--bs-danger);
    }

    .stat-card__trend--neutral {
      background: rgba(108, 117, 125, 0.1);
      color: var(--bs-secondary);
    }

    .stat-card__subtitle {
      display: block;
      font-size: 0.75rem;
      color: var(--bs-secondary);
      margin-top: 0.25rem;
    }

    @media (max-width: 575.98px) {
      .stat-card {
        padding: 1rem;
      }

      .stat-card__icon {
        width: 40px;
        height: 40px;

        svg {
          width: 20px;
          height: 20px;
        }
      }

      .stat-card__value {
        font-size: 1.5rem;
      }
    }
  `]
})
export class StatCardComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) value!: number | string;
  @Input() icon: string = 'activity';
  @Input() variant: StatCardVariant = 'primary';
  @Input() trend?: StatCardTrend;
  @Input() trendValue?: string;
  @Input() subtitle?: string;
  @Input() format: 'number' | 'currency' | 'percent' | 'time' = 'number';

  private readonly icons: Record<string, string> = {
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    'user-check': '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
    'shield-off': '<path d="M19.69 14a6.9 6.9 0 0 0 .31-2V5l-8-3-3.16 1.18"></path><path d="M4.73 4.73L4 5v7c0 6 8 10 8 10a20.29 20.29 0 0 0 5.62-4.38"></path><line x1="1" y1="1" x2="23" y2="23"></line>',
    activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>',
    'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
    'alert-triangle': '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
    'x-circle': '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>',
    clock: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
    'trending-up': '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>',
    'bar-chart': '<line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line>',
    percent: '<line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>'
  };

  get iconPath(): string {
    return this.icons[this.icon] || this.icons['activity'];
  }

  get formattedValue(): string {
    if (typeof this.value === 'string') return this.value;

    switch (this.format) {
      case 'currency':
        return new Intl.NumberFormat('en-ZA', {
          style: 'currency',
          currency: 'ZAR',
          minimumFractionDigits: 0
        }).format(this.value);
      case 'percent':
        return `${this.value.toFixed(1)}%`;
      case 'time':
        return `${this.value}ms`;
      default:
        return new Intl.NumberFormat('en-ZA').format(this.value);
    }
  }

  get trendLabel(): string {
    if (!this.trend || !this.trendValue) return '';
    const direction = this.trend === 'up' ? 'increased' : this.trend === 'down' ? 'decreased' : 'unchanged';
    return `${direction} by ${this.trendValue}`;
  }
}
