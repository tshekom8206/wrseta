import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { LearnerService } from '../../../../core/services/learner.service';
import { Learner } from '../../../../interfaces/learner.interface';

@Component({
  selector: 'app-learner-detail',
  standalone: true,
  imports: [CommonModule, TranslateModule, PageHeaderComponent, RouterLink],
  template: `
    <app-page-header
      titleKey="learner.details"
      subtitle="View learner information"
      icon="user"
    >
      <a routerLink="/learners" class="btn btn-outline-secondary">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="me-2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        {{ 'common.back' | translate }}
      </a>
    </app-page-header>

    @if (loading) {
      <div class="card">
        <div class="card-body text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-2 text-muted">{{ 'common.loading' | translate }}</p>
        </div>
      </div>
    } @else if (!learner) {
      <div class="card">
        <div class="card-body text-center py-5">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-muted mb-3">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h5 class="text-muted">{{ 'learner.notFound' | translate }}</h5>
          <p class="text-muted mb-4">{{ 'learner.notFoundDesc' | translate }}</p>
          <a routerLink="/learners" class="btn btn-primary">
            {{ 'common.backToList' | translate }}
          </a>
        </div>
      </div>
    } @else {
      <!-- Personal Information -->
      <div class="card mb-4">
        <div class="card-header">
          <h5 class="card-title mb-0">{{ 'learner.personalInformation' | translate }}</h5>
        </div>
        <div class="card-body">
          <div class="row g-4">
            <div class="col-md-6">
              <div class="info-item">
                <label class="info-label">{{ 'learner.fullName' | translate }}</label>
                <div class="info-value">
                  <div class="d-flex align-items-center">
                    <div class="avatar avatar-lg me-3" [style.backgroundColor]="getAvatarColor(learner.fullName)">
                      {{ getInitials(learner.fullName) }}
                    </div>
                    <div>
                      <div class="fw-bold fs-5">{{ learner.fullName }}</div>
                      <small class="text-muted">{{ learner.email || 'No email provided' }}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="info-item">
                <label class="info-label">{{ 'learner.idNumber' | translate }}</label>
                <div class="info-value">
                  <code class="id-number-large">{{ maskIdNumber(learner.idNumber) }}</code>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="info-item">
                <label class="info-label">{{ 'learner.dateOfBirth' | translate }}</label>
                <div class="info-value">{{ learner.dateOfBirth | date:'dd MMMM yyyy' }}</div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="info-item">
                <label class="info-label">{{ 'learner.gender' | translate }}</label>
                <div class="info-value">{{ learner.gender }}</div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="info-item">
                <label class="info-label">{{ 'learner.status' | translate }}</label>
                <div class="info-value">
                  <span class="badge" [ngClass]="getStatusBadgeClass(learner.status)">
                    {{ learner.status }}
                  </span>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="info-item">
                <label class="info-label">{{ 'verification.status' | translate }}</label>
                <div class="info-value">
                  <span class="verification-badge" [ngClass]="'verification-' + learner.verificationStatus.toLowerCase()">
                    {{ learner.verificationStatus }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Enrollment Information -->
      <div class="card mb-4">
        <div class="card-header">
          <h5 class="card-title mb-0">{{ 'learner.enrollmentInformation' | translate }}</h5>
        </div>
        <div class="card-body">
          <div class="row g-4">
            <div class="col-md-6">
              <div class="info-item">
                <label class="info-label">{{ 'learner.enrollmentDate' | translate }}</label>
                <div class="info-value">{{ learner.enrollmentDate | date:'dd MMMM yyyy' }}</div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="info-item">
                <label class="info-label">{{ 'learner.seta' | translate }}</label>
                <div class="info-value">{{ learner.setaCode }}</div>
              </div>
            </div>
            @if (learner.qualifications && learner.qualifications.length > 0) {
              <div class="col-12">
                <div class="info-item">
                  <label class="info-label">{{ 'learner.qualifications' | translate }}</label>
                  <div class="info-value">
                    @for (qual of learner.qualifications; track qual.id) {
                      <div class="qualification-item mb-2">
                        <div class="d-flex justify-content-between align-items-start">
                          <div>
                            <span class="badge bg-light text-dark me-2">{{ qual.code }}</span>
                            <span class="fw-medium">{{ qual.name }}</span>
                          </div>
                          <span class="badge" [ngClass]="getQualificationStatusClass(qual.status)">
                            {{ qual.status }}
                          </span>
                        </div>
                        <div class="text-muted small mt-1">
                          {{ 'learner.started' | translate }}: {{ qual.startDate | date:'dd MMM yyyy' }}
                          @if (qual.endDate) {
                            | {{ 'learner.completed' | translate }}: {{ qual.endDate | date:'dd MMM yyyy' }}
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="card">
        <div class="card-body">
          <div class="d-flex gap-2">
            <button class="btn btn-primary" (click)="editLearner()">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="me-2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              {{ 'common.edit' | translate }}
            </button>
            @if (learner.isActive) {
              <button class="btn btn-outline-danger" (click)="deactivateLearner()">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="me-2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                </svg>
                {{ 'learner.deactivate' | translate }}
              </button>
            } @else {
              <button class="btn btn-outline-success" (click)="reactivateLearner()">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="me-2">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
                {{ 'learner.reactivate' | translate }}
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .card {
      border: none;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .card-header {
      background: transparent;
      border-bottom: 1px solid var(--bs-border-color);
      padding: 1rem 1.25rem;
    }

    .card-title {
      font-size: 1rem;
      font-weight: 600;
    }

    .info-item {
      margin-bottom: 1.5rem;
    }

    .info-label {
      display: block;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--bs-secondary);
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .info-value {
      font-size: 1rem;
      color: var(--bs-dark);
    }

    .id-number-large {
      font-size: 1.125rem;
      background: var(--bs-light);
      padding: 0.5rem 0.75rem;
      border-radius: 0.375rem;
      font-family: 'Courier New', monospace;
    }

    .avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 1.25rem;
      color: white;
    }

    .avatar-lg {
      width: 64px;
      height: 64px;
      font-size: 1.5rem;
    }

    .verification-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.375rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .verification-green {
      background: #d1fae5;
      color: #065f46;
    }

    .verification-amber {
      background: #fef3c7;
      color: #92400e;
    }

    .verification-red {
      background: #fee2e2;
      color: #991b1b;
    }

    .verification-notverified {
      background: #f3f4f6;
      color: #6b7280;
    }

    .qualification-item {
      padding: 0.75rem;
      background: var(--bs-light);
      border-radius: 0.5rem;
      border-left: 3px solid var(--bs-primary);
    }
  `]
})
export class LearnerDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly learnerService = inject(LearnerService);
  private readonly destroy$ = new Subject<void>();

  learner: Learner | null = null;
  loading = true;

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const id = parseInt(params['id'], 10);
        if (id) {
          this.loadLearner(id);
        } else {
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Clear cache when leaving
    this.learnerService.clearCurrentLearner();
  }

  private loadLearner(id: number): void {
    this.loading = true;
    this.learnerService.getLearnerById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (learner) => {
          this.learner = learner;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading learner:', error);
          this.loading = false;
        }
      });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6'
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  }

  maskIdNumber(idNumber: string): string {
    // If already masked (contains asterisks), return as-is
    if (idNumber.includes('*')) return idNumber;
    // If not 13 digits, return as-is
    if (idNumber.length !== 13) return idNumber;
    // Mask the ID number
    return idNumber.substring(0, 6) + '*****' + idNumber.substring(11);
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'Active': 'bg-success',
      'Inactive': 'bg-secondary',
      'Completed': 'bg-info',
      'Withdrawn': 'bg-warning text-dark',
      'Blocked': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
  }

  getQualificationStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'InProgress': 'bg-primary',
      'Completed': 'bg-success',
      'Withdrawn': 'bg-warning text-dark'
    };
    return classes[status] || 'bg-secondary';
  }

  editLearner(): void {
    // Navigate to edit page (if exists) or show edit modal
    console.log('Edit learner:', this.learner?.id);
  }

  deactivateLearner(): void {
    if (!this.learner) return;
    if (confirm(`Are you sure you want to deactivate ${this.learner.fullName}?`)) {
      this.learnerService.deactivateLearner(this.learner.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            if (this.learner) {
              this.learner.status = 'Inactive' as any;
              this.learner.isActive = false;
            }
          },
          error: (error) => {
            console.error('Error deactivating learner:', error);
          }
        });
    }
  }

  reactivateLearner(): void {
    if (!this.learner) return;
    if (confirm(`Are you sure you want to reactivate ${this.learner.fullName}?`)) {
      this.learnerService.reactivateLearner(this.learner.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            if (this.learner) {
              this.learner.status = 'Active' as any;
              this.learner.isActive = true;
            }
          },
          error: (error) => {
            console.error('Error reactivating learner:', error);
          }
        });
    }
  }
}
