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
          <div class="status-card learner-stat-card">
            <div class="stat-card__icon stat-card__icon--success">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div class="stat-card__content">
              <span class="stat-card__label">{{ 'myPortal.verificationStatus' | translate }}</span>
              <div class="stat-card__value-row">
                <span class="status-badge bg-success text-white">{{ 'myPortal.verified' | translate }}</span>
              </div>
              <span class="stat-card__subtitle">{{ 'myPortal.verifiedOn' | translate }}: {{ verificationDate ? (verificationDate | date:'mediumDate') : '-' }}</span>
            </div>
          </div>
        </div>

        <div class="col-md-6 col-lg-4">
          <div class="status-card learner-stat-card">
            <div class="stat-card__icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </div>
            <div class="stat-card__content">
              <span class="stat-card__label">{{ 'myPortal.enrollmentStatus' | translate }}</span>
              <div class="stat-card__value-row">
                <span class="status-badge bg-primary text-white">{{ 'learner.active' | translate }}</span>
              </div>
              <span class="stat-card__subtitle">{{ 'myPortal.enrolledOn' | translate }}: {{ enrollmentDate ? (enrollmentDate | date:'mediumDate') : '-' }}</span>
            </div>
          </div>
        </div>

        <div class="col-md-6 col-lg-4">
          <div class="status-card learner-stat-card">
            <div class="stat-card__icon stat-card__icon--info">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="8" r="7"></circle>
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
              </svg>
            </div>
            <div class="stat-card__content">
              <span class="stat-card__label">{{ 'myPortal.certificates' | translate }}</span>
              <div class="stat-card__value-row">
                <span class="stat-card__value">{{ certificateCount }}</span>
              </div>
              <span class="stat-card__subtitle">{{ 'myPortal.availableToDownload' | translate }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Personal Information Card -->
      <div class="card personal-info-card mb-4">
        <div class="card-header personal-info-header">
          <div class="d-flex justify-content-between align-items-center">
            <h5 class="card-title mb-0">
              <span class="card-title__icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </span>
              {{ 'myPortal.personalInfo' | translate }}
            </h5>
            <span class="verification-badge-premium">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              {{ 'myPortal.idVerified' | translate }}
            </span>
          </div>
        </div>
        <div class="card-body personal-info-body">
          <div class="row g-4">
            <div class="col-md-6">
              <div class="info-item-premium">
                <div class="info-item-header">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="info-icon">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <label class="info-label">{{ 'learner.fullName' | translate }}</label>
                </div>
                <p class="info-value">{{ profile?.fullName || user?.fullName || '-' }}</p>
              </div>
            </div>
            <div class="col-md-6">
              <div class="info-item-premium">
                <div class="info-item-header">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="info-icon">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <label class="info-label">{{ 'learner.idNumber' | translate }}</label>
                </div>
                <p class="info-value">{{ maskedIdNumber }}</p>
              </div>
            </div>
            <div class="col-md-6">
              <div class="info-item-premium">
                <div class="info-item-header">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="info-icon">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  <label class="info-label">{{ 'common.email' | translate }}</label>
                </div>
                <p class="info-value">{{ user?.email || '-' }}</p>
              </div>
            </div>
            <div class="col-md-6">
              <div class="info-item-premium">
                <div class="info-item-header">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="info-icon">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <label class="info-label">{{ 'myPortal.registeredSeta' | translate }}</label>
                </div>
                <p class="info-value">{{ profile?.setaName || user?.setaName || '-' }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Current Programme Card -->
      <div class="card programme-card">
        <div class="card-header programme-header">
          <h5 class="card-title mb-0">
            <span class="card-title__icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </span>
            {{ 'myPortal.currentProgramme' | translate }}
          </h5>
        </div>
        <div class="card-body programme-body">
          <div class="programme-info">
            <div class="programme-header-section">
              <div class="programme-title-wrapper">
                <h4 class="programme-name">{{ programmeName }}</h4>
                <span class="programme-badge">{{ programmeLevel }}</span>
              </div>
            </div>
            <div class="progress-section-premium mt-4">
              <div class="progress-header">
                <div class="progress-label-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="progress-icon">
                    <polyline points="22 6 13.5 14.5 8.5 9.5 2 16"></polyline>
                    <polyline points="16 6 22 6 22 12"></polyline>
                  </svg>
                  <span class="progress-label">{{ 'myPortal.progress' | translate }}</span>
                </div>
                <span class="progress-percentage">{{ progressPercent }}%</span>
              </div>
              <div class="progress-bar-wrapper">
                <div class="progress-bar-premium" role="progressbar">
                  <div
                    class="progress-bar-fill"
                    [style.width.%]="progressPercent"
                    [attr.aria-valuenow]="progressPercent"
                    aria-valuemin="0"
                    aria-valuemax="100">
                  </div>
                </div>
              </div>
            </div>
            <div class="row g-3 mt-4">
              <div class="col-md-4">
                <div class="stat-item-premium">
                  <div class="stat-item-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="8" r="7"></circle>
                      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                    </svg>
                  </div>
                  <div class="stat-item-content">
                    <span class="stat-label">{{ 'myPortal.creditsEarned' | translate }}</span>
                    <span class="stat-value">{{ creditsEarned }} / {{ totalCredits }}</span>
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="stat-item-premium">
                  <div class="stat-item-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                  <div class="stat-item-content">
                    <span class="stat-label">{{ 'myPortal.modulesCompleted' | translate }}</span>
                    <span class="stat-value">{{ modulesCompleted }} / {{ totalModules }}</span>
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="stat-item-premium">
                  <div class="stat-item-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                  <div class="stat-item-content">
                    <span class="stat-label">{{ 'myPortal.expectedCompletion' | translate }}</span>
                    <span class="stat-value">{{ expectedCompletion ? (expectedCompletion | date:'mediumDate') : '-' }}</span>
                  </div>
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

    .learner-stat-card {
      position: relative;
      display: flex;
      flex-direction: column;
      padding: 1.5rem;
      background: var(--bs-white);
      border-radius: 0.75rem;
      border: 1px solid rgba(0, 0, 0, 0.06);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      transition: box-shadow 0.2s ease, transform 0.2s ease;
      height: 100%;
      width: 100%;
      box-sizing: border-box;
      overflow: visible;

      &:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
      }
    }

    .learner-stat-card .stat-card__icon {
      position: absolute;
      top: -8px;
      left: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: 0.75rem;
      flex-shrink: 0;
      background: var(--seta-primary, #008550);
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
      color: var(--bs-white);
      transition: box-shadow 0.2s ease;
      z-index: 2;

      svg {
        width: 24px;
        height: 24px;
      }

      &--success {
        background: var(--bs-success, #198754);
      }

      &--info {
        background: var(--bs-info, #0dcaf0);
      }

      &--warning {
        background: var(--bs-warning, #ffc107);
      }
    }

    .learner-stat-card:hover .stat-card__icon {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .learner-stat-card .stat-card__content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      text-align: left;
      margin-top: 1.5rem;
      padding-top: 0.75rem;
      position: relative;
      z-index: 0;
    }

    .learner-stat-card .stat-card__label {
      display: block;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--bs-secondary, #6c757d);
      margin-bottom: 0.75rem;
      line-height: 1.4;
    }

    .learner-stat-card .stat-card__value-row {
      display: flex;
      align-items: baseline;
      justify-content: flex-start;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .learner-stat-card .stat-card__value {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--bs-dark, #212529);
      line-height: 1.2;
      letter-spacing: -0.02em;
    }

    .learner-stat-card .stat-card__subtitle {
      display: block;
      font-size: 0.75rem;
      color: var(--bs-secondary, #6c757d);
      line-height: 1.4;
      margin-top: 0;
    }

    .status-badge {
      font-size: 0.875rem;
      padding: 0.35rem 0.75rem;
      border-radius: 1rem;
      font-weight: 600;
    }

    .card { border: none; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 0.75rem; }
    .card-header { background: transparent; border-bottom: none; padding: 1rem 1.25rem 1.5rem; }
    .card-title { font-size: 1rem; font-weight: 600; }
    .card-body { padding: 1.25rem; }

    // Premium Personal Information Card
    .personal-info-card {
      border: 1px solid rgba(0, 0, 0, 0.06);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }

    .personal-info-header {
      background: linear-gradient(135deg, rgba(0, 133, 80, 0.04) 0%, rgba(0, 133, 80, 0.01) 100%);
      border-bottom: 1px solid rgba(0, 133, 80, 0.1);
      padding: 1.25rem 1.5rem;
      position: relative;

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 1.5rem;
        right: 1.5rem;
        height: 1px;
        background: rgba(0, 133, 80, 0.15);
      }
    }

    .personal-info-header .card-title {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      font-size: 1.125rem;
      color: var(--seta-text-primary, #212529);
    }

    .personal-info-header .card-title__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 0.5rem;
      background: rgba(0, 133, 80, 0.1);
      color: var(--seta-primary, #008550);
      flex-shrink: 0;

      svg {
        width: 18px;
        height: 18px;
      }
    }

    .verification-badge-premium {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: linear-gradient(135deg, rgba(25, 135, 84, 0.15) 0%, rgba(25, 135, 84, 0.08) 100%);
      color: #198754;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      border: 1px solid rgba(25, 135, 84, 0.2);

      svg {
        flex-shrink: 0;
      }
    }

    .personal-info-body {
      padding: 1.75rem 1.5rem;
      background: linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(248, 249, 250, 0.5) 100%);
    }

    .info-item-premium {
      padding: 1.25rem;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.05);
      border-radius: 0.625rem;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: linear-gradient(180deg, var(--seta-primary, #008550) 0%, var(--seta-primary-dark, #006640) 100%);
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      &:hover {
        border-color: rgba(0, 133, 80, 0.15);
        box-shadow: 0 2px 8px rgba(0, 133, 80, 0.08);
        transform: translateX(2px);

        &::before {
          opacity: 1;
        }
      }
    }

    .info-item-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .info-icon {
      color: var(--seta-primary, #008550);
      flex-shrink: 0;
      opacity: 0.7;
    }

    .info-label {
      font-size: 0.6875rem;
      color: var(--bs-secondary, #6c757d);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
      margin-bottom: 0;
      display: block;
    }

    .info-value {
      font-size: 1rem;
      font-weight: 500;
      color: var(--seta-text-primary, #212529);
      margin-bottom: 0;
      line-height: 1.5;
      word-break: break-word;
    }

    // Premium Programme Card
    .programme-card {
      border: 1px solid rgba(0, 0, 0, 0.06);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }

    .programme-header {
      background: linear-gradient(135deg, rgba(0, 133, 80, 0.04) 0%, rgba(0, 133, 80, 0.01) 100%);
      border-bottom: 1px solid rgba(0, 133, 80, 0.1);
      padding: 1.25rem 1.5rem;
      position: relative;

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 1.5rem;
        right: 1.5rem;
        height: 1px;
        background: rgba(0, 133, 80, 0.15);
      }

      .card-title {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        font-size: 1.125rem;
        color: var(--seta-text-primary, #212529);
      }

      .card-title__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 0.5rem;
        background: rgba(0, 133, 80, 0.1);
        color: var(--seta-primary, #008550);
        flex-shrink: 0;

        svg {
          width: 18px;
          height: 18px;
        }
      }
    }

    .programme-body {
      padding: 1.75rem 1.5rem;
      background: linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(248, 249, 250, 0.5) 100%);
    }

    .programme-header-section {
      margin-bottom: 0;
    }

    .programme-title-wrapper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .programme-name {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--seta-text-primary, #212529);
      margin-bottom: 0;
      line-height: 1.4;
      flex: 1;
      min-width: 200px;
    }

    .programme-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.5rem 1rem;
      background: linear-gradient(135deg, var(--seta-primary, #008550) 0%, var(--seta-primary-dark, #006640) 100%);
      color: #fff;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      box-shadow: 0 2px 6px rgba(0, 133, 80, 0.2);
      flex-shrink: 0;
    }

    .progress-section-premium {
      padding: 1.5rem;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.05);
      border-radius: 0.625rem;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .progress-label-wrapper {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .progress-icon {
      color: var(--seta-primary, #008550);
      opacity: 0.7;
    }

    .progress-label {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--seta-text-primary, #212529);
    }

    .progress-percentage {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--seta-primary, #008550);
    }

    .progress-bar-wrapper {
      position: relative;
    }

    .progress-bar-premium {
      width: 100%;
      height: 12px;
      background: #e9ecef;
      border-radius: 6px;
      overflow: hidden;
      position: relative;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--seta-primary, #008550) 0%, var(--seta-primary-light, #00a866) 100%);
      border-radius: 6px;
      transition: width 0.6s ease;
      position: relative;
      overflow: hidden;

      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
        animation: shimmer 2s infinite;
      }
    }

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .stat-item-premium {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.05);
      border-radius: 0.625rem;
      transition: all 0.2s ease;
      height: 100%;

      &:hover {
        border-color: rgba(0, 133, 80, 0.15);
        box-shadow: 0 2px 8px rgba(0, 133, 80, 0.08);
        transform: translateY(-2px);
      }
    }

    .stat-item-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 0.5rem;
      background: linear-gradient(135deg, rgba(0, 133, 80, 0.1) 0%, rgba(0, 133, 80, 0.05) 100%);
      color: var(--seta-primary, #008550);
      flex-shrink: 0;

      svg {
        width: 20px;
        height: 20px;
      }
    }

    .stat-item-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--bs-secondary, #6c757d);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
      display: block;
    }

    .stat-value {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--seta-text-primary, #212529);
      line-height: 1.3;
    }
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
