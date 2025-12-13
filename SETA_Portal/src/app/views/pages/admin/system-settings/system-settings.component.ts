import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IconService } from '../../../../core/services/icon.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, TranslateModule, PageHeaderComponent],
  template: `
    <app-page-header
      titleKey="admin.systemSettings"
      subtitle="Configure system settings"
      icon="sliders"
    ></app-page-header>
    <div class="card">
      <div class="card-body coming-soon-state">
        <div class="coming-soon-content">
          <div class="coming-soon-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              [innerHTML]="getSafeIcon('sliders')"
            ></svg>
          </div>
          <h3 class="coming-soon-title">Coming Soon</h3>
          <p class="coming-soon-message">
            We're currently developing comprehensive system settings to enhance your experience.
            This feature will allow you to configure and customize various aspects of the platform.
          </p>
          <div class="coming-soon-divider"></div>
          <p class="coming-soon-subtitle">
            Check back soon for updates
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .coming-soon-state {
      padding: 4rem 2rem;
      min-height: 400px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .coming-soon-content {
      text-align: center;
      max-width: 500px;
      margin: 0 auto;
    }

    .coming-soon-icon {
      width: 120px;
      height: 120px;
      margin: 0 auto 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, rgba(0, 133, 80, 0.1) 0%, rgba(0, 133, 80, 0.05) 100%);
      border-radius: 50%;
      color: var(--seta-primary, #008550);
      position: relative;

      &::before {
        content: '';
        position: absolute;
        inset: -8px;
        border-radius: 50%;
        border: 2px solid rgba(0, 133, 80, 0.1);
        animation: pulse 2s ease-in-out infinite;
      }

      svg {
        width: 64px;
        height: 64px;
        position: relative;
        z-index: 1;
      }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.5;
        transform: scale(1.05);
      }
    }

    .coming-soon-title {
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--seta-text-primary, #212529);
      margin-bottom: 1rem;
      letter-spacing: -0.02em;
    }

    .coming-soon-message {
      font-size: 1rem;
      line-height: 1.6;
      color: var(--seta-text-secondary, #6c757d);
      margin-bottom: 2rem;
    }

    .coming-soon-divider {
      width: 60px;
      height: 3px;
      background: linear-gradient(90deg, transparent, var(--seta-primary, #008550), transparent);
      margin: 0 auto 1.5rem;
      border-radius: 2px;
    }

    .coming-soon-subtitle {
      font-size: 0.875rem;
      color: var(--seta-text-secondary, #6c757d);
      font-weight: 500;
      opacity: 0.8;
    }

    @media (max-width: 575.98px) {
      .coming-soon-state {
        padding: 3rem 1.5rem;
        min-height: 300px;
      }

      .coming-soon-icon {
        width: 100px;
        height: 100px;
        margin-bottom: 1.5rem;

        svg {
          width: 48px;
          height: 48px;
        }
      }

      .coming-soon-title {
        font-size: 1.5rem;
      }

      .coming-soon-message {
        font-size: 0.9375rem;
      }
    }
  `]
})
export class SystemSettingsComponent {
  private readonly iconService = inject(IconService);
  private readonly sanitizer = inject(DomSanitizer);

  getSafeIcon(iconName: string): SafeHtml {
    const iconPath = this.iconService.getIconPath(iconName);
    return this.sanitizer.bypassSecurityTrustHtml(iconPath);
  }
}
