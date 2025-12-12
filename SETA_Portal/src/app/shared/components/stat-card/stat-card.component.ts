import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IconService } from '../../../core/services/icon.service';

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
          [innerHTML]="safeIconPath"
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
    :host {
      display: flex;
      height: 100%;
    }

    .stat-card {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem 1.5rem;
      background: var(--seta-primary, var(--bs-primary));
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: box-shadow 0.2s ease, transform 0.2s ease;
      height: 100%;
      width: 100%;
      box-sizing: border-box;

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
      background: rgba(255, 255, 255, 0.2);
      color: var(--bs-white);
    }

    .stat-card--success .stat-card__icon {
      background: rgba(255, 255, 255, 0.2);
      color: var(--bs-white);
    }

    .stat-card--warning .stat-card__icon {
      background: rgba(255, 255, 255, 0.2);
      color: var(--bs-white);
    }

    .stat-card--danger .stat-card__icon {
      background: rgba(255, 255, 255, 0.2);
      color: var(--bs-white);
    }

    .stat-card--info .stat-card__icon {
      background: rgba(255, 255, 255, 0.2);
      color: var(--bs-white);
    }

    .stat-card__content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      text-align: left;
    }

    .stat-card__label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 0.25rem;
    }

    .stat-card__value-row {
      display: flex;
      align-items: baseline;
      justify-content: flex-start;
      gap: 0.5rem;
    }

    .stat-card__value {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--bs-white);
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
      background: rgba(255, 255, 255, 0.3);
      color: var(--bs-white);
    }

    .stat-card__trend--down {
      background: rgba(255, 255, 255, 0.3);
      color: var(--bs-white);
    }

    .stat-card__trend--neutral {
      background: rgba(255, 255, 255, 0.3);
      color: var(--bs-white);
    }

    .stat-card__subtitle {
      display: block;
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.8);
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
  private readonly iconService = inject(IconService);
  private readonly sanitizer = inject(DomSanitizer);

  @Input({ required: true }) title!: string;
  @Input({ required: true }) value!: number | string;
  @Input() icon: string = 'activity';
  @Input() variant: StatCardVariant = 'primary';
  @Input() trend?: StatCardTrend;
  @Input() trendValue?: string;
  @Input() subtitle?: string;
  @Input() format: 'number' | 'currency' | 'percent' | 'time' = 'number';

  get iconPath(): string {
    const path = this.iconService.getIconPath(this.icon);
    return path || this.iconService.getIconPath('activity');
  }

  get safeIconPath(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.iconPath);
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
