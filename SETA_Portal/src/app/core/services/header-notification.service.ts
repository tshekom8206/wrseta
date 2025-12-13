import { Injectable, OnDestroy, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, interval, of } from 'rxjs';
import { catchError, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

export interface InAppNotification {
  id: string;
  type: string;
  status: string;
  batchJobId: string;
  title: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: Date;
  userId: string;
}

export interface NotificationListResponse {
  notifications: InAppNotification[];
  unreadCount: number;
  totalCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class HeaderNotificationService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  // Remove /api from apiUrl since we add it in each call
  private readonly baseUrl = environment.apiUrl.replace(/\/api$/, '');
  private readonly POLL_INTERVAL = 30000; // 30 seconds

  private unreadCountSubject = new BehaviorSubject<number>(0);
  private notificationsSubject = new BehaviorSubject<InAppNotification[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private destroy$ = new Subject<void>();
  private pollingActive = false;

  /** Observable for unread notification count */
  unreadCount$ = this.unreadCountSubject.asObservable();

  /** Observable for notification list */
  notifications$ = this.notificationsSubject.asObservable();

  /** Observable for loading state */
  loading$ = this.loadingSubject.asObservable();

  /** Gets the current user ID */
  private get userId(): string {
    return String(this.authService.currentUser?.id ?? '');
  }

  /**
   * Starts polling for unread count every 30 seconds
   */
  startPolling(): void {
    if (this.pollingActive) return;
    this.pollingActive = true;

    // Initial fetch
    this.fetchUnreadCount().subscribe();

    // Poll every 30 seconds
    interval(this.POLL_INTERVAL)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.fetchUnreadCount())
      )
      .subscribe();
  }

  /**
   * Stops polling
   */
  stopPolling(): void {
    this.pollingActive = false;
    this.destroy$.next();
    this.destroy$.complete();
    this.destroy$ = new Subject<void>();
  }

  /**
   * Fetches the unread notification count
   */
  fetchUnreadCount(): Observable<number> {
    if (!this.userId) {
      return of(0);
    }
    return this.http.get<{ unreadCount: number }>(`${this.baseUrl}/api/notifications/unread-count?userId=${this.userId}`)
      .pipe(
        map(response => response.unreadCount),
        tap(count => this.unreadCountSubject.next(count)),
        catchError(error => {
          console.error('Error fetching unread count:', error);
          return of(this.unreadCountSubject.value);
        })
      );
  }

  /**
   * Fetches the full notification list
   */
  fetchNotifications(limit: number = 20): Observable<InAppNotification[]> {
    if (!this.userId) {
      return of([]);
    }
    this.loadingSubject.next(true);

    return this.http.get<NotificationListResponse>(`${this.baseUrl}/api/notifications?userId=${this.userId}&limit=${limit}`)
      .pipe(
        map(response => {
          // Parse dates
          return response.notifications.map(n => ({
            ...n,
            createdAt: new Date(n.createdAt)
          }));
        }),
        tap(notifications => {
          this.notificationsSubject.next(notifications);
          // Update unread count from response
          const unread = notifications.filter(n => !n.read).length;
          this.unreadCountSubject.next(unread);
          this.loadingSubject.next(false);
        }),
        catchError(error => {
          console.error('Error fetching notifications:', error);
          this.loadingSubject.next(false);
          return of([]);
        })
      );
  }

  /**
   * Marks a notification as read
   */
  markAsRead(notificationId: string): Observable<boolean> {
    if (!this.userId) {
      return of(false);
    }
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/api/notifications/${notificationId}/read?userId=${this.userId}`, {})
      .pipe(
        map(response => response.success),
        tap(success => {
          if (success) {
            // Update local state
            const notifications = this.notificationsSubject.value.map(n =>
              n.id === notificationId ? { ...n, read: true } : n
            );
            this.notificationsSubject.next(notifications);

            // Decrement unread count
            const currentCount = this.unreadCountSubject.value;
            if (currentCount > 0) {
              this.unreadCountSubject.next(currentCount - 1);
            }
          }
        }),
        catchError(error => {
          console.error('Error marking notification as read:', error);
          return of(false);
        })
      );
  }

  /**
   * Marks all notifications as read
   */
  markAllAsRead(): Observable<boolean> {
    if (!this.userId) {
      return of(false);
    }
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/api/notifications/read-all?userId=${this.userId}`, {})
      .pipe(
        map(response => response.success),
        tap(success => {
          if (success) {
            // Update local state
            const notifications = this.notificationsSubject.value.map(n => ({ ...n, read: true }));
            this.notificationsSubject.next(notifications);
            this.unreadCountSubject.next(0);
          }
        }),
        catchError(error => {
          console.error('Error marking all as read:', error);
          return of(false);
        })
      );
  }

  /**
   * Gets the current unread count synchronously
   */
  get currentUnreadCount(): number {
    return this.unreadCountSubject.value;
  }

  /**
   * Gets the current notifications synchronously
   */
  get currentNotifications(): InAppNotification[] {
    return this.notificationsSubject.value;
  }

  /**
   * Returns time ago string for a date
   */
  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
      return 'Just now';
    } else if (diffMin < 60) {
      return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    } else if (diffHour < 24) {
      return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    } else if (diffDay < 7) {
      return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Gets the icon class for a notification status
   */
  getStatusIcon(status: string): string {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return 'check-circle';
      case 'PARTIAL':
        return 'alert-triangle';
      case 'FAILED':
        return 'x-circle';
      default:
        return 'bell';
    }
  }

  /**
   * Gets the color class for a notification status
   */
  getStatusColor(status: string): string {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return 'text-success';
      case 'PARTIAL':
        return 'text-warning';
      case 'FAILED':
        return 'text-danger';
      default:
        return 'text-primary';
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}
