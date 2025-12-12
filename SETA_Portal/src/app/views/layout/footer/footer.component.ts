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
          <span>&copy; {{ currentYear }} {{ theme?.name || 'SETA Portal' }}. All rights reserved.</span>
        </div>
        <div class="footer-right">
          <span class="version">v1.0.0</span>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      padding: 1rem 1.5rem;
      background-color: var(--seta-bg-primary);
      border-top: 1px solid var(--navbar-border);
      font-size: 0.8125rem;
      color: var(--seta-text-secondary);
    }

    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .version {
      opacity: 0.7;
    }

    @media (max-width: 575.98px) {
      .footer-content {
        flex-direction: column;
        gap: 0.5rem;
        text-align: center;
      }
    }
  `]
})
export class FooterComponent {
  @Input() theme: SetaTheme | null = null;

  currentYear = new Date().getFullYear();
}
