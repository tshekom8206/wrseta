import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

interface LearnerProfile {
  idNumber: string;
  fullName: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  email: string;
  phone: string;
  address: string;
  province: string;
  city: string;
  postalCode: string;
}

interface EnrollmentInfo {
  setaCode: string;
  setaName: string;
  enrollmentDate: Date;
  status: 'Active' | 'Completed' | 'Suspended' | 'Withdrawn';
  programName: string;
  programCode: string;
  qualificationLevel: string;
  startDate: Date;
  expectedEndDate: Date;
  completionPercentage: number;
  credits: {
    total: number;
    completed: number;
    remaining: number;
  };
}

interface VerificationStatus {
  lastVerified: Date;
  status: 'GREEN' | 'AMBER' | 'RED';
  isDuplicate: boolean;
  verificationCount: number;
}

interface TimelineEvent {
  date: Date;
  title: string;
  description: string;
  type: 'enrollment' | 'verification' | 'completion' | 'update' | 'certificate';
  icon: string;
}

@Component({
  selector: 'app-my-status',
  standalone: true,
  imports: [CommonModule, TranslateModule, PageHeaderComponent],
  template: `
    <app-page-header
      titleKey="nav.myStatus"
      subtitle="View your enrollment status and progress"
      icon="info"
    ></app-page-header>

    <div class="row" *ngIf="!loading; else loadingTemplate">
      <!-- Welcome Card -->
      <div class="col-12 mb-4">
        <div class="card welcome-card" [style.background]="'linear-gradient(135deg, ' + setaBranding.primary + ' 0%, ' + setaBranding.primaryDark + ' 100%)'">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-md-8">
                <div class="d-flex align-items-center mb-3">
                  <div class="avatar-lg me-3">
                    {{ getInitials(learnerProfile.fullName) }}
                  </div>
                  <div class="text-white">
                    <h3 class="mb-0">Welcome, {{ learnerProfile.firstName }}!</h3>
                    <p class="mb-0 opacity-75">ID: {{ maskIdNumber(learnerProfile.idNumber) }}</p>
                  </div>
                </div>
              </div>
              <div class="col-md-4 text-md-end">
                <div class="verification-badge" [ngClass]="getStatusClass(verificationStatus.status)">
                  <i class="feather icon-shield me-2"></i>
                  <span>Verification: {{ verificationStatus.status }}</span>
                </div>
                <small class="text-white-50 d-block mt-2">
                  Last verified: {{ verificationStatus.lastVerified | date:'mediumDate' }}
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="col-md-3 mb-4">
        <div class="stat-card learner-stat-card">
          <div class="stat-card__icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
          <div class="stat-card__content">
            <span class="stat-card__label">Current Program</span>
            <div class="stat-card__value-row">
              <span class="stat-card__value">{{ enrollmentInfo.programName }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3 mb-4">
        <div class="stat-card learner-stat-card">
          <div class="stat-card__icon stat-card__icon--success">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 6 13.5 14.5 8.5 9.5 2 16"></polyline>
              <polyline points="16 6 22 6 22 12"></polyline>
            </svg>
          </div>
          <div class="stat-card__content">
            <span class="stat-card__label">Progress</span>
            <div class="stat-card__value-row">
              <span class="stat-card__value">{{ enrollmentInfo.completionPercentage }}%</span>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3 mb-4">
        <div class="stat-card learner-stat-card">
          <div class="stat-card__icon stat-card__icon--info">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="7"></circle>
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
            </svg>
          </div>
          <div class="stat-card__content">
            <span class="stat-card__label">Credits Earned</span>
            <div class="stat-card__value-row">
              <span class="stat-card__value">{{ enrollmentInfo.credits.completed }}/{{ enrollmentInfo.credits.total }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3 mb-4">
        <div class="stat-card learner-stat-card">
          <div class="stat-card__icon stat-card__icon--warning">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div class="stat-card__content">
            <span class="stat-card__label">Days Remaining</span>
            <div class="stat-card__value-row">
              <span class="stat-card__value">{{ getDaysRemaining() }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="col-lg-8 mb-4">
        <!-- Enrollment Details -->
        <div class="card mb-4">
          <div class="card-header">
            <h5 class="mb-0">
              <i class="feather icon-clipboard me-2"></i>
              Enrollment Details
            </h5>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="text-muted small">SETA</label>
                <p class="mb-0 fw-semibold">{{ enrollmentInfo.setaCode }} - {{ enrollmentInfo.setaName }}</p>
              </div>
              <div class="col-md-6 mb-3">
                <label class="text-muted small">Status</label>
                <p class="mb-0">
                  <span class="badge" [ngClass]="getEnrollmentStatusClass(enrollmentInfo.status)">
                    {{ enrollmentInfo.status }}
                  </span>
                </p>
              </div>
              <div class="col-md-6 mb-3">
                <label class="text-muted small">Program</label>
                <p class="mb-0 fw-semibold">{{ enrollmentInfo.programName }}</p>
              </div>
              <div class="col-md-6 mb-3">
                <label class="text-muted small">Program Code</label>
                <p class="mb-0">{{ enrollmentInfo.programCode }}</p>
              </div>
              <div class="col-md-6 mb-3">
                <label class="text-muted small">Qualification Level</label>
                <p class="mb-0">{{ enrollmentInfo.qualificationLevel }}</p>
              </div>
              <div class="col-md-6 mb-3">
                <label class="text-muted small">Enrollment Date</label>
                <p class="mb-0">{{ enrollmentInfo.enrollmentDate | date:'longDate' }}</p>
              </div>
              <div class="col-md-6 mb-3">
                <label class="text-muted small">Start Date</label>
                <p class="mb-0">{{ enrollmentInfo.startDate | date:'longDate' }}</p>
              </div>
              <div class="col-md-6 mb-3">
                <label class="text-muted small">Expected End Date</label>
                <p class="mb-0">{{ enrollmentInfo.expectedEndDate | date:'longDate' }}</p>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="mt-3">
              <label class="text-muted small">Overall Progress</label>
              <div class="progress" style="height: 20px;">
                <div
                  class="progress-bar"
                  [style.width.%]="enrollmentInfo.completionPercentage"
                  [ngClass]="getProgressBarClass(enrollmentInfo.completionPercentage)">
                  {{ enrollmentInfo.completionPercentage }}%
                </div>
              </div>
              <div class="d-flex justify-content-between mt-2 text-muted small">
                <span>{{ enrollmentInfo.credits.completed }} credits completed</span>
                <span>{{ enrollmentInfo.credits.remaining }} credits remaining</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Personal Information -->
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
              <i class="feather icon-user me-2"></i>
              Personal Information
            </h5>
            <button class="btn btn-sm btn-outline-primary" disabled title="Contact your SETA to update information">
              <i class="feather icon-edit-2 me-1"></i> Request Update
            </button>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="text-muted small">Full Name</label>
                <p class="mb-0 fw-semibold">{{ learnerProfile.fullName }}</p>
              </div>
              <div class="col-md-6 mb-3">
                <label class="text-muted small">ID Number</label>
                <p class="mb-0">{{ maskIdNumber(learnerProfile.idNumber) }}</p>
              </div>
              <div class="col-md-6 mb-3">
                <label class="text-muted small">Date of Birth</label>
                <p class="mb-0">{{ learnerProfile.dateOfBirth | date:'longDate' }}</p>
              </div>
              <div class="col-md-6 mb-3">
                <label class="text-muted small">Gender</label>
                <p class="mb-0">{{ learnerProfile.gender }}</p>
              </div>
              <div class="col-md-6 mb-3">
                <label class="text-muted small">Email</label>
                <p class="mb-0">{{ learnerProfile.email }}</p>
              </div>
              <div class="col-md-6 mb-3">
                <label class="text-muted small">Phone</label>
                <p class="mb-0">{{ learnerProfile.phone }}</p>
              </div>
              <div class="col-12 mb-3">
                <label class="text-muted small">Address</label>
                <p class="mb-0">{{ learnerProfile.address }}, {{ learnerProfile.city }}, {{ learnerProfile.province }}, {{ learnerProfile.postalCode }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="col-lg-4 mb-4">
        <!-- Verification Status Card -->
        <div class="card mb-4">
          <div class="card-header">
            <h5 class="mb-0">
              <i class="feather icon-shield me-2"></i>
              Verification Status
            </h5>
          </div>
          <div class="card-body text-center">
            <div class="verification-status-large mb-3" [ngClass]="'status-' + verificationStatus.status.toLowerCase()">
              <i class="feather" [ngClass]="getVerificationIcon(verificationStatus.status)"></i>
            </div>
            <h4 class="mb-1">{{ verificationStatus.status }}</h4>
            <p class="text-muted mb-3">
              {{ getVerificationMessage(verificationStatus.status) }}
            </p>
            <div class="row text-center border-top pt-3">
              <div class="col-6 border-end">
                <h5 class="mb-0">{{ verificationStatus.verificationCount }}</h5>
                <small class="text-muted">Total Checks</small>
              </div>
              <div class="col-6">
                <h5 class="mb-0" [ngClass]="verificationStatus.isDuplicate ? 'text-warning' : 'text-success'">
                  {{ verificationStatus.isDuplicate ? 'Yes' : 'No' }}
                </h5>
                <small class="text-muted">Multi-SETA</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Activity Timeline -->
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">
              <i class="feather icon-activity me-2"></i>
              Recent Activity
            </h5>
          </div>
          <div class="card-body p-0">
            <div class="timeline">
              <div class="timeline-item" *ngFor="let event of timeline">
                <div class="timeline-marker" [ngClass]="'bg-' + getTimelineColor(event.type)">
                  <i class="feather" [ngClass]="event.icon"></i>
                </div>
                <div class="timeline-content">
                  <h6 class="mb-1">{{ event.title }}</h6>
                  <p class="text-muted small mb-1">{{ event.description }}</p>
                  <small class="text-muted">{{ event.date | date:'mediumDate' }}</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ng-template #loadingTemplate>
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="text-muted mt-3">Loading your status...</p>
      </div>
    </ng-template>
  `,
  styles: [`
    .welcome-card {
      border: none;
      border-radius: 12px;
    }
    .avatar-lg {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      font-weight: 600;
    }
    .verification-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.5rem 1rem;
      border-radius: 50px;
      font-weight: 500;
    }
    .verification-badge.status-green {
      background: rgba(40, 167, 69, 0.2);
      color: #d4edda;
    }
    .verification-badge.status-amber {
      background: rgba(255, 193, 7, 0.2);
      color: #fff3cd;
    }
    .verification-badge.status-red {
      background: rgba(220, 53, 69, 0.2);
      color: #f8d7da;
    }
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
      word-break: break-word;
    }

    .verification-status-large {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
    }
    .verification-status-large i {
      font-size: 36px;
    }
    .status-green {
      background: rgba(40, 167, 69, 0.15);
      color: #28a745;
    }
    .status-amber {
      background: rgba(255, 193, 7, 0.15);
      color: #ffc107;
    }
    .status-red {
      background: rgba(220, 53, 69, 0.15);
      color: #dc3545;
    }

    .timeline {
      position: relative;
      padding: 1rem;
    }
    .timeline-item {
      position: relative;
      padding-left: 40px;
      padding-bottom: 1.5rem;
      border-left: 2px solid #e9ecef;
    }
    .timeline-item:last-child {
      padding-bottom: 0;
      border-left-color: transparent;
    }
    .timeline-marker {
      position: absolute;
      left: -11px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .timeline-marker i {
      font-size: 10px;
      color: white;
    }
    .timeline-content {
      padding-left: 0.5rem;
    }
    .bg-enrollment { background-color: #3498db; }
    .bg-verification { background-color: #27ae60; }
    .bg-completion { background-color: #9b59b6; }
    .bg-update { background-color: #f39c12; }
    .bg-certificate { background-color: #e74c3c; }

    .progress {
      border-radius: 10px;
      background-color: #e9ecef;
    }
    .progress-bar {
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
    }
  `]
})
export class MyStatusComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loading = false;

  learnerProfile: LearnerProfile = {
    idNumber: '9001015009087',
    fullName: 'Sipho Ndlovu',
    firstName: 'Sipho',
    lastName: 'Ndlovu',
    dateOfBirth: new Date('1990-01-01'),
    gender: 'Male',
    email: 'sipho.ndlovu@gmail.com',
    phone: '+27 82 123 4567',
    address: '123 Main Street, Braamfontein',
    province: 'Gauteng',
    city: 'Johannesburg',
    postalCode: '2001'
  };

  enrollmentInfo: EnrollmentInfo = {
    setaCode: 'WRSETA',
    setaName: 'Wholesale and Retail SETA',
    enrollmentDate: new Date('2024-02-15'),
    status: 'Active',
    programName: 'National Certificate: Wholesale and Retail Operations',
    programCode: 'NC-WRO-L4',
    qualificationLevel: 'NQF Level 4',
    startDate: new Date('2024-03-01'),
    expectedEndDate: new Date('2025-08-31'),
    completionPercentage: 65,
    credits: {
      total: 120,
      completed: 78,
      remaining: 42
    }
  };

  verificationStatus: VerificationStatus = {
    lastVerified: new Date('2025-01-08'),
    status: 'GREEN',
    isDuplicate: false,
    verificationCount: 12
  };

  timeline: TimelineEvent[] = [
    { date: new Date('2025-01-08'), title: 'ID Verification', description: 'Identity verified successfully', type: 'verification', icon: 'icon-shield' },
    { date: new Date('2024-12-15'), title: 'Module Completed', description: 'Completed Module 5: Customer Service Excellence', type: 'completion', icon: 'icon-check-circle' },
    { date: new Date('2024-11-20'), title: 'Assessment Passed', description: 'Module 4 assessment passed with distinction', type: 'completion', icon: 'icon-award' },
    { date: new Date('2024-10-10'), title: 'Profile Updated', description: 'Contact details updated', type: 'update', icon: 'icon-edit' },
    { date: new Date('2024-03-01'), title: 'Program Started', description: 'Started NC: Wholesale and Retail Operations', type: 'enrollment', icon: 'icon-book-open' },
    { date: new Date('2024-02-15'), title: 'Enrollment', description: 'Enrolled with WRSETA', type: 'enrollment', icon: 'icon-user-plus' }
  ];

  setaBranding = {
    primary: '#003366',
    primaryDark: '#002244'
  };

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.loading = true;
    setTimeout(() => {
      this.loading = false;
    }, 500);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  maskIdNumber(id: string): string {
    return id.substring(0, 6) + '****' + id.substring(10);
  }

  getStatusClass(status: string): string {
    return 'status-' + status.toLowerCase();
  }

  getEnrollmentStatusClass(status: string): string {
    switch (status) {
      case 'Active': return 'bg-success';
      case 'Completed': return 'bg-primary';
      case 'Suspended': return 'bg-warning';
      case 'Withdrawn': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  getProgressBarClass(percentage: number): string {
    if (percentage >= 75) return 'bg-success';
    if (percentage >= 50) return 'bg-info';
    if (percentage >= 25) return 'bg-warning';
    return 'bg-danger';
  }

  getDaysRemaining(): number {
    const now = new Date();
    const end = new Date(this.enrollmentInfo.expectedEndDate);
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getVerificationIcon(status: string): string {
    switch (status) {
      case 'GREEN': return 'icon-check-circle';
      case 'AMBER': return 'icon-alert-triangle';
      case 'RED': return 'icon-x-circle';
      default: return 'icon-help-circle';
    }
  }

  getVerificationMessage(status: string): string {
    switch (status) {
      case 'GREEN': return 'Your identity has been verified and you are eligible to continue your program.';
      case 'AMBER': return 'Your enrollment requires attention. Please contact your SETA administrator.';
      case 'RED': return 'There are issues with your enrollment. Please contact your SETA immediately.';
      default: return 'Status unknown';
    }
  }

  getTimelineColor(type: string): string {
    return type;
  }
}
