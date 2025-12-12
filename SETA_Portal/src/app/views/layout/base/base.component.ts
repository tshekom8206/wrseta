import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import { NavbarComponent } from '../navbar/navbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { FooterComponent } from '../footer/footer.component';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { User } from '../../../interfaces/user.interface';
import { SetaTheme } from '../../../interfaces/seta.interface';

@Component({
  selector: 'app-base',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    TranslateModule,
    NavbarComponent,
    SidebarComponent,
    FooterComponent
  ],
  templateUrl: './base.component.html',
  styleUrl: './base.component.scss'
})
export class BaseComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private destroy$ = new Subject<void>();

  currentUser: User | null = null;
  currentTheme: SetaTheme | null = null;
  sidebarCollapsed = false;

  ngOnInit(): void {
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => this.currentUser = user);

    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => this.currentTheme = theme);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
}
