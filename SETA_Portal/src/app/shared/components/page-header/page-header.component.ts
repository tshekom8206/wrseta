import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IconService } from '../../../core/services/icon.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="page-header">
      <h1 class="page-title">
        @if (icon) {
          <span class="page-title__icon">
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
              [innerHTML]="getSafeIcon(icon)"
            ></svg>
          </span>
        }
        @if (titleKey) {
          <span>{{ titleKey | translate }}</span>
        } @else if (title) {
          <span>{{ title }}</span>
        }
      </h1>
      @if (subtitleKey || subtitle || showSetaName) {
        <p class="page-subtitle">
          @if (subtitleKey) {
            <span>{{ subtitleKey | translate }}</span>
          } @else if (subtitle) {
            <span>{{ subtitle }}</span>
          }
          @if (showSetaName && currentUser) {
            @if (subtitleKey || subtitle) {
              <span class="subtitle-divider"></span>
            }
            <span>{{ currentUser.setaName }}</span>
          }
        </p>
      }
    </div>
  `,
  styles: []
})
export class PageHeaderComponent {
  private readonly iconService = inject(IconService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly authService = inject(AuthService);

  @Input() title?: string;
  @Input() titleKey?: string; // Translation key
  @Input() subtitle?: string;
  @Input() subtitleKey?: string; // Translation key
  @Input() icon?: string; // Icon name from feather-icons
  @Input() showSetaName: boolean = false; // Show current user's SETA name

  get currentUser() {
    return this.authService.currentUser;
  }

  getSafeIcon(iconName: string): SafeHtml {
    const iconPath = this.iconService.getIconPath(iconName);
    return this.sanitizer.bypassSecurityTrustHtml(iconPath);
  }
}

