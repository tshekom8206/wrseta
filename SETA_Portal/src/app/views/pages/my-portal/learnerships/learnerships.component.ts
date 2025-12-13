import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { IconService } from '../../../../core/services/icon.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { AuthService } from '../../../../core/auth/auth.service';

interface AvailableLearnership {
  id: number;
  title: string;
  code: string;
  nqfLevel: number;
  credits: number;
  duration: string; // e.g., "12 months", "18 months"
  startDate: Date;
  applicationDeadline: Date;
  category: string; // e.g., "Business Administration", "IT", "Engineering"
  location: string;
  provider: string;
  description: string;
  requirements: string[];
  benefits: string[];
  isOpen: boolean;
  availableSpots: number;
  totalSpots: number;
}

@Component({
  selector: 'app-leaderships',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, PageHeaderComponent],
  template: `
    <app-page-header
      titleKey="nav.learnerships"
      subtitle="Browse and apply for available learnership programs"
      icon="book-open"
    ></app-page-header>

    @if (loading) {
      <div class="card">
        <div class="card-body text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="text-muted mt-3">Loading learnerships...</p>
        </div>
      </div>
    } @else if (learnerships.length === 0) {
      <div class="card">
        <div class="card-body coming-soon-state">
          <div class="coming-soon-content">
            <div class="coming-soon-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                [innerHTML]="getSafeIcon('book-open')"
              ></svg>
            </div>
            <h3 class="coming-soon-title">No Learnerships Available</h3>
            <p class="coming-soon-message">
              There are currently no learnership programs available.
              Please check back later for new opportunities.
            </p>
          </div>
        </div>
      </div>
    } @else {
      <!-- Filter Section -->
      <div class="card mb-3">
        <div class="card-body py-3">
          <div class="row g-3 align-items-end">
            <div class="col-md-4">
              <label class="form-label">Category</label>
              <select class="form-select" [(ngModel)]="selectedCategory" (ngModelChange)="applyFilters()">
                <option value="">All Categories</option>
                @for (category of categories; track category) {
                  <option [value]="category">{{ category }}</option>
                }
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label">NQF Level</label>
              <select class="form-select" [(ngModel)]="selectedNqfLevel" (ngModelChange)="applyFilters()">
                <option value="">All Levels</option>
                @for (level of nqfLevels; track level) {
                  <option [value]="level">{{ level }}</option>
                }
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label">Status</label>
              <select class="form-select" [(ngModel)]="selectedStatus" (ngModelChange)="applyFilters()">
                <option value="">All Status</option>
                <option value="open">Open for Applications</option>
                <option value="closing">Closing Soon</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Learnerships Grid -->
      <div class="row g-4">
        @for (learnership of filteredLearnerships; track learnership.id) {
          <div class="col-md-6 col-lg-4">
            <div class="card learnership-card" [class.closing-soon]="isClosingSoon(learnership)">
              <div class="learnership-header">
                <div class="learnership-badge" [class]="getCategoryClass(learnership.category)">
                  {{ learnership.category }}
                </div>
                @if (isClosingSoon(learnership)) {
                  <span class="closing-badge">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    Closing Soon
                  </span>
                }
              </div>
              <div class="card-body">
                <h5 class="learnership-title">{{ learnership.title }}</h5>
                <div class="learnership-meta">
                  <span class="meta-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    Code: {{ learnership.code }}
                  </span>
                  <span class="meta-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                    </svg>
                    NQF {{ learnership.nqfLevel }}
                  </span>
                  <span class="meta-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="8" r="7"></circle>
                      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                    </svg>
                    {{ learnership.credits }} Credits
                  </span>
                </div>

                <p class="learnership-description">{{ learnership.description }}</p>

                <div class="learnership-details">
                  <div class="detail-row">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="detail-icon">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <div>
                      <span class="detail-label">Duration</span>
                      <span class="detail-value">{{ learnership.duration }}</span>
                    </div>
                  </div>
                  <div class="detail-row">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="detail-icon">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <div>
                      <span class="detail-label">Location</span>
                      <span class="detail-value">{{ learnership.location }}</span>
                    </div>
                  </div>
                  <div class="detail-row">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="detail-icon">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <div>
                      <span class="detail-label">Provider</span>
                      <span class="detail-value">{{ learnership.provider }}</span>
                    </div>
                  </div>
                  <div class="detail-row">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="detail-icon">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <div>
                      <span class="detail-label">Application Deadline</span>
                      <span class="detail-value">{{ learnership.applicationDeadline | date:'mediumDate' }}</span>
                    </div>
                  </div>
                  <div class="detail-row">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="detail-icon">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                    </svg>
                    <div>
                      <span class="detail-label">Available Spots</span>
                      <span class="detail-value">{{ learnership.availableSpots }} of {{ learnership.totalSpots }}</span>
                    </div>
                  </div>
                </div>

                @if (learnership.requirements && learnership.requirements.length > 0) {
                  <div class="requirements-section">
                    <strong class="requirements-title">Requirements:</strong>
                    <ul class="requirements-list">
                      @for (req of learnership.requirements.slice(0, 3); track req) {
                        <li>{{ req }}</li>
                      }
                      @if (learnership.requirements.length > 3) {
                        <li class="text-muted">+{{ learnership.requirements.length - 3 }} more</li>
                      }
                    </ul>
                  </div>
                }
              </div>
              <div class="card-footer">
                <div class="d-flex gap-2">
                  <button class="btn btn-outline-primary flex-grow-1" (click)="viewDetails(learnership)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    View Details
                  </button>
                  <button 
                    class="btn btn-primary flex-grow-1" 
                    (click)="applyForLearnership(learnership)"
                    [disabled]="!learnership.isOpen || learnership.availableSpots === 0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    Apply Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .card {
      border: none;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border-radius: 0.75rem;
      overflow: hidden;
      transition: all 0.3s ease;

      &:not(.learnership-card) {
        margin-bottom: 1rem;
      }

      &.learnership-card {
        height: 100%;
        display: flex;
        flex-direction: column;
      }
    }

    .learnership-card {
      &:hover {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        transform: translateY(-4px);
      }

      &.closing-soon {
        border: 2px solid var(--bs-warning);
      }
    }

    .learnership-header {
      position: relative;
      padding: 1rem 1.25rem;
      background: linear-gradient(135deg, rgba(0, 133, 80, 0.08) 0%, rgba(0, 133, 80, 0.03) 100%);
      border-bottom: 1px solid rgba(0, 133, 80, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .learnership-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.375rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;

      &.category-business {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      &.category-it {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
      }

      &.category-engineering {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        color: white;
      }

      &.category-education {
        background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
        color: white;
      }

      &.category-healthcare {
        background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
        color: white;
      }

      &.category-default {
        background: linear-gradient(135deg, var(--seta-primary, #008550) 0%, var(--seta-primary-dark, #006640) 100%);
        color: white;
      }
    }

    .closing-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.375rem 0.75rem;
      background: var(--bs-warning);
      color: #000;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;

      svg {
        width: 14px;
        height: 14px;
      }
    }

    .learnership-card .card-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 1.5rem;
    }

    .learnership-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--seta-text-primary, #212529);
      margin-bottom: 1rem;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .learnership-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }

    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      color: var(--seta-text-secondary, #6c757d);
      font-weight: 500;

      svg {
        color: var(--seta-primary, #008550);
        flex-shrink: 0;
      }
    }

    .learnership-description {
      font-size: 0.9375rem;
      color: var(--seta-text-secondary, #6c757d);
      line-height: 1.6;
      margin-bottom: 1.25rem;
      flex: 1;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .learnership-details {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
      padding: 1rem;
      background: var(--seta-bg-secondary, #f8f9fa);
      border-radius: 0.5rem;
    }

    .detail-row {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .detail-icon {
      color: var(--seta-primary, #008550);
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    .detail-label {
      display: block;
      font-size: 0.75rem;
      color: var(--seta-text-secondary, #6c757d);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .detail-value {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--seta-text-primary, #212529);
    }

    .requirements-section {
      margin-bottom: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(0, 0, 0, 0.06);
    }

    .requirements-title {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--seta-text-primary, #212529);
      margin-bottom: 0.5rem;
    }

    .requirements-list {
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: 0.875rem;
      color: var(--seta-text-secondary, #6c757d);

      li {
        padding: 0.25rem 0;
        padding-left: 1.25rem;
        position: relative;

        &::before {
          content: '•';
          position: absolute;
          left: 0;
          color: var(--seta-primary, #008550);
          font-weight: bold;
        }
      }
    }

    .card-footer {
      background: var(--seta-bg-secondary, #f8f9fa);
      border-top: 1px solid rgba(0, 0, 0, 0.06);
      padding: 1rem 1.25rem;

      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        font-weight: 600;
        transition: all 0.2s ease;

        svg {
          flex-shrink: 0;
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }
    }

    .coming-soon-state {
      padding: 4rem 2rem;
      min-height: 300px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .coming-soon-content {
      text-align: center;
      max-width: 500px;
    }

    .coming-soon-icon {
      width: 100px;
      height: 100px;
      margin: 0 auto 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, rgba(0, 133, 80, 0.1) 0%, rgba(0, 133, 80, 0.05) 100%);
      border-radius: 50%;
      color: var(--seta-primary, #008550);

      svg {
        width: 48px;
        height: 48px;
      }
    }

    .coming-soon-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--seta-text-primary, #212529);
      margin-bottom: 1rem;
    }

    .coming-soon-message {
      font-size: 1rem;
      line-height: 1.6;
      color: var(--seta-text-secondary, #6c757d);
      margin: 0;
    }

    @media (max-width: 767.98px) {
      .learnership-card .card-body {
        padding: 1rem;
      }

      .learnership-meta {
        font-size: 0.75rem;
        gap: 0.5rem;
      }

      .detail-row {
        flex-wrap: wrap;
      }
    }
  `]
})
export class LearnershipsComponent implements OnInit, OnDestroy {
  private readonly iconService = inject(IconService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  loading = true;
  learnerships: AvailableLearnership[] = [];
  filteredLearnerships: AvailableLearnership[] = [];

  // Filter options
  selectedCategory = '';
  selectedNqfLevel = '';
  selectedStatus = '';
  categories: string[] = [];
  nqfLevels: number[] = [];

  ngOnInit(): void {
    this.loadLearnerships();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getSafeIcon(iconName: string): SafeHtml {
    const iconPath = this.iconService.getIconPath(iconName);
    return this.sanitizer.bypassSecurityTrustHtml(iconPath);
  }

  getCategoryClass(category: string): string {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('business') || categoryLower.includes('administration')) {
      return 'category-business';
    } else if (categoryLower.includes('it') || categoryLower.includes('technology') || categoryLower.includes('software')) {
      return 'category-it';
    } else if (categoryLower.includes('engineering') || categoryLower.includes('technical')) {
      return 'category-engineering';
    } else if (categoryLower.includes('education') || categoryLower.includes('training')) {
      return 'category-education';
    } else if (categoryLower.includes('health') || categoryLower.includes('medical')) {
      return 'category-healthcare';
    }
    return 'category-default';
  }

  isClosingSoon(learnership: AvailableLearnership): boolean {
    const daysUntilDeadline = Math.ceil(
      (learnership.applicationDeadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilDeadline <= 7 && daysUntilDeadline > 0;
  }

  applyFilters(): void {
    this.filteredLearnerships = this.learnerships.filter(learnership => {
      if (this.selectedCategory && learnership.category !== this.selectedCategory) {
        return false;
      }
      if (this.selectedNqfLevel && learnership.nqfLevel.toString() !== this.selectedNqfLevel) {
        return false;
      }
      if (this.selectedStatus === 'open' && !learnership.isOpen) {
        return false;
      }
      if (this.selectedStatus === 'closing' && !this.isClosingSoon(learnership)) {
        return false;
      }
      return true;
    });
  }

  viewDetails(learnership: AvailableLearnership): void {
    // TODO: Implement view details modal or navigation
    console.log('View details for:', learnership);
    alert(`Viewing details for: ${learnership.title}`);
  }

  applyForLearnership(learnership: AvailableLearnership): void {
    this.router.navigate(['/my-portal/learnerships/apply', learnership.id], {
      state: { learnership }
    });
  }

  private loadLearnerships(): void {
    this.loading = true;

    // Mock data based on real WRSETA learnerships - replace with actual API call
    setTimeout(() => {
      const mockLearnerships: AvailableLearnership[] = [
        {
          id: 1,
          title: 'National Certificate: Wholesale and Retail Operations',
          code: '58206',
          nqfLevel: 2,
          credits: 120,
          duration: '12 months',
          startDate: new Date('2025-02-01'),
          applicationDeadline: new Date('2025-01-20'),
          category: 'Business Administration',
          location: 'Johannesburg, Gauteng',
          provider: 'WRSETA Accredited Provider',
          description: 'Gain comprehensive skills in wholesale and retail operations including customer service, stock management, sales techniques, and retail operations. This qualification prepares you for various roles in the retail industry.',
          requirements: [
            'Grade 10 or equivalent',
            'Basic numeracy and literacy',
            'Customer service orientation',
            'South African citizen or permanent resident'
          ],
          benefits: [
            'Monthly stipend provided',
            'Practical work experience',
            'Industry-recognized qualification',
            'Multiple career opportunities in retail'
          ],
          isOpen: true,
          availableSpots: 25,
          totalSpots: 40
        },
        {
          id: 2,
          title: 'National Certificate: Service Station Operations (Forecourt Attendant)',
          code: '62709',
          nqfLevel: 2,
          credits: 120,
          duration: '12 months',
          startDate: new Date('2025-03-01'),
          applicationDeadline: new Date('2025-02-15'),
          category: 'Business Administration',
          location: 'Pretoria, Gauteng',
          provider: 'WRSETA Accredited Provider',
          description: 'Develop skills in service station operations as a forecourt attendant. Learn fuel handling, customer service, payment processing, and safety procedures essential for service station operations.',
          requirements: [
            'Grade 10 or equivalent',
            'Physical fitness',
            'Attention to safety procedures',
            'Willingness to work shifts'
          ],
          benefits: [
            'Practical on-site training',
            'Safety certification',
            'Customer service skills',
            'Growing industry with opportunities'
          ],
          isOpen: true,
          availableSpots: 15,
          totalSpots: 30
        },
        {
          id: 3,
          title: 'National Certificate: Wholesale and Retail Operations (Retail Sales)',
          code: '63409',
          nqfLevel: 3,
          credits: 120,
          duration: '12-18 months',
          startDate: new Date('2025-02-15'),
          applicationDeadline: new Date('2025-01-25'),
          category: 'Business Administration',
          location: 'Cape Town, Western Cape',
          provider: 'WRSETA Accredited Provider',
          description: 'Advanced training in retail sales operations including visual merchandising, stock control, customer relationship management, and sales techniques. Ideal for those seeking supervisory roles in retail.',
          requirements: [
            'Grade 12 or equivalent',
            'Previous retail experience preferred',
            'Strong communication skills',
            'Sales-oriented mindset'
          ],
          benefits: [
            'Advanced retail skills',
            'Supervisory training',
            'Higher earning potential',
            'Career progression opportunities'
          ],
          isOpen: true,
          availableSpots: 20,
          totalSpots: 35
        },
        {
          id: 4,
          title: 'Further Education and Training Certificate: Generic Management (Wholesale and Retail)',
          code: '63333',
          nqfLevel: 4,
          credits: 120,
          duration: '18 months',
          startDate: new Date('2025-04-01'),
          applicationDeadline: new Date('2025-02-28'),
          category: 'Business Administration',
          location: 'Durban, KwaZulu-Natal',
          provider: 'WRSETA Accredited Provider',
          description: 'Develop management skills specifically for the wholesale and retail sector. Learn team leadership, operations management, financial management, and strategic planning in a retail context.',
          requirements: [
            'Grade 12 or equivalent',
            'Relevant work experience preferred',
            'Leadership potential',
            'Mathematics and English proficiency'
          ],
          benefits: [
            'Management qualification',
            'Leadership development',
            'Higher-level career opportunities',
            'Professional growth'
          ],
          isOpen: true,
          availableSpots: 12,
          totalSpots: 25
        },
        {
          id: 5,
          title: 'National Certificate: Wholesale and Retail Operations Supervision',
          code: '49397',
          nqfLevel: 4,
          credits: 120,
          duration: '18 months',
          startDate: new Date('2025-02-01'),
          applicationDeadline: new Date('2025-01-18'),
          category: 'Business Administration',
          location: 'Port Elizabeth, Eastern Cape',
          provider: 'WRSETA Accredited Provider',
          description: 'Comprehensive supervision training for retail operations. Learn to manage staff, oversee daily operations, handle customer escalations, and ensure store compliance with industry standards.',
          requirements: [
            'Grade 12 or equivalent',
            'Previous retail experience',
            'Supervisory experience preferred',
            'Strong problem-solving skills'
          ],
          benefits: [
            'Supervisory certification',
            'People management skills',
            'Operations expertise',
            'Management career path'
          ],
          isOpen: true,
          availableSpots: 10,
          totalSpots: 20
        },
        {
          id: 6,
          title: 'National Certificate: Wholesale and Retail Generic Management',
          code: '63334',
          nqfLevel: 5,
          credits: 120,
          duration: '24 months',
          startDate: new Date('2025-03-15'),
          applicationDeadline: new Date('2025-03-01'),
          category: 'Business Administration',
          location: 'Bloemfontein, Free State',
          provider: 'WRSETA Accredited Provider',
          description: 'Advanced management qualification for the wholesale and retail sector. Cover strategic planning, business analysis, financial management, marketing, and leadership at a senior level.',
          requirements: [
            'Grade 12 with Mathematics',
            'Significant retail management experience',
            'Leadership experience',
            'Business acumen'
          ],
          benefits: [
            'Senior management qualification',
            'Strategic thinking skills',
            'Business leadership',
            'Executive career opportunities'
          ],
          isOpen: true,
          availableSpots: 8,
          totalSpots: 15
        },
        {
          id: 7,
          title: 'National Certificate: Wholesale and Retail Operations (Visual Merchandising)',
          code: '63409',
          nqfLevel: 3,
          credits: 120,
          duration: '12 months',
          startDate: new Date('2025-02-01'),
          applicationDeadline: new Date('2025-01-25'),
          category: 'Business Administration',
          location: 'Johannesburg, Gauteng',
          provider: 'WRSETA Accredited Provider',
          description: 'Specialized training in visual merchandising for retail environments. Learn product display, store layout design, window dressing, and creating appealing visual presentations that drive sales.',
          requirements: [
            'Grade 12 or equivalent',
            'Creative flair',
            'Attention to detail',
            'Interest in design and aesthetics'
          ],
          benefits: [
            'Creative retail skills',
            'Visual design expertise',
            'Artistic career path',
            'High demand in retail'
          ],
          isOpen: true,
          availableSpots: 15,
          totalSpots: 25
        },
        {
          id: 8,
          title: 'National Certificate: Wholesale and Retail Buying Planning',
          code: '59299',
          nqfLevel: 5,
          credits: 120,
          duration: '18 months',
          startDate: new Date('2025-04-01'),
          applicationDeadline: new Date('2025-02-28'),
          category: 'Business Administration',
          location: 'Cape Town, Western Cape',
          provider: 'WRSETA Accredited Provider',
          description: 'Develop expertise in retail buying and planning. Learn inventory management, supplier relations, buying strategies, forecasting, and planning optimal stock levels for retail operations.',
          requirements: [
            'Grade 12 with Mathematics',
            'Analytical thinking',
            'Numeracy skills',
            'Understanding of retail operations'
          ],
          benefits: [
            'Buying and planning expertise',
            'Business analysis skills',
            'Supplier relationship management',
            'Strategic retail role'
          ],
          isOpen: true,
          availableSpots: 10,
          totalSpots: 20
        },
        {
          id: 9,
          title: 'General Education and Training Certificate: Wholesale and Retail',
          code: '71750',
          nqfLevel: 1,
          credits: 120,
          duration: '10 months',
          startDate: new Date('2025-02-15'),
          applicationDeadline: new Date('2025-01-30'),
          category: 'Business Administration',
          location: 'Various Locations',
          provider: 'WRSETA Accredited Provider',
          description: 'Entry-level qualification in wholesale and retail operations. Perfect for those new to retail or requiring basic education. Covers fundamental retail skills, customer service, and basic operations.',
          requirements: [
            'Basic literacy and numeracy',
            'Grade 9 or equivalent',
            'Willingness to learn',
            'No previous experience required'
          ],
          benefits: [
            'Foundation qualification',
            'Entry-level opportunities',
            'Career starter program',
            'Accessible to all'
          ],
          isOpen: true,
          availableSpots: 40,
          totalSpots: 60
        }
      ];

      this.learnerships = mockLearnerships;
      this.filteredLearnerships = [...this.learnerships];

      // Extract unique categories and NQF levels for filters
      this.categories = [...new Set(this.learnerships.map(l => l.category))].sort();
      this.nqfLevels = [...new Set(this.learnerships.map(l => l.nqfLevel))].sort((a, b) => a - b);

      this.loading = false;
    }, 800);
  }
}
