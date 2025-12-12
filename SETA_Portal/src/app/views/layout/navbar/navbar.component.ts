import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

import { AuthService } from '../../../core/auth/auth.service';
import { StorageService } from '../../../core/services/storage.service';
import { User } from '../../../interfaces/user.interface';
import { SetaTheme } from '../../../interfaces/seta.interface';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, NgbDropdownModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  @Input() currentUser: User | null = null;
  @Input() theme: SetaTheme | null = null;
  @Output() toggleSidebar = new EventEmitter<void>();

  private readonly authService = inject(AuthService);
  private readonly translateService = inject(TranslateService);
  private readonly storageService = inject(StorageService);

  languages = environment.supportedLanguages.map(code => ({
    code,
    name: this.getLanguageName(code)
  }));

  currentLanguage = this.storageService.getLanguage();

  private getLanguageName(code: string): string {
    const names: Record<string, string> = {
      'en': 'English',
      'af': 'Afrikaans',
      'zu': 'isiZulu',
      'xh': 'isiXhosa',
      'st': 'Sesotho',
      'tn': 'Setswana',
      'ts': 'Xitsonga',
      'ss': 'siSwati',
      've': 'Tshivenda',
      'nr': 'isiNdebele',
      'nso': 'Sepedi'
    };
    return names[code] || code;
  }

  changeLanguage(code: string): void {
    this.currentLanguage = code;
    this.storageService.setLanguage(code);
    this.translateService.use(code);
  }

  logout(): void {
    this.authService.logout();
  }

  getUserInitials(): string {
    if (!this.currentUser) return '?';
    const names = this.currentUser.fullName.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  }
}
