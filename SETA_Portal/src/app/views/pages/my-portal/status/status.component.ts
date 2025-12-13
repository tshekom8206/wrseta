import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { LearnerProfileService, LearnerProfile } from '../../../../core/services/learner-profile.service';
import { User } from '../../../../interfaces/user.interface';

@Component({
  selector: 'app-learner-status',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="learner-status">
      <div class="page-header">
        <h1 class="page-title">{{ 'myPortal.welcomeBack' | translate }}, {{ profile?.fullName || user?.fullName || 'Learner' }}</h1>
        <p class="page-subtitle">{{ 'myPortal.statusSubtitle' | translate }}</p>
      </div>

      <!-- Status Card -->
      <div class="row g-4 mb-4">
        <div class="col-md-6 col-lg-4">
          <div class="status-card">
            <div class="status-icon bg-success-subtle text-success">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div class="status-content">
              <h3 class="status-title">{{ 'myPortal.verificationStatus' | translate }}</h3>
              <span class="status-badge bg-success">{{ 'myPortal.verified' | translate }}</span>
              <p class="status-date">{{ 'myPortal.verifiedOn' | translate }}: {{ verificationDate ? (verificationDate | date:'mediumDate') : '-' }}</p>
            </div>
          </div>
        </div>

        <div class="col-md-6 col-lg-4">
          <div class="status-card">
            <div class="status-icon bg-primary-subtle text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </div>
            <div class="status-content">
              <h3 class="status-title">{{ 'myPortal.enrollmentStatus' | translate }}</h3>
              <span class="status-badge bg-primary">{{ 'learner.active' | translate }}</span>
              <p class="status-date">{{ 'myPortal.enrolledOn' | translate }}: {{ enrollmentDate ? (enrollmentDate | date:'mediumDate') : '-' }}</p>
            </div>
          </div>
        </div>

        <div class="col-md-6 col-lg-4">
          <div class="status-card">
            <div class="status-icon bg-info-subtle text-info">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="8" r="7"></circle>
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
              </svg>
            </div>
            <div class="status-content">
              <h3 class="status-title">{{ 'myPortal.certificates' | translate }}</h3>
              <span class="status-value">{{ certificateCount }}</span>
              <p class="status-date">{{ 'myPortal.availableToDownload' | translate }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Personal Information Card -->
      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="card-title mb-0">{{ 'myPortal.personalInfo' | translate }}</h5>
          <span class="badge bg-success-subtle text-success">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            {{ 'myPortal.idVerified' | translate }}
          </span>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-6">
              <div class="info-item">
                <label class="info-label">{{ 'learner.fullName' | translate }}</label>
                <p class="info-value">{{ profile?.fullName || user?.fullName || '-' }}</p>
              </div>
            </div>
            <div class="col-md-6">
              <div class="info-item">
                <label class="info-label">{{ 'learner.idNumber' | translate }}</label>
                <p class="info-value">{{ maskedIdNumber }}</p>
              </div>
            </div>
            <div class="col-md-6">
              <div class="info-item">
                <label class="info-label">{{ 'common.email' | translate }}</label>
                <p class="info-value">{{ user?.email || '-' }}</p>
              </div>
            </div>
            <div class="col-md-6">
              <div class="info-item">
                <label class="info-label">{{ 'myPortal.registeredSeta' | translate }}</label>
                <p class="info-value">{{ profile?.setaName || user?.setaName || '-' }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Current Programme Card -->
      <div class="card">
        <div class="card-header">
          <h5 class="card-title mb-0">{{ 'myPortal.currentProgramme' | translate }}</h5>
        </div>
        <div class="card-body">
          <div class="programme-info">
            <div class="programme-header">
              <h4 class="programme-name">{{ programmeName }}</h4>
              <span class="badge bg-primary">{{ programmeLevel }}</span>
            </div>
            <div class="progress-section mt-3">
              <div class="d-flex justify-content-between mb-2">
                <span class="text-muted">{{ 'myPortal.progress' | translate }}</span>
                <span class="fw-bold">{{ progressPercent }}%</span>
              </div>
              <div class="progress" style="height: 10px;">
                <div
                  class="progress-bar bg-success"
                  role="progressbar"
                  [style.width.%]="progressPercent"
                  [attr.aria-valuenow]="progressPercent"
                  aria-valuemin="0"
                  aria-valuemax="100">
                </div>
              </div>
            </div>
            <div class="row g-3 mt-3">
              <div class="col-md-4">
                <div class="stat-item">
                  <span class="stat-label">{{ 'myPortal.creditsEarned' | translate }}</span>
                  <span class="stat-value">{{ creditsEarned }} / {{ totalCredits }}</span>
                </div>
              </div>
              <div class="col-md-4">
                <div class="stat-item">
                  <span class="stat-label">{{ 'myPortal.modulesCompleted' | translate }}</span>
                  <span class="stat-value">{{ modulesCompleted }} / {{ totalModules }}</span>
                </div>
              </div>
              <div class="col-md-4">
                <div class="stat-item">
                  <span class="stat-label">{{ 'myPortal.expectedCompletion' | translate }}</span>
                  <span class="stat-value">{{ expectedCompletion ? (expectedCompletion | date:'mediumDate') : '-' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .learner-status { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .page-header { margin-bottom: 1.5rem; }
    .page-title { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.25rem; }
    .page-subtitle { color: var(--bs-secondary); margin-bottom: 0; }

    .status-card {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.5rem;
      background: white;
      border-radius: 0.75rem;
      border: 1px solid var(--bs-border-color);
      height: 100%;
    }
    .status-icon {
      width: 64px;
      height: 64px;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .status-content { flex: 1; }
    .status-title { font-size: 0.875rem; color: var(--bs-secondary); margin-bottom: 0.5rem; }
    .status-badge { font-size: 0.875rem; padding: 0.35rem 0.75rem; border-radius: 1rem; }
    .status-value { font-size: 2rem; font-weight: 700; display: block; }
    .status-date { font-size: 0.75rem; color: var(--bs-secondary); margin-top: 0.5rem; margin-bottom: 0; }

    .card { border: none; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 0.75rem; }
    .card-header { background: transparent; border-bottom: 1px solid var(--bs-border-color); padding: 1rem 1.25rem; }
    .card-title { font-size: 1rem; font-weight: 600; }
    .card-body { padding: 1.25rem; }

    .info-item { margin-bottom: 0.5rem; }
    .info-label { font-size: 0.75rem; color: var(--bs-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.25rem; display: block; }
    .info-value { font-size: 1rem; font-weight: 500; margin-bottom: 0; }

    .programme-name { font-size: 1.125rem; font-weight: 600; margin-bottom: 0; }

    .stat-item {
      background: var(--bs-light);
      padding: 1rem;
      border-radius: 0.5rem;
      text-align: center;
    }
    .stat-label { font-size: 0.75rem; color: var(--bs-secondary); display: block; margin-bottom: 0.25rem; }
    .stat-value { font-size: 1rem; font-weight: 600; }
  `]
})
export class LearnerStatusComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(LearnerProfileService);

  user: User | null = null;
  profile: LearnerProfile | null = null;
  isLoading = true;

  // Profile data (populated from API)
  verificationDate: Date | null = null;
  enrollmentDate: Date | null = null;
  certificateCount = 0;
  maskedIdNumber = 'Loading...';
  programmeName = 'Loading...';
  programmeLevel = 'NQF Level 3';
  progressPercent = 0;
  creditsEarned = 0;
  totalCredits = 0;
  modulesCompleted = 0;
  totalModules = 0;
  expectedCompletion: Date | null = null;

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      this.user = user;
      if (user) {
        this.loadProfile(user.username);
      }
    });
  }

  private loadProfile(username: string): void {
    this.isLoading = true;
    this.profileService.getMyProfile(username).subscribe(profile => {
      this.isLoading = false;
      if (profile) {
        this.profile = profile;
        this.maskedIdNumber = profile.idNumber || 'Not on file';
        this.programmeName = profile.programmeName || 'Not enrolled';
        this.programmeLevel = profile.programmeLevel || 'NQF Level 3';
        this.enrollmentDate = profile.enrollmentDate ? new Date(profile.enrollmentDate) : null;
        this.verificationDate = profile.verificationDate ? new Date(profile.verificationDate) : null;
        this.progressPercent = profile.progressPercent || 0;
        this.creditsEarned = profile.creditsEarned || 0;
        this.totalCredits = profile.totalCredits || 0;
        this.modulesCompleted = profile.modulesCompleted || 0;
        this.totalModules = profile.totalModules || 0;
        this.certificateCount = profile.certificateCount || 0;
        this.expectedCompletion = profile.expectedCompletion ? new Date(profile.expectedCompletion) : null;
      } else {
        // Fallback if API returns nothing
        this.maskedIdNumber = 'Not on file';
        this.programmeName = 'Not enrolled in any programme';
      }
    });
  }
}
