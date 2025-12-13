import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
  PLATFORM_ID,
  inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { VerificationTrend } from '../../../../interfaces/dashboard.interface';
import { IconService } from '../../../../core/services/icon.service';

// ApexCharts types
declare const ApexCharts: any;

@Component({
  selector: 'app-verification-chart',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <div class="card-header verification-trends-header">
        <div class="d-flex justify-content-between align-items-center">
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
                [innerHTML]="getSafeIcon('bar-chart-2')"
              ></svg>
            </span>
            {{ 'dashboard.verificationTrends' | translate }}
          </h5>
          <div class="btn-group btn-group-sm" role="group" aria-label="Time period">
          <button
            type="button"
            class="btn"
            [class.btn-primary]="period === 7"
            [class.btn-outline-primary]="period !== 7"
            (click)="setPeriod(7)"
          >
            7D
          </button>
          <button
            type="button"
            class="btn"
            [class.btn-primary]="period === 14"
            [class.btn-outline-primary]="period !== 14"
            (click)="setPeriod(14)"
          >
            14D
          </button>
          <button
            type="button"
            class="btn"
            [class.btn-primary]="period === 30"
            [class.btn-outline-primary]="period !== 30"
            (click)="setPeriod(30)"
          >
            30D
          </button>
        </div>
        <div class="verification-trends-underline"></div>
      </div>
      <div class="card-body">
        @if (loading) {
          <div class="chart-placeholder d-flex justify-content-center align-items-center">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">{{ 'common.loading' | translate }}</span>
            </div>
          </div>
        } @else {
          <div #chartContainer class="chart-container" role="img" aria-label="Verification trends chart"></div>
        }
      </div>
    </div>
  `,
  styles: [`
    .card {
      height: 100%;
    }

    .card-header {
      background: linear-gradient(135deg, rgba(0, 133, 80, 0.05) 0%, rgba(0, 133, 80, 0.02) 100%);
      border-bottom: none;
      padding: 1.5rem 1.5rem 1.25rem;
      position: relative;
    }

    .verification-trends-header {
      padding-bottom: 1.5rem;
    }

    .verification-trends-underline {
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

    // Modernize ApexCharts tooltip
    ::ng-deep {
      .apexcharts-tooltip {
        border: none !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
        border-radius: 0.75rem !important;
        padding: 0 !important;
        background: white !important;
        backdrop-filter: blur(10px);
      }

      .apexcharts-tooltip.apexcharts-theme-light {
        border: none !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
      }

      .apexcharts-tooltip-title {
        background: linear-gradient(135deg, var(--seta-primary, #008550) 0%, var(--seta-primary-dark, #006640) 100%) !important;
        color: white !important;
        font-weight: 600 !important;
        font-size: 0.875rem !important;
        padding: 0.75rem 1rem !important;
        border-radius: 0.75rem 0.75rem 0 0 !important;
        border-bottom: none !important;
      }

      .apexcharts-tooltip-series-group {
        padding: 0.75rem 1rem !important;
        background: white !important;
      }

      .apexcharts-tooltip-series-group:last-child {
        border-radius: 0 0 0.75rem 0.75rem !important;
      }

      .apexcharts-tooltip-marker {
        width: 12px !important;
        height: 12px !important;
        border-radius: 0.375rem !important;
        margin-right: 0.625rem !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
      }

      .apexcharts-tooltip-y-group {
        padding: 0 !important;
      }

      .apexcharts-tooltip-text-y-label,
      .apexcharts-tooltip-text-y-value {
        font-size: 0.875rem !important;
        font-weight: 500 !important;
        color: #212529 !important;
      }

      .apexcharts-tooltip-text-y-value {
        font-weight: 600 !important;
        margin-left: 0.25rem !important;
      }
    }

    .chart-container {
      min-height: 300px;
    }

    .chart-placeholder {
      min-height: 300px;
    }

    .spinner-border {
      width: 2rem;
      height: 2rem;
    }

    @media (max-width: 575.98px) {
      .chart-container {
        min-height: 250px;
      }
    }
  `]
})
export class VerificationChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly translate = inject(TranslateService);
  private readonly iconService = inject(IconService);
  private readonly sanitizer = inject(DomSanitizer);

  getSafeIcon(iconName: string): SafeHtml {
    const iconPath = this.iconService.getIconPath(iconName);
    return this.sanitizer.bypassSecurityTrustHtml(iconPath);
  }

  @ViewChild('chartContainer') chartContainer!: ElementRef<HTMLDivElement>;

  @Input() trends: VerificationTrend[] = [];
  @Input() loading = false;
  @Input() period = 30;

  private chart: any = null;

  @Output() periodChange = new EventEmitter<number>();

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId) && !this.loading && this.trends.length > 0) {
      this.initChart();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (isPlatformBrowser(this.platformId)) {
      if (changes['trends'] && !changes['trends'].firstChange) {
        this.updateChart();
      }
      if (changes['loading'] && !changes['loading'].currentValue && this.trends.length > 0) {
        setTimeout(() => this.initChart(), 0);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  setPeriod(days: number): void {
    this.period = days;
    this.periodChange.emit(days);
  }

  private initChart(): void {
    if (!this.chartContainer?.nativeElement || typeof ApexCharts === 'undefined') {
      return;
    }

    const filteredTrends = this.trends.slice(-this.period);
    const categories = filteredTrends.map(t => this.formatDate(t.date));

    const options = {
      series: [
        {
          name: 'Green (Clear)',
          data: filteredTrends.map(t => t.green)
        },
        {
          name: 'Amber (Warning)',
          data: filteredTrends.map(t => t.amber)
        },
        {
          name: 'Red (Blocked)',
          data: filteredTrends.map(t => t.red)
        }
      ],
      chart: {
        type: 'area',
        height: 300,
        stacked: true,
        fontFamily: 'inherit',
        toolbar: {
          show: false
        },
        zoom: {
          enabled: false
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 500
        }
      },
      colors: ['#198754', '#ffc107', '#dc3545'],
      fill: {
        type: 'gradient',
        gradient: {
          opacityFrom: 0.6,
          opacityTo: 0.1,
          stops: [0, 90, 100]
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      xaxis: {
        categories,
        labels: {
          style: {
            fontSize: '11px',
            colors: '#6c757d'
          },
          rotate: -45,
          rotateAlways: filteredTrends.length > 14
        },
        axisBorder: {
          show: false
        },
        axisTicks: {
          show: false
        }
      },
      yaxis: {
        labels: {
          style: {
            fontSize: '11px',
            colors: '#6c757d'
          },
          formatter: (val: number) => Math.round(val).toString()
        }
      },
      grid: {
        borderColor: '#e9ecef',
        strokeDashArray: 4
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '12px',
        markers: {
          width: 10,
          height: 10,
          radius: 2
        },
        itemMargin: {
          horizontal: 10
        }
      },
      tooltip: {
        shared: true,
        intersect: false,
        theme: 'light',
        style: {
          fontSize: '14px',
          fontFamily: 'inherit'
        },
        y: {
          formatter: (val: number) => `${val} verifications`
        }
      },
      responsive: [
        {
          breakpoint: 576,
          options: {
            chart: {
              height: 250
            },
            legend: {
              position: 'bottom',
              horizontalAlign: 'center'
            },
            xaxis: {
              labels: {
                rotate: -45,
                rotateAlways: true
              }
            }
          }
        }
      ]
    };

    this.chart = new ApexCharts(this.chartContainer.nativeElement, options);
    this.chart.render();
  }

  private updateChart(): void {
    if (!this.chart) {
      this.initChart();
      return;
    }

    const filteredTrends = this.trends.slice(-this.period);
    const categories = filteredTrends.map(t => this.formatDate(t.date));

    this.chart.updateOptions({
      xaxis: { categories }
    });

    this.chart.updateSeries([
      { name: 'Green (Clear)', data: filteredTrends.map(t => t.green) },
      { name: 'Amber (Warning)', data: filteredTrends.map(t => t.amber) },
      { name: 'Red (Blocked)', data: filteredTrends.map(t => t.red) }
    ]);
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);

    // Check if the date string includes time (hourly data for 7D view)
    if (dateString.includes(' ') || dateString.includes('T')) {
      // For hourly data, show date + time
      return date.toLocaleDateString('en-ZA', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    // For daily data, show just date
    return date.toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short'
    });
  }
}
