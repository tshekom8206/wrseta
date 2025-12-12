import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, timer } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  dismissible?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly notifications$ = new BehaviorSubject<Notification[]>([]);
  private readonly defaultDuration = 5000; // 5 seconds

  getNotifications(): Observable<Notification[]> {
    return this.notifications$.asObservable();
  }

  success(message: string, title = 'Success', duration?: number): void {
    this.show({
      type: 'success',
      title,
      message,
      duration: duration ?? this.defaultDuration,
      dismissible: true
    });
  }

  error(message: string, title = 'Error', duration?: number): void {
    this.show({
      type: 'error',
      title,
      message,
      duration: duration ?? this.defaultDuration * 2, // Errors stay longer
      dismissible: true
    });
  }

  warning(message: string, title = 'Warning', duration?: number): void {
    this.show({
      type: 'warning',
      title,
      message,
      duration: duration ?? this.defaultDuration,
      dismissible: true
    });
  }

  info(message: string, title = 'Information', duration?: number): void {
    this.show({
      type: 'info',
      title,
      message,
      duration: duration ?? this.defaultDuration,
      dismissible: true
    });
  }

  private show(notification: Omit<Notification, 'id'>): void {
    const id = this.generateId();
    const newNotification: Notification = { ...notification, id };

    const current = this.notifications$.getValue();
    this.notifications$.next([...current, newNotification]);

    // Auto dismiss after duration
    if (notification.duration && notification.duration > 0) {
      timer(notification.duration).subscribe(() => {
        this.dismiss(id);
      });
    }

    // Announce to screen readers
    this.announceToScreenReader(notification.message, notification.type);
  }

  dismiss(id: string): void {
    const current = this.notifications$.getValue();
    this.notifications$.next(current.filter(n => n.id !== id));
  }

  dismissAll(): void {
    this.notifications$.next([]);
  }

  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private announceToScreenReader(message: string, type: string): void {
    // Create an aria-live region for screen readers
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.setAttribute('class', 'visually-hidden');
    announcer.textContent = message;

    document.body.appendChild(announcer);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  }
}
