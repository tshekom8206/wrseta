import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';

export interface LearnerProfile {
  learnerId: number;
  idNumber: string;
  firstName: string;
  surname: string;
  fullName: string;
  dateOfBirth?: Date;
  gender: string;
  programmeName: string;
  programmeLevel: string;
  status: string;
  enrollmentDate?: Date;
  verificationDate?: Date;
  setaName: string;
  setaCode: string;
  isVerified: boolean;
  progressPercent: number;
  creditsEarned: number;
  totalCredits: number;
  modulesCompleted: number;
  totalModules: number;
  certificateCount: number;
  expectedCompletion?: Date;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class LearnerProfileService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Get the current learner's profile
   */
  getMyProfile(username: string): Observable<LearnerProfile | null> {
    const seta = this.storage.getCurrentSeta<{ apiKey: string }>();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-API-Key': seta?.apiKey || 'wrseta-lms-key-2025'
    });

    return this.http.get<ApiResponse<LearnerProfile>>(
      `${this.baseUrl}/learner/my-profile?username=${encodeURIComponent(username)}`,
      { headers }
    ).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        return null;
      }),
      catchError(error => {
        console.error('[LearnerProfile] Error fetching profile:', error);
        return of(null);
      })
    );
  }

  /**
   * Get a learner's profile by ID number
   */
  getProfileByIdNumber(idNumber: string): Observable<LearnerProfile | null> {
    const seta = this.storage.getCurrentSeta<{ apiKey: string }>();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-API-Key': seta?.apiKey || 'wrseta-lms-key-2025'
    });

    return this.http.get<ApiResponse<LearnerProfile>>(
      `${this.baseUrl}/learner/profile/${encodeURIComponent(idNumber)}`,
      { headers }
    ).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        return null;
      }),
      catchError(error => {
        console.error('[LearnerProfile] Error fetching profile by ID:', error);
        return of(null);
      })
    );
  }
}
