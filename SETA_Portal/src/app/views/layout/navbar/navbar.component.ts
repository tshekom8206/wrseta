import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { StorageService } from '../../../core/services/storage.service';
import { HeaderNotificationService, InAppNotification } from '../../../core/services/header-notification.service';
import { User, UserRole } from '../../../interfaces/user.interface';
import { SetaTheme } from '../../../interfaces/seta.interface';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, NgbDropdownModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Input() currentUser: User | null = null;
  @Input() theme: SetaTheme | null = null;
  @Output() toggleSidebar = new EventEmitter<void>();

  searchQuery: string = '';
  unreadCount = 0;
  notifications: InAppNotification[] = [];
  notificationsLoading = false;

  private readonly authService = inject(AuthService);
  private readonly translateService = inject(TranslateService);
  private readonly storageService = inject(StorageService);
  private readonly notificationService = inject(HeaderNotificationService);
  private readonly router = inject(Router);
  private subscriptions = new Subscription();

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

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value;
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      // TODO: Implement search functionality
      console.log('Searching for:', this.searchQuery);
    }
  }

  ngOnInit(): void {
    // Only show notifications for Admin/Staff (not Learners)
    if (!this.isLearner()) {
      // Subscribe to notification updates
      this.subscriptions.add(
        this.notificationService.unreadCount$.subscribe(count => {
          this.unreadCount = count;
        })
      );

      this.subscriptions.add(
        this.notificationService.notifications$.subscribe(notifications => {
          this.notifications = notifications;
        })
      );

      this.subscriptions.add(
        this.notificationService.loading$.subscribe(loading => {
          this.notificationsLoading = loading;
        })
      );

      // Start polling for notifications
      this.notificationService.startPolling();
    }
  }

  // Check if current user is a learner
  isLearner(): boolean {
    return this.currentUser?.role === UserRole.Learner;
  }

  // Check if current user is admin or staff
  isAdminOrStaff(): boolean {
    return this.currentUser?.role === UserRole.Admin || this.currentUser?.role === UserRole.Staff;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.notificationService.stopPolling();
  }

  onNotificationDropdownOpen(): void {
    // Fetch full notification list when dropdown opens
    this.notificationService.fetchNotifications().subscribe();
  }

  onNotificationClick(notification: InAppNotification): void {
    // Mark as read
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id).subscribe();
    }

    // Navigate to the link
    if (notification.link) {
      this.router.navigate([notification.link]);
    }
  }

  markAllNotificationsAsRead(): void {
    this.notificationService.markAllAsRead().subscribe();
  }

  getTimeAgo(date: Date): string {
    return this.notificationService.getTimeAgo(date);
  }

  getStatusIcon(status: string): string {
    return this.notificationService.getStatusIcon(status);
  }

  getStatusColor(status: string): string {
    return this.notificationService.getStatusColor(status);
  }
}
