import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, delay, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { StorageService } from './storage.service';
import {
  DashboardStats,
  VerificationTrend,
  RecentVerification,
  BlockedLearner,
  ActivityLog
} from '../../interfaces/dashboard.interface';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly storage = inject(StorageService);
  private readonly baseUrl = environment.apiUrl;

  private readonly statsSubject = new BehaviorSubject<DashboardStats | null>(null);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);

  readonly stats$ = this.statsSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();

  private get setaId(): number {
    return this.authService.currentUser?.setaId ?? 0;
  }

  private getHeaders(): HttpHeaders {
    const seta = this.storage.getCurrentSeta<{ apiKey: string }>();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-API-Key': seta?.apiKey || ''
    });
  }

  /**
   * Fetch dashboard statistics for the current SETA
   */
  getStats(): Observable<DashboardStats> {
    this.loadingSubject.next(true);

    const url = `${this.baseUrl}/dashboard/stats/${this.setaId}`;
    console.log('Dashboard API Call:', { url, setaId: this.setaId, headers: this.getHeaders() });

    return this.http.get<any>(url, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        console.log('Dashboard API Response:', response);
        const data = response.data || response;
        // Map API response to DashboardStats interface
        const stats: DashboardStats = {
          totalLearners: data.totalLearners || 0,
          activeLearners: data.totalLearners || 0, // API returns total as active
          verificationsToday: data.todayVerifications || 0,
          verificationsThisWeek: (data.todayVerifications || 0) * 5, // Estimate
          verificationsThisMonth: data.thisMonthEnrollments || 0,
          duplicatesBlockedToday: Math.floor((data.blockedAttempts || 0) / 30), // Estimate daily
          duplicatesBlockedThisMonth: data.blockedAttempts || 0,
          successRate: data.totalLearners > 0 ?
            ((data.verifiedGreen || 0) / Math.max(1, (data.verifiedGreen || 0) + (data.verifiedYellow || 0) + (data.verifiedRed || 0))) * 100 : 0,
          errorRate: data.totalLearners > 0 ?
            ((data.verifiedRed || 0) / Math.max(1, (data.verifiedGreen || 0) + (data.verifiedYellow || 0) + (data.verifiedRed || 0))) * 100 : 0,
          averageResponseTime: 245 // Static for now
        };
        console.log('Mapped Stats:', stats);
        return stats;
      }),
      tap(stats => {
        this.statsSubject.next(stats);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error fetching stats:', error);
        this.loadingSubject.next(false);
        // Return empty stats on error
        return of({
          totalLearners: 0,
          activeLearners: 0,
          verificationsToday: 0,
          verificationsThisWeek: 0,
          verificationsThisMonth: 0,
          duplicatesBlockedToday: 0,
          duplicatesBlockedThisMonth: 0,
          successRate: 0,
          errorRate: 0,
          averageResponseTime: 0
        });
      })
    );
  }

  /**
   * Get verification trends for the specified period
   */
  getVerificationTrends(days: number = 30): Observable<VerificationTrend[]> {
    return this.http.get<any>(`${this.baseUrl}/dashboard/trends/${this.setaId}?days=${days}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const data = response.data || response;
        const trends = data.trends || [];
        return trends.map((t: any) => ({
          date: t.date,
          total: t.total || 0,
          green: t.green || 0,
          amber: t.yellow || t.amber || 0,
          red: t.red || 0,
          duplicates: t.red || 0 // Use red as duplicates count
        }));
      }),
      catchError(error => {
        console.error('Error fetching trends:', error);
        return of([]);
      })
    );
  }

  /**
   * Get recent verifications
   */
  getRecentVerifications(limit: number = 10): Observable<RecentVerification[]> {
    return this.http.get<any>(`${this.baseUrl}/verification/recent/${this.setaId}?limit=${limit}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const data = response.data || response;
        if (!Array.isArray(data)) return [];
        return data.map((v: any) => ({
          id: v.logId || v.verificationId || 0,
          idNumber: v.idNumber || '',
          maskedIdNumber: v.idNumber ? this.maskIdNumber(v.idNumber) : '******',
          status: v.status || 'UNKNOWN',
          learnerName: v.learnerName || 'Verified Learner',
          verifiedBy: v.verifiedBy || 'system',
          verifiedAt: new Date(v.verifiedAt),
          isDuplicate: v.status === 'RED'
        }));
      }),
      catchError(error => {
        console.error('Error fetching recent verifications:', error);
        return of([]);
      })
    );
  }

  /**
   * Get blocked learners (duplicate enrollment attempts)
   */
  getBlockedLearners(limit: number = 10): Observable<BlockedLearner[]> {
    return this.http.get<any>(`${this.baseUrl}/dashboard/blocked/${this.setaId}?page=1&pageSize=${limit}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const data = response.data || response;
        const blocked = data.blockedAttempts || [];
        return blocked.map((b: any, index: number) => ({
          idNumber: b.idNumber || '',
          maskedIdNumber: b.idNumber ? this.maskIdNumber(b.idNumber) : '******',
          learnerName: b.learnerName || `Blocked Attempt ${index + 1}`,
          enrolledSetas: [b.conflictingSeta || 'Unknown SETA'],
          lastAttemptedAt: new Date(b.verifiedAt),
          attemptCount: 1
        }));
      }),
      catchError(error => {
        console.error('Error fetching blocked learners:', error);
        return of([]);
      })
    );
  }

  /**
   * Get activity log for the current SETA
   */
  getActivityLog(limit: number = 20): Observable<ActivityLog[]> {
    // API doesn't have this endpoint yet, return empty
    return of([]);
  }

  // ============== Mock Data Methods (for development) ==============

  private getMockStats(): Observable<DashboardStats> {
    const mockStats: DashboardStats = {
      totalLearners: 12847,
      activeLearners: 8234,
      verificationsToday: 156,
      verificationsThisWeek: 892,
      verificationsThisMonth: 3456,
      duplicatesBlockedToday: 12,
      duplicatesBlockedThisMonth: 89,
      successRate: 94.5,
      errorRate: 0.8,
      averageResponseTime: 245
    };

    return of(mockStats).pipe(delay(500));
  }

  private getMockVerificationTrends(days: number): Observable<VerificationTrend[]> {
    const trends: VerificationTrend[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const total = Math.floor(Math.random() * 200) + 100;
      const green = Math.floor(total * (0.7 + Math.random() * 0.15));
      const amber = Math.floor((total - green) * 0.6);
      const red = total - green - amber;

      trends.push({
        date: date.toISOString().split('T')[0],
        total,
        green,
        amber,
        red,
        duplicates: Math.floor(Math.random() * 15)
      });
    }

    return of(trends).pipe(delay(300));
  }

  private getMockRecentVerifications(limit: number): Observable<RecentVerification[]> {
    const statuses: Array<'GREEN' | 'AMBER' | 'RED'> = ['GREEN', 'GREEN', 'GREEN', 'AMBER', 'RED'];
    const names = [
      'Thabo Mokoena', 'Nomvula Dlamini', 'Sipho Nkosi', 'Lerato Molefe',
      'Kagiso Modise', 'Palesa Radebe', 'Bongani Zulu', 'Zanele Mthembu',
      'Mandla Khumalo', 'Lindiwe Ndlovu'
    ];
    const verifiers = ['admin.user', 'staff.member', 'system'];

    const verifications: RecentVerification[] = [];
    const now = new Date();

    for (let i = 0; i < limit; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const idNumber = this.generateMockIdNumber();
      const verifiedAt = new Date(now.getTime() - i * 15 * 60 * 1000); // 15 min intervals

      verifications.push({
        id: 1000 + i,
        idNumber,
        maskedIdNumber: this.maskIdNumber(idNumber),
        status,
        learnerName: names[i % names.length],
        verifiedBy: verifiers[Math.floor(Math.random() * verifiers.length)],
        verifiedAt,
        isDuplicate: status === 'RED'
      });
    }

    return of(verifications).pipe(delay(300));
  }

  private getMockBlockedLearners(limit: number): Observable<BlockedLearner[]> {
    const names = [
      'John Mabena', 'Sarah Cele', 'David Sithole', 'Grace Mahlangu',
      'Peter Maseko', 'Mary Zwane', 'James Sibiya', 'Elizabeth Nkuna'
    ];
    const setas = ['MICT SETA', 'MERSETA', 'SERVICES SETA', 'CHIETA', 'ETDP SETA'];

    const blocked: BlockedLearner[] = [];
    const now = new Date();

    for (let i = 0; i < Math.min(limit, names.length); i++) {
      const idNumber = this.generateMockIdNumber();
      const enrolledCount = Math.floor(Math.random() * 2) + 1;
      const enrolledSetas: string[] = [];

      for (let j = 0; j < enrolledCount; j++) {
        enrolledSetas.push(setas[Math.floor(Math.random() * setas.length)]);
      }

      blocked.push({
        idNumber,
        maskedIdNumber: this.maskIdNumber(idNumber),
        learnerName: names[i],
        enrolledSetas: [...new Set(enrolledSetas)],
        lastAttemptedAt: new Date(now.getTime() - i * 3600000),
        attemptCount: Math.floor(Math.random() * 5) + 1
      });
    }

    return of(blocked).pipe(delay(300));
  }

  private getMockActivityLog(limit: number): Observable<ActivityLog[]> {
    const actions = [
      { action: 'VERIFICATION', description: 'ID verification completed' },
      { action: 'ENROLLMENT', description: 'New learner enrolled' },
      { action: 'BATCH_UPLOAD', description: 'Batch verification file processed' },
      { action: 'LOGIN', description: 'User logged in' },
      { action: 'REPORT_GENERATED', description: 'Verification report generated' },
      { action: 'LEARNER_UPDATED', description: 'Learner record updated' }
    ];
    const users = ['admin.user', 'staff.member', 'manager.role'];

    const activities: ActivityLog[] = [];
    const now = new Date();

    for (let i = 0; i < limit; i++) {
      const actionItem = actions[Math.floor(Math.random() * actions.length)];

      activities.push({
        id: 5000 + i,
        action: actionItem.action,
        description: actionItem.description,
        performedBy: users[Math.floor(Math.random() * users.length)],
        performedAt: new Date(now.getTime() - i * 1800000), // 30 min intervals
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`
      });
    }

    return of(activities).pipe(delay(300));
  }

  private generateMockIdNumber(): string {
    // Generate a valid-format SA ID number (13 digits)
    const year = Math.floor(Math.random() * 30) + 70; // 70-99 or 00-24
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const sequence = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const citizenship = Math.random() > 0.1 ? '0' : '1';
    const race = '8';
    const checksum = Math.floor(Math.random() * 10);

    return `${year}${month}${day}${sequence}${citizenship}${race}${checksum}`;
  }

  private maskIdNumber(idNumber: string): string {
    if (idNumber.length !== 13) return idNumber;
    return idNumber.substring(0, 6) + '*****' + idNumber.substring(11);
  }
}
