import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NgbModalModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject } from 'rxjs';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

interface Certificate {
  id: number;
  certificateNumber: string;
  type: 'Completion' | 'Achievement' | 'Attendance' | 'Competency';
  title: string;
  program: string;
  setaCode: string;
  setaName: string;
  issueDate: Date;
  expiryDate?: Date;
  status: 'Active' | 'Expired' | 'Revoked';
  nqfLevel: string;
  credits: number;
  downloadUrl: string;
  verificationCode: string;
}

@Component({
  selector: 'app-my-certificates',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgbModalModule, PageHeaderComponent],
  template: `
    <app-page-header
      titleKey="nav.myCertificates"
      subtitle="View and download your earned certificates"
      icon="award"
    ></app-page-header>

    <!-- Stats Cards -->
    <div class="row mb-4">
      <div class="col-md-3">
        <div class="card stat-card">
          <div class="card-body">
            <div class="d-flex justify-content-between">
              <div>
                <p class="text-muted mb-1">Total Certificates</p>
                <h3 class="mb-0">{{ certificates.length }}</h3>
              </div>
              <div class="stat-icon bg-primary-light">
                <i class="feather icon-award text-primary"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stat-card">
          <div class="card-body">
            <div class="d-flex justify-content-between">
              <div>
                <p class="text-muted mb-1">Active</p>
                <h3 class="mb-0 text-success">{{ getActiveCertificates() }}</h3>
              </div>
              <div class="stat-icon bg-success-light">
                <i class="feather icon-check-circle text-success"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stat-card">
          <div class="card-body">
            <div class="d-flex justify-content-between">
              <div>
                <p class="text-muted mb-1">Total Credits</p>
                <h3 class="mb-0 text-info">{{ getTotalCredits() }}</h3>
              </div>
              <div class="stat-icon bg-info-light">
                <i class="feather icon-star text-info"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stat-card">
          <div class="card-body">
            <div class="d-flex justify-content-between">
              <div>
                <p class="text-muted mb-1">Expiring Soon</p>
                <h3 class="mb-0 text-warning">{{ getExpiringSoon() }}</h3>
              </div>
              <div class="stat-icon bg-warning-light">
                <i class="feather icon-alert-circle text-warning"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card mb-4">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label">Search</label>
            <div class="input-group">
              <span class="input-group-text"><i class="feather icon-search"></i></span>
              <input
                type="text"
                class="form-control"
                placeholder="Search by title or certificate number..."
                [(ngModel)]="searchTerm"
                (ngModelChange)="applyFilters()">
            </div>
          </div>
          <div class="col-md-3">
            <label class="form-label">Type</label>
            <select class="form-select" [(ngModel)]="typeFilter" (ngModelChange)="applyFilters()">
              <option value="">All Types</option>
              <option value="Completion">Completion</option>
              <option value="Achievement">Achievement</option>
              <option value="Attendance">Attendance</option>
              <option value="Competency">Competency</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label">Status</label>
            <select class="form-select" [(ngModel)]="statusFilter" (ngModelChange)="applyFilters()">
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
            </select>
          </div>
          <div class="col-md-2 d-flex align-items-end">
            <button class="btn btn-outline-secondary w-100" (click)="clearFilters()">
              <i class="feather icon-x me-2"></i>Clear
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Certificates Grid -->
    <div class="row" *ngIf="!loading; else loadingTemplate">
      <div class="col-lg-4 col-md-6 mb-4" *ngFor="let cert of filteredCertificates">
        <div class="card certificate-card h-100">
          <div class="card-header certificate-header" [ngClass]="'bg-' + getTypeColor(cert.type)">
            <div class="d-flex justify-content-between align-items-start">
              <div class="certificate-icon">
                <i class="feather" [ngClass]="getCertificateIcon(cert.type)"></i>
              </div>
              <span class="badge bg-white" [ngClass]="'text-' + getStatusColor(cert.status)">
                {{ cert.status }}
              </span>
            </div>
            <h5 class="text-white mt-3 mb-0">{{ cert.type }} Certificate</h5>
            <small class="text-white-50">{{ cert.certificateNumber }}</small>
          </div>
          <div class="card-body">
            <h6 class="mb-3">{{ cert.title }}</h6>
            <div class="certificate-details small">
              <div class="mb-2">
                <i class="feather icon-book-open text-muted me-2"></i>
                {{ cert.program }}
              </div>
              <div class="mb-2">
                <i class="feather icon-briefcase text-muted me-2"></i>
                {{ cert.setaCode }}
              </div>
              <div class="mb-2">
                <i class="feather icon-layers text-muted me-2"></i>
                {{ cert.nqfLevel }} | {{ cert.credits }} Credits
              </div>
              <div class="mb-2">
                <i class="feather icon-calendar text-muted me-2"></i>
                Issued: {{ cert.issueDate | date:'mediumDate' }}
              </div>
              <div *ngIf="cert.expiryDate" class="mb-0" [ngClass]="{'text-danger': isExpiringSoon(cert)}">
                <i class="feather icon-clock text-muted me-2"></i>
                Expires: {{ cert.expiryDate | date:'mediumDate' }}
                <span *ngIf="isExpiringSoon(cert)" class="badge bg-warning ms-2">Expiring Soon</span>
              </div>
            </div>
          </div>
          <div class="card-footer bg-transparent">
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-primary flex-grow-1" (click)="downloadCertificate(cert)" [disabled]="cert.status === 'Revoked'">
                <i class="feather icon-download me-1"></i> Download
              </button>
              <button class="btn btn-sm btn-outline-info" (click)="openDetailsModal(detailsModal, cert)">
                <i class="feather icon-eye"></i>
              </button>
              <button class="btn btn-sm btn-outline-secondary" (click)="shareCertificate(cert)">
                <i class="feather icon-share-2"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12" *ngIf="filteredCertificates.length === 0">
        <div class="card">
          <div class="card-body text-center py-5">
            <i class="feather icon-award text-muted" style="font-size: 64px;"></i>
            <h5 class="mt-3">No Certificates Found</h5>
            <p class="text-muted">
              {{ certificates.length === 0 ? 'You haven\'t earned any certificates yet.' : 'No certificates match your search criteria.' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <ng-template #loadingTemplate>
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="text-muted mt-3">Loading your certificates...</p>
      </div>
    </ng-template>

    <!-- Details Modal -->
    <ng-template #detailsModal let-modal>
      <div class="modal-header" [ngClass]="'bg-' + getTypeColor(selectedCertificate?.type || 'Completion')">
        <h5 class="modal-title text-white">Certificate Details</h5>
        <button type="button" class="btn-close btn-close-white" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body" *ngIf="selectedCertificate">
        <!-- Certificate Preview -->
        <div class="certificate-preview mb-4 p-4 border rounded text-center" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);">
          <div class="mb-3">
            <i class="feather icon-award" style="font-size: 48px; color: #d4af37;"></i>
          </div>
          <h4 class="mb-1">{{ selectedCertificate.title }}</h4>
          <p class="text-muted mb-3">{{ selectedCertificate.type }} Certificate</p>
          <div class="certificate-number mb-2">
            <code>{{ selectedCertificate.certificateNumber }}</code>
          </div>
          <p class="mb-0 small text-muted">
            Issued by {{ selectedCertificate.setaName }}
          </p>
        </div>

        <!-- Details Table -->
        <table class="table table-sm">
          <tbody>
            <tr>
              <td class="text-muted" style="width: 40%;">Program</td>
              <td>{{ selectedCertificate.program }}</td>
            </tr>
            <tr>
              <td class="text-muted">NQF Level</td>
              <td>{{ selectedCertificate.nqfLevel }}</td>
            </tr>
            <tr>
              <td class="text-muted">Credits</td>
              <td>{{ selectedCertificate.credits }}</td>
            </tr>
            <tr>
              <td class="text-muted">Issue Date</td>
              <td>{{ selectedCertificate.issueDate | date:'longDate' }}</td>
            </tr>
            <tr *ngIf="selectedCertificate.expiryDate">
              <td class="text-muted">Expiry Date</td>
              <td [ngClass]="{'text-danger': isExpiringSoon(selectedCertificate)}">
                {{ selectedCertificate.expiryDate | date:'longDate' }}
              </td>
            </tr>
            <tr>
              <td class="text-muted">Status</td>
              <td>
                <span class="badge" [ngClass]="'bg-' + getStatusColor(selectedCertificate.status)">
                  {{ selectedCertificate.status }}
                </span>
              </td>
            </tr>
            <tr>
              <td class="text-muted">Verification Code</td>
              <td>
                <code>{{ selectedCertificate.verificationCode }}</code>
                <button class="btn btn-sm btn-link p-0 ms-2" (click)="copyVerificationCode(selectedCertificate.verificationCode)">
                  <i class="feather icon-copy"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="alert alert-info mt-3">
          <i class="feather icon-info me-2"></i>
          <small>Employers can verify this certificate at the SETA verification portal using the verification code above.</small>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">Close</button>
        <button type="button" class="btn btn-outline-info" (click)="shareCertificate(selectedCertificate!)">
          <i class="feather icon-share-2 me-2"></i>Share
        </button>
        <button type="button" class="btn btn-primary" (click)="downloadCertificate(selectedCertificate!)" [disabled]="selectedCertificate?.status === 'Revoked'">
          <i class="feather icon-download me-2"></i>Download PDF
        </button>
      </div>
    </ng-template>
  `,
  styles: [`
    .stat-card {
      transition: transform 0.2s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
    }
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .stat-icon i {
      font-size: 24px;
    }
    .bg-primary-light { background-color: rgba(var(--bs-primary-rgb), 0.1); }
    .bg-success-light { background-color: rgba(25, 135, 84, 0.1); }
    .bg-info-light { background-color: rgba(13, 202, 240, 0.1); }
    .bg-warning-light { background-color: rgba(255, 193, 7, 0.1); }

    .certificate-card {
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .certificate-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }
    .certificate-header {
      padding: 1.5rem;
      border-radius: 0.375rem 0.375rem 0 0;
    }
    .certificate-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .certificate-icon i {
      font-size: 24px;
      color: white;
    }

    .bg-completion { background: linear-gradient(135deg, #d4af37 0%, #b8972e 100%); }
    .bg-achievement { background: linear-gradient(135deg, #9b59b6 0%, #7d3c98 100%); }
    .bg-attendance { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); }
    .bg-competency { background: linear-gradient(135deg, #27ae60 0%, #1e8449 100%); }

    .certificate-preview {
      border: 3px double #d4af37 !important;
    }

    code {
      background: #e9ecef;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
    }
  `]
})
export class MyCertificatesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  certificates: Certificate[] = [];
  filteredCertificates: Certificate[] = [];
  selectedCertificate: Certificate | null = null;

  loading = false;

  searchTerm = '';
  typeFilter = '';
  statusFilter = '';

  private mockCertificates: Certificate[] = [
    {
      id: 1,
      certificateNumber: 'WRSETA-2024-NC-00125',
      type: 'Completion',
      title: 'National Certificate: Wholesale and Retail Operations',
      program: 'NC: Wholesale and Retail Operations',
      setaCode: 'WRSETA',
      setaName: 'Wholesale and Retail SETA',
      issueDate: new Date('2024-08-15'),
      status: 'Active',
      nqfLevel: 'NQF Level 4',
      credits: 120,
      downloadUrl: '/certificates/wrseta-nc-001.pdf',
      verificationCode: 'VER-WR-2024-08-00125'
    },
    {
      id: 2,
      certificateNumber: 'WRSETA-2024-SP-00089',
      type: 'Competency',
      title: 'Customer Service Excellence',
      program: 'Skills Programme: Customer Service',
      setaCode: 'WRSETA',
      setaName: 'Wholesale and Retail SETA',
      issueDate: new Date('2024-06-20'),
      expiryDate: new Date('2027-06-20'),
      status: 'Active',
      nqfLevel: 'NQF Level 3',
      credits: 40,
      downloadUrl: '/certificates/wrseta-sp-089.pdf',
      verificationCode: 'VER-WR-2024-06-00089'
    },
    {
      id: 3,
      certificateNumber: 'WRSETA-2024-ATT-00234',
      type: 'Attendance',
      title: 'Retail Management Workshop',
      program: 'Workshop: Retail Management',
      setaCode: 'WRSETA',
      setaName: 'Wholesale and Retail SETA',
      issueDate: new Date('2024-04-10'),
      status: 'Active',
      nqfLevel: 'N/A',
      credits: 0,
      downloadUrl: '/certificates/wrseta-att-234.pdf',
      verificationCode: 'VER-WR-2024-04-00234'
    },
    {
      id: 4,
      certificateNumber: 'WRSETA-2023-ACH-00156',
      type: 'Achievement',
      title: 'Top Performer Award 2023',
      program: 'Annual Awards Programme',
      setaCode: 'WRSETA',
      setaName: 'Wholesale and Retail SETA',
      issueDate: new Date('2023-12-05'),
      status: 'Active',
      nqfLevel: 'N/A',
      credits: 0,
      downloadUrl: '/certificates/wrseta-ach-156.pdf',
      verificationCode: 'VER-WR-2023-12-00156'
    },
    {
      id: 5,
      certificateNumber: 'WRSETA-2022-SP-00045',
      type: 'Competency',
      title: 'Health and Safety in Retail',
      program: 'Skills Programme: OHS',
      setaCode: 'WRSETA',
      setaName: 'Wholesale and Retail SETA',
      issueDate: new Date('2022-03-15'),
      expiryDate: new Date('2025-03-15'),
      status: 'Active',
      nqfLevel: 'NQF Level 2',
      credits: 20,
      downloadUrl: '/certificates/wrseta-sp-045.pdf',
      verificationCode: 'VER-WR-2022-03-00045'
    }
  ];

  constructor(private modalService: NgbModal) {}

  ngOnInit(): void {
    this.loadCertificates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCertificates(): void {
    this.loading = true;
    setTimeout(() => {
      this.certificates = [...this.mockCertificates];
      this.applyFilters();
      this.loading = false;
    }, 500);
  }

  applyFilters(): void {
    let filtered = [...this.certificates];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(term) ||
        c.certificateNumber.toLowerCase().includes(term) ||
        c.program.toLowerCase().includes(term)
      );
    }

    if (this.typeFilter) {
      filtered = filtered.filter(c => c.type === this.typeFilter);
    }

    if (this.statusFilter) {
      filtered = filtered.filter(c => c.status === this.statusFilter);
    }

    this.filteredCertificates = filtered;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.typeFilter = '';
    this.statusFilter = '';
    this.applyFilters();
  }

  getActiveCertificates(): number {
    return this.certificates.filter(c => c.status === 'Active').length;
  }

  getTotalCredits(): number {
    return this.certificates.reduce((sum, c) => sum + c.credits, 0);
  }

  getExpiringSoon(): number {
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return this.certificates.filter(c =>
      c.expiryDate && c.status === 'Active' && new Date(c.expiryDate) <= threeMonthsFromNow
    ).length;
  }

  isExpiringSoon(cert: Certificate): boolean {
    if (!cert.expiryDate) return false;
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return new Date(cert.expiryDate) <= threeMonthsFromNow;
  }

  getTypeColor(type: string): string {
    return type.toLowerCase();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Active': return 'success';
      case 'Expired': return 'warning';
      case 'Revoked': return 'danger';
      default: return 'secondary';
    }
  }

  getCertificateIcon(type: string): string {
    switch (type) {
      case 'Completion': return 'icon-award';
      case 'Achievement': return 'icon-star';
      case 'Attendance': return 'icon-check-circle';
      case 'Competency': return 'icon-zap';
      default: return 'icon-file-text';
    }
  }

  openDetailsModal(modal: any, cert: Certificate): void {
    this.selectedCertificate = cert;
    this.modalService.open(modal, { size: 'lg' });
  }

  downloadCertificate(cert: Certificate): void {
    // Simulate download
    alert(`Downloading certificate: ${cert.certificateNumber}`);
  }

  shareCertificate(cert: Certificate): void {
    const shareUrl = `https://verify.seta-portal.gov.za/${cert.verificationCode}`;
    if (navigator.share) {
      navigator.share({
        title: cert.title,
        text: `Certificate: ${cert.title} - Verification Code: ${cert.verificationCode}`,
        url: shareUrl
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard!');
    }
  }

  copyVerificationCode(code: string): void {
    navigator.clipboard.writeText(code);
    alert('Verification code copied to clipboard!');
  }
}
