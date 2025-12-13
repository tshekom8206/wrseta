import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import { VerificationService } from '../../../../core/services/verification.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { VerificationResponse } from '../../../../interfaces/verification.interface';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-single-verify',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, PageHeaderComponent],
  template: `
    <app-page-header
      titleKey="verification.singleVerification"
      subtitleKey="verification.enterIdNumber"
      icon="check-circle"
    ></app-page-header>

    <div class="row">
      <!-- Input Section -->
      <div class="col-lg-5">
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">{{ 'verification.idNumber' | translate }}</h5>
          </div>
          <div class="card-body">
            <form (ngSubmit)="verify()" #verifyForm="ngForm">
              <div class="mb-4">
                <label for="idNumber" class="form-label visually-hidden">
                  {{ 'verification.idNumber' | translate }}
                </label>
                <input
                  type="text"
                  id="idNumber"
                  class="form-control form-control-lg text-center font-monospace"
                  [(ngModel)]="idNumber"
                  name="idNumber"
                  placeholder="0000000000000"
                  maxlength="13"
                  pattern="\\d{13}"
                  [class.is-invalid]="idNumber && !isValidFormat"
                  [class.is-valid]="idNumber && isValidFormat"
                  (input)="onIdInput($event)"
                  autocomplete="off"
                  inputmode="numeric"
                  required
                  aria-describedby="idHelp idError"
                />
                <div id="idHelp" class="form-text">
                  Enter a 13-digit South African ID number
                </div>
                @if (idNumber && !isValidFormat) {
                  <div id="idError" class="invalid-feedback d-block">
                    {{ 'verification.invalidIdFormat' | translate }}
                  </div>
                }
              </div>

              @if (idNumber && isValidFormat) {
                <div class="id-preview mb-4 p-3 bg-light rounded">
                  <div class="row text-center">
                    <div class="col-4">
                      <small class="text-muted d-block">Date of Birth</small>
                      <strong>{{ extractedDob | date:'dd MMM yyyy' }}</strong>
                    </div>
                    <div class="col-4">
                      <small class="text-muted d-block">Gender</small>
                      <strong>{{ extractedGender }}</strong>
                    </div>
                    <div class="col-4">
                      <small class="text-muted d-block">Age</small>
                      <strong>{{ extractedAge }} years</strong>
                    </div>
                  </div>
                </div>
              }

              <button
                type="submit"
                class="btn btn-primary btn-lg w-100"
                [disabled]="!isValidFormat || loading"
              >
                @if (loading) {
                  <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {{ 'verification.verifying' | translate }}
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  {{ 'verification.verify' | translate }}
                }
              </button>
            </form>
          </div>
        </div>
      </div>

      <!-- Result Section -->
      <div class="col-lg-7">
        @if (result) {
          <div class="card result-card" [class]="'result-' + result.status.toLowerCase()">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="card-title mb-0">{{ 'verification.result' | translate }}</h5>
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                (click)="clearResult()"
                aria-label="Clear result"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="card-body">
              <!-- Status Badge -->
              <div class="text-center mb-4">
                <div class="status-badge" [class]="'status-' + result.status.toLowerCase()">
                  @if (result.status === 'GREEN') {
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  } @else if (result.status === 'AMBER') {
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  } @else {
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="15" y1="9" x2="9" y2="15"></line>
                      <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                  }
                  <span class="status-text">{{ result.status }}</span>
                </div>
                <p class="status-message mt-3">{{ result.message }}</p>
              </div>

              <!-- Learner Info / Demographics -->
              @if (result.learnerInfo) {
                <div class="learner-info mb-4">
                  <h6 class="section-title">{{ 'verification.learnerInfo' | translate }}</h6>
                  <div class="info-grid">
                    @if (result.learnerInfo.fullName) {
                      <div class="info-item">
                        <label>{{ 'learner.fullName' | translate }}</label>
                        <span>{{ result.learnerInfo.fullName }}</span>
                      </div>
                    }
                    <div class="info-item">
                      <label>{{ 'verification.idNumber' | translate }}</label>
                      <code>{{ maskIdNumber(result.idNumber) }}</code>
                    </div>
                    <div class="info-item">
                      <label>{{ 'learner.dateOfBirth' | translate }}</label>
                      <span>{{ result.learnerInfo.dateOfBirth | date:'dd MMM yyyy' }}</span>
                    </div>
                    <div class="info-item">
                      <label>{{ 'learner.gender' | translate }}</label>
                      <span>{{ result.learnerInfo.gender }}</span>
                    </div>
                    @if (result.learnerInfo.citizenship) {
                      <div class="info-item">
                        <label>Citizenship</label>
                        <span>{{ result.learnerInfo.citizenship }}</span>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Duplicate Info -->
              @if (result.duplicateInfo && result.duplicateInfo.isDuplicate) {
                <div class="duplicate-info">
                  <h6 class="section-title text-danger">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    {{ 'verification.duplicateInfo' | translate }}
                  </h6>
                  <div class="table-responsive">
                    <table class="table table-sm mb-0">
                      <thead>
                        <tr>
                          <th>SETA</th>
                          <th>{{ 'learner.enrollmentDate' | translate }}</th>
                          <th>{{ 'common.status' | translate }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (seta of result.duplicateInfo.enrolledSetas; track seta.setaCode) {
                          <tr>
                            <td>{{ seta.setaName }}</td>
                            <td>{{ seta.enrollmentDate | date:'dd MMM yyyy' }}</td>
                            <td>
                              <span class="badge" [class.bg-success]="seta.status !== 'Active'" [class.bg-danger]="seta.status === 'Active'">
                                {{ seta.status }}
                              </span>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              }

              <!-- Action Buttons -->
              <div class="action-buttons mt-4 pt-3 border-top">
                @if (result.status === 'GREEN') {
                  <a routerLink="/learners/enroll" [queryParams]="{id: result.idNumber}" class="btn btn-success">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="8.5" cy="7" r="4"></circle>
                      <line x1="20" y1="8" x2="20" y2="14"></line>
                      <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                    {{ 'nav.enrollLearner' | translate }}
                  </a>
                }
                <button type="button" class="btn btn-outline-primary" (click)="verifyAnother()">
                  Verify Another
                </button>
              </div>
            </div>
          </div>
        } @else {
          <!-- Placeholder when no result -->
          <div class="card h-100">
            <div class="card-body d-flex flex-column justify-content-center align-items-center text-center py-5">
              <div class="placeholder-icon mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h5 class="text-muted">Enter an ID Number</h5>
              <p class="text-secondary mb-0">
                The verification result will appear here
              </p>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .form-control-lg {
      font-size: 1.5rem;
      letter-spacing: 0.25rem;
      padding: 1rem;
    }

    .id-preview {
      border: 1px solid var(--bs-border-color);
    }

    .result-card {
      border-left: 4px solid;
    }

    .result-green { border-left-color: var(--bs-success); }
    .result-amber { border-left-color: var(--bs-warning); }
    .result-red { border-left-color: var(--bs-danger); }

    .status-badge {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1.5rem 2rem;
      border-radius: 1rem;
    }

    .status-green {
      background: rgba(25, 135, 84, 0.1);
      color: var(--bs-success);
    }

    .status-amber {
      background: rgba(255, 193, 7, 0.15);
      color: #856404;
    }

    .status-red {
      background: rgba(220, 53, 69, 0.1);
      color: var(--bs-danger);
    }

    .status-text {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: 0.1rem;
    }

    .status-message {
      font-size: 1rem;
      color: var(--bs-secondary);
    }

    .section-title {
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--bs-border-color);
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;

      label {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--bs-secondary);
        text-transform: uppercase;
      }

      span, code {
        font-size: 0.9375rem;
        font-weight: 500;
      }

      code {
        background: var(--bs-light);
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-size: 0.8125rem;
      }
    }

    .duplicate-info {
      background: rgba(220, 53, 69, 0.05);
      padding: 1rem;
      border-radius: 0.5rem;
      border: 1px solid rgba(220, 53, 69, 0.2);
    }

    .action-buttons {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .placeholder-icon {
      opacity: 0.3;
    }

    @media (max-width: 767.98px) {
      .info-grid {
        grid-template-columns: 1fr;
      }

      .action-buttons {
        flex-direction: column;

        .btn {
          width: 100%;
        }
      }
    }
  `]
})
export class SingleVerifyComponent implements OnDestroy {
  private readonly verificationService = inject(VerificationService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  idNumber = '';
  loading = false;
  result: VerificationResponse | null = null;

  get isValidFormat(): boolean {
    return this.verificationService.isValidIdNumber(this.idNumber);
  }

  get extractedDob(): Date | null {
    return this.verificationService.extractDateOfBirth(this.idNumber);
  }

  get extractedGender(): string {
    return this.verificationService.extractGender(this.idNumber);
  }

  get extractedAge(): number {
    const dob = this.extractedDob;
    if (!dob) return 0;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onIdInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Only allow digits
    this.idNumber = input.value.replace(/\D/g, '');
  }

  verify(): void {
    if (!this.isValidFormat || this.loading) return;

    this.loading = true;
    this.result = null;

    this.verificationService
      .verifySingle(this.idNumber, '', '')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.result = response;
          this.loading = false;

          // Show notification based on status
          if (response.status === 'GREEN') {
            this.notificationService.success('Verification completed - Clear');
          } else if (response.status === 'AMBER') {
            this.notificationService.warning('Verification completed - Warning');
          } else {
            this.notificationService.error('Verification completed - Blocked');
          }
        },
        error: (error) => {
          this.loading = false;
          this.notificationService.error(error.message || 'Verification failed');
        }
      });
  }

  clearResult(): void {
    this.result = null;
  }

  verifyAnother(): void {
    this.result = null;
    this.idNumber = '';
  }

  maskIdNumber(idNumber: string): string {
    return this.verificationService.maskIdNumber(idNumber);
  }
}
