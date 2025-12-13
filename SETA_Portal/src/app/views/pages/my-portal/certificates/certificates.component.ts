import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { User } from '../../../../interfaces/user.interface';

interface Certificate {
  id: number;
  name: string;
  issueDate: Date;
  expiryDate?: Date;
  level: string;
  status: 'available' | 'pending' | 'expired';
  downloadUrl?: string;
}

@Component({
  selector: 'app-learner-certificates',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="learner-certificates">
      <div class="page-header">
        <h1 class="page-title">{{ 'myPortal.myCertificates' | translate }}</h1>
        <p class="page-subtitle">{{ 'myPortal.certificatesSubtitle' | translate }}</p>
      </div>

      @if (certificates.length === 0) {
        <!-- Empty State -->
        <div class="empty-state">
          <div class="empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="8" r="7"></circle>
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
            </svg>
          </div>
          <h3>{{ 'myPortal.noCertificates' | translate }}</h3>
          <p class="text-muted">{{ 'myPortal.noCertificatesDesc' | translate }}</p>
        </div>
      } @else {
        <!-- Certificates Grid -->
        <div class="row g-4">
          @for (cert of certificates; track cert.id) {
            <div class="col-md-6 col-lg-4">
              <div class="certificate-card" [class.expired]="cert.status === 'expired'">
                <div class="certificate-header">
                  <div class="certificate-icon" [class]="getStatusClass(cert.status)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="8" r="7"></circle>
                      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                    </svg>
                  </div>
                  <span class="status-badge" [class]="getStatusBadgeClass(cert.status)">
                    {{ getStatusLabel(cert.status) | translate }}
                  </span>
                </div>
                <div class="certificate-body">
                  <h4 class="certificate-name">{{ cert.name }}</h4>
                  <span class="certificate-level">{{ cert.level }}</span>
                  <div class="certificate-dates">
                    <div class="date-item">
                      <span class="date-label">{{ 'myPortal.issued' | translate }}</span>
                      <span class="date-value">{{ cert.issueDate | date:'mediumDate' }}</span>
                    </div>
                    @if (cert.expiryDate) {
                      <div class="date-item">
                        <span class="date-label">{{ 'myPortal.expires' | translate }}</span>
                        <span class="date-value" [class.text-danger]="isExpiringSoon(cert)">
                          {{ cert.expiryDate | date:'mediumDate' }}
                        </span>
                      </div>
                    }
                  </div>
                </div>
                <div class="certificate-footer">
                  @if (cert.status === 'available' && cert.downloadUrl) {
                    <button class="btn btn-primary w-100" (click)="downloadCertificate(cert)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      {{ 'myPortal.download' | translate }}
                    </button>
                  } @else if (cert.status === 'pending') {
                    <button class="btn btn-outline-secondary w-100" disabled>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      {{ 'myPortal.pendingApproval' | translate }}
                    </button>
                  } @else {
                    <button class="btn btn-outline-danger w-100" disabled>
                      {{ 'myPortal.expired' | translate }}
                    </button>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .learner-certificates { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .page-header { margin-bottom: 1.5rem; }
    .page-title { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.25rem; }
    .page-subtitle { color: var(--bs-secondary); margin-bottom: 0; }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: white;
      border-radius: 0.75rem;
      border: 1px solid var(--bs-border-color);
    }
    .empty-icon {
      color: var(--bs-secondary);
      margin-bottom: 1.5rem;
      opacity: 0.5;
    }
    .empty-state h3 { font-size: 1.25rem; margin-bottom: 0.5rem; }

    .certificate-card {
      background: white;
      border-radius: 0.75rem;
      border: 1px solid var(--bs-border-color);
      overflow: hidden;
      height: 100%;
      display: flex;
      flex-direction: column;
      transition: box-shadow 0.2s ease;
    }
    .certificate-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .certificate-card.expired { opacity: 0.7; }

    .certificate-header {
      padding: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: var(--bs-light);
    }
    .certificate-icon {
      width: 56px;
      height: 56px;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .certificate-icon.available { background: var(--bs-success-bg-subtle); color: var(--bs-success); }
    .certificate-icon.pending { background: var(--bs-warning-bg-subtle); color: var(--bs-warning); }
    .certificate-icon.expired { background: var(--bs-danger-bg-subtle); color: var(--bs-danger); }

    .status-badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 1rem;
    }
    .status-badge.available { background: var(--bs-success-bg-subtle); color: var(--bs-success); }
    .status-badge.pending { background: var(--bs-warning-bg-subtle); color: var(--bs-warning); }
    .status-badge.expired { background: var(--bs-danger-bg-subtle); color: var(--bs-danger); }

    .certificate-body {
      padding: 1.25rem;
      flex: 1;
    }
    .certificate-name { font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem; }
    .certificate-level { font-size: 0.875rem; color: var(--bs-secondary); }

    .certificate-dates {
      margin-top: 1rem;
      display: flex;
      gap: 1.5rem;
    }
    .date-item { display: flex; flex-direction: column; }
    .date-label { font-size: 0.7rem; color: var(--bs-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
    .date-value { font-size: 0.875rem; font-weight: 500; }

    .certificate-footer {
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--bs-border-color);
    }
  `]
})
export class LearnerCertificatesComponent implements OnInit {
  private readonly authService = inject(AuthService);

  user: User | null = null;

  // Mock certificates - in production, this would come from API
  certificates: Certificate[] = [];

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      this.user = user;
    });

    // Load mock certificates (empty for new learner)
    this.loadCertificates();
  }

  private loadCertificates(): void {
    // Mock data - would be API call in production
    this.certificates = [];
  }

  getStatusClass(status: string): string {
    return status;
  }

  getStatusBadgeClass(status: string): string {
    return status;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'available': 'myPortal.available',
      'pending': 'myPortal.pending',
      'expired': 'myPortal.expired'
    };
    return labels[status] || status;
  }

  isExpiringSoon(cert: Certificate): boolean {
    if (!cert.expiryDate) return false;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return cert.expiryDate <= thirtyDaysFromNow;
  }

  downloadCertificate(cert: Certificate): void {
    if (cert.downloadUrl) {
      window.open(cert.downloadUrl, '_blank');
    }
  }
}
