import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { SetaTheme } from '../../../interfaces/seta.interface';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <footer class="footer" role="contentinfo">
      <div class="footer-content">
        <div class="footer-left">
          <span class="footer-text">&copy; {{ currentYear }} {{ theme?.name || 'SETA Portal' }}. All rights reserved.</span>
        </div>
        <div class="footer-right">
          <span class="footer-version">v1.0.0</span>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      padding: 1.25rem 1.5rem;
      background-color: var(--seta-bg-primary, #ffffff);
      border-top: 1px solid var(--seta-bg-tertiary, #d1d5db);
      font-size: 0.875rem;
      color: var(--seta-text-secondary, #6c757d);
      margin-top: auto;
    }

    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 100%;
    }

    .footer-text {
      font-weight: 400;
      color: var(--seta-text-secondary, #6c757d);
    }

    .footer-version {
      font-weight: 500;
      color: var(--seta-text-muted, #adb5bd);
      font-size: 0.8125rem;
      padding: 0.25rem 0.625rem;
      background: var(--seta-bg-secondary, #f8f9fa);
      border-radius: 0.375rem;
    }

    @media (max-width: 575.98px) {
      .footer {
        padding: 1rem;
      }

      .footer-content {
        flex-direction: column;
        gap: 0.75rem;
        text-align: center;
      }

      .footer-version {
        font-size: 0.75rem;
      }
    }
  `]
})
export class FooterComponent {
  @Input() theme: SetaTheme | null = null;

  currentYear = new Date().getFullYear();
}
