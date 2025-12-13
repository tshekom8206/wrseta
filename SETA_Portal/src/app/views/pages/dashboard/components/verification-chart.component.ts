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
import { VerificationTrend } from '../../../../interfaces/dashboard.interface';

// ApexCharts types
declare const ApexCharts: any;

@Component({
  selector: 'app-verification-chart',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center verification-trends-header">
        <h5 class="card-title mb-0">{{ 'dashboard.verificationTrends' | translate }}</h5>
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
      background: transparent;
      border-bottom: none;
      padding: 1rem 1.25rem;
      position: relative;
    }

    .verification-trends-header {
      padding-bottom: 1.5rem;
    }

    .verification-trends-underline {
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
