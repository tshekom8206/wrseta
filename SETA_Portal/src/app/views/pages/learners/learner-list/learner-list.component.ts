import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { LearnerService, LearnerStats } from '../../../../core/services/learner.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import {
  Learner,
  LearnerStatus,
  VerificationStatus,
  LearnerSearchRequest
} from '../../../../interfaces/learner.interface';

@Component({
  selector: 'app-learner-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, PageHeaderComponent],
  template: `
    <div class="learner-list">
      <div class="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <app-page-header
          titleKey="learner.list"
          subtitleKey="learner.subtitle"
          icon="list"
        ></app-page-header>
        <a routerLink="/learners/enroll" class="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="23" y1="11" x2="17" y2="11"></line>
          </svg>
          {{ 'learner.enroll' | translate }}
        </a>
      </div>

      <!-- Stats Cards -->
      <div class="row g-3 mb-4">
        <div class="col-sm-6 col-lg-3">
          <div class="stat-card stat-card-primary">
            <div class="stat-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats?.total ?? 0 }}</div>
              <div class="stat-label">{{ 'learner.stats.total' | translate }}</div>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="stat-card stat-card-success">
            <div class="stat-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats?.active ?? 0 }}</div>
              <div class="stat-label">{{ 'learner.stats.active' | translate }}</div>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="stat-card stat-card-info">
            <div class="stat-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats?.completed ?? 0 }}</div>
              <div class="stat-label">{{ 'learner.stats.completed' | translate }}</div>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="stat-card stat-card-warning">
            <div class="stat-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats?.inactive ?? 0 }}</div>
              <div class="stat-label">{{ 'learner.stats.inactive' | translate }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters Card -->
      <div class="card mb-4">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label" for="searchInput">{{ 'common.search' | translate }}</label>
              <div class="input-group">
                <span class="input-group-text">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </span>
                <input
                  type="text"
                  id="searchInput"
                  class="form-control"
                  [(ngModel)]="searchTerm"
                  (ngModelChange)="onSearchChange($event)"
                  placeholder="{{ 'learner.searchPlaceholder' | translate }}"
                  aria-label="Search learners"
                />
                @if (searchTerm) {
                  <button class="btn btn-outline-secondary" type="button" (click)="clearSearch()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                }
              </div>
            </div>
            <div class="col-md-3">
              <label class="form-label" for="statusFilter">{{ 'learner.status' | translate }}</label>
              <select
                id="statusFilter"
                class="form-select"
                [(ngModel)]="statusFilter"
                (ngModelChange)="onFilterChange()"
              >
                <option value="">{{ 'common.all' | translate }}</option>
                <option value="Active">{{ 'learner.statusActive' | translate }}</option>
                <option value="Inactive">{{ 'learner.statusInactive' | translate }}</option>
                <option value="Completed">{{ 'learner.statusCompleted' | translate }}</option>
                <option value="Withdrawn">{{ 'learner.statusWithdrawn' | translate }}</option>
                <option value="Blocked">{{ 'learner.statusBlocked' | translate }}</option>
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label" for="verificationFilter">{{ 'verification.status' | translate }}</label>
              <select
                id="verificationFilter"
                class="form-select"
                [(ngModel)]="verificationFilter"
                (ngModelChange)="onFilterChange()"
              >
                <option value="">{{ 'common.all' | translate }}</option>
                <option value="Green">{{ 'verification.green' | translate }}</option>
                <option value="Amber">{{ 'verification.amber' | translate }}</option>
                <option value="Red">{{ 'verification.red' | translate }}</option>
                <option value="NotVerified">{{ 'verification.notVerified' | translate }}</option>
              </select>
            </div>
            <div class="col-md-2 d-flex align-items-end">
              <button class="btn btn-outline-secondary w-100" (click)="resetFilters()">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
                {{ 'common.reset' | translate }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Learners Table -->
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="card-title mb-0">
            {{ 'learner.registeredLearners' | translate }}
            @if (!loading) {
              <span class="badge bg-secondary ms-2">{{ totalCount }}</span>
            }
          </h5>
          <div class="d-flex gap-2">
            <select class="form-select form-select-sm" style="width: auto;" [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange()">
              <option [value]="10">10</option>
              <option [value]="25">25</option>
              <option [value]="50">50</option>
            </select>
          </div>
        </div>
        <div class="card-body p-0">
          @if (loading) {
            <div class="text-center py-5">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <p class="mt-2 text-muted">{{ 'common.loading' | translate }}</p>
            </div>
          } @else if (learners.length === 0) {
            <div class="text-center py-5">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-muted mb-3">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <h5 class="text-muted">{{ 'learner.noLearners' | translate }}</h5>
              <p class="text-muted mb-4">{{ 'learner.noLearnersDesc' | translate }}</p>
              <a routerLink="/learners/enroll" class="btn btn-primary">
                {{ 'learner.enrollFirst' | translate }}
              </a>
            </div>
          } @else {
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead>
                  <tr>
                    <th scope="col" class="sortable" (click)="sort('fullName')" [class.sorted]="sortBy === 'fullName'">
                      {{ 'learner.name' | translate }}
                      @if (sortBy === 'fullName') {
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          @if (sortDirection === 'asc') {
                            <polyline points="18 15 12 9 6 15"></polyline>
                          } @else {
                            <polyline points="6 9 12 15 18 9"></polyline>
                          }
                        </svg>
                      }
                    </th>
                    <th scope="col">{{ 'learner.idNumber' | translate }}</th>
                    <th scope="col" class="sortable" (click)="sort('enrollmentDate')" [class.sorted]="sortBy === 'enrollmentDate'">
                      {{ 'learner.enrollmentDate' | translate }}
                      @if (sortBy === 'enrollmentDate') {
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          @if (sortDirection === 'asc') {
                            <polyline points="18 15 12 9 6 15"></polyline>
                          } @else {
                            <polyline points="6 9 12 15 18 9"></polyline>
                          }
                        </svg>
                      }
                    </th>
                    <th scope="col">{{ 'learner.qualification' | translate }}</th>
                    <th scope="col">{{ 'learner.status' | translate }}</th>
                    <th scope="col">{{ 'verification.status' | translate }}</th>
                    <th scope="col" class="text-end">{{ 'common.actions' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (learner of learners; track learner.id) {
                    <tr>
                      <td>
                        <div class="d-flex align-items-center">
                          <div class="avatar avatar-sm me-2" [style.backgroundColor]="getAvatarColor(learner.fullName)">
                            {{ getInitials(learner.fullName) }}
                          </div>
                          <div>
                            <div class="fw-medium">{{ learner.fullName }}</div>
                            <small class="text-muted">{{ learner.email }}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <code class="id-number">{{ maskIdNumber(learner.idNumber) }}</code>
                      </td>
                      <td>{{ learner.enrollmentDate | date:'dd MMM yyyy' }}</td>
                      <td>
                        @if (learner.qualifications.length > 0) {
                          <span class="badge bg-light text-dark" [title]="learner.qualifications[0].name">
                            {{ learner.qualifications[0].code }}
                          </span>
                        } @else {
                          <span class="text-muted">-</span>
                        }
                      </td>
                      <td>
                        <span class="badge" [ngClass]="getStatusBadgeClass(learner.status)">
                          {{ learner.status }}
                        </span>
                      </td>
                      <td>
                        <span class="verification-badge" [ngClass]="'verification-' + learner.verificationStatus.toLowerCase()">
                          {{ learner.verificationStatus }}
                        </span>
                      </td>
                      <td class="text-end">
                        <div class="btn-group btn-group-sm">
                          <a [routerLink]="['/learners', learner.id]" class="btn btn-outline-primary" title="View Details">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </a>
                          <button class="btn btn-outline-secondary" title="Edit" (click)="editLearner(learner)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          @if (learner.isActive) {
                            <button class="btn btn-outline-danger" title="Deactivate" (click)="deactivateLearner(learner)">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                              </svg>
                            </button>
                          } @else {
                            <button class="btn btn-outline-success" title="Reactivate" (click)="reactivateLearner(learner)">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="1 4 1 10 7 10"></polyline>
                                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                              </svg>
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            @if (totalPages > 1) {
              <div class="card-footer d-flex justify-content-between align-items-center">
                <div class="text-muted">
                  {{ 'common.showing' | translate }} {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, totalCount) }} {{ 'common.of' | translate }} {{ totalCount }}
                </div>
                <nav aria-label="Learner list pagination">
                  <ul class="pagination pagination-sm mb-0">
                    <li class="page-item" [class.disabled]="currentPage === 1">
                      <button class="page-link" (click)="goToPage(1)" [disabled]="currentPage === 1" aria-label="First page">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="11 17 6 12 11 7"></polyline>
                          <polyline points="18 17 13 12 18 7"></polyline>
                        </svg>
                      </button>
                    </li>
                    <li class="page-item" [class.disabled]="currentPage === 1">
                      <button class="page-link" (click)="goToPage(currentPage - 1)" [disabled]="currentPage === 1" aria-label="Previous">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                      </button>
                    </li>
                    @for (page of getVisiblePages(); track page) {
                      <li class="page-item" [class.active]="page === currentPage">
                        <button class="page-link" (click)="goToPage(page)">{{ page }}</button>
                      </li>
                    }
                    <li class="page-item" [class.disabled]="currentPage === totalPages">
                      <button class="page-link" (click)="goToPage(currentPage + 1)" [disabled]="currentPage === totalPages" aria-label="Next">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </button>
                    </li>
                    <li class="page-item" [class.disabled]="currentPage === totalPages">
                      <button class="page-link" (click)="goToPage(totalPages)" [disabled]="currentPage === totalPages" aria-label="Last page">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="13 17 18 12 13 7"></polyline>
                          <polyline points="6 17 11 12 6 7"></polyline>
                        </svg>
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .learner-list {
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .stat-card {
      display: flex;
      align-items: center;
      padding: 1.25rem;
      border-radius: 0.5rem;
      background: var(--bs-white);
      border: 1px solid var(--bs-border-color);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 1rem;
    }

    .stat-card-primary .stat-icon { background: rgba(var(--bs-primary-rgb), 0.1); color: var(--bs-primary); }
    .stat-card-success .stat-icon { background: rgba(25, 135, 84, 0.1); color: #198754; }
    .stat-card-info .stat-icon { background: rgba(13, 202, 240, 0.1); color: #0dcaf0; }
    .stat-card-warning .stat-icon { background: rgba(255, 193, 7, 0.1); color: #ffc107; }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1.2;
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--bs-secondary);
    }

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

    .table {
      margin-bottom: 0;
    }

    .table th {
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--bs-secondary);
      border-bottom-width: 1px;
      padding: 0.75rem 1rem;
    }

    .table td {
      padding: 0.875rem 1rem;
      vertical-align: middle;
    }

    .sortable {
      cursor: pointer;
      user-select: none;

      &:hover {
        color: var(--bs-primary);
      }

      &.sorted {
        color: var(--bs-primary);
      }

      svg {
        margin-left: 0.25rem;
        vertical-align: middle;
      }
    }

    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.75rem;
      color: white;
    }

    .avatar-sm {
      width: 32px;
      height: 32px;
      font-size: 0.7rem;
    }

    .id-number {
      font-size: 0.875rem;
      background: var(--bs-light);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }

    .verification-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.75rem;
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

    .badge.bg-light {
      border: 1px solid var(--bs-border-color);
    }

    .btn-group-sm .btn {
      padding: 0.25rem 0.5rem;
    }

    .card-footer {
      background: transparent;
      border-top: 1px solid var(--bs-border-color);
      padding: 0.75rem 1.25rem;
    }

    .pagination {
      gap: 0.25rem;
    }

    .page-link {
      border-radius: 0.25rem;
      padding: 0.375rem 0.625rem;
    }
  `]
})
export class LearnerListComponent implements OnInit, OnDestroy {
  private readonly learnerService = inject(LearnerService);
  private readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject$ = new Subject<string>();

  // Expose Math for template
  Math = Math;

  // Data
  learners: Learner[] = [];
  stats: LearnerStats | null = null;

  // Loading state
  loading = true;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 0;

  // Filters
  searchTerm = '';
  statusFilter = '';
  verificationFilter = '';

  // Sorting
  sortBy = 'enrollmentDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  ngOnInit(): void {
    // Setup debounced search
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentPage = 1;
        this.loadLearners();
      });

    this.loadLearners();
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadLearners(): void {
    this.loading = true;

    const request: LearnerSearchRequest = {
      page: this.currentPage,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm || undefined,
      status: this.statusFilter as LearnerStatus || undefined,
      verificationStatus: this.verificationFilter as VerificationStatus || undefined,
      sortBy: this.sortBy,
      sortDirection: this.sortDirection
    };

    this.learnerService.searchLearners(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.learners = response.items;
          this.totalCount = response.totalCount;
          this.totalPages = response.totalPages;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading learners:', error);
          this.loading = false;
        }
      });
  }

  private loadStats(): void {
    this.learnerService.getLearnerStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.stats = stats;
        },
        error: (error) => {
          console.error('Error loading stats:', error);
        }
      });
  }

  onSearchChange(term: string): void {
    this.searchSubject$.next(term);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadLearners();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadLearners();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.verificationFilter = '';
    this.currentPage = 1;
    this.loadLearners();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadLearners();
  }

  sort(field: string): void {
    if (this.sortBy === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortDirection = 'asc';
    }
    this.loadLearners();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadLearners();
    }
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
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
    if (idNumber.length !== 13) return idNumber;
    return idNumber.substring(0, 6) + '*****' + idNumber.substring(11);
  }

  getStatusBadgeClass(status: LearnerStatus): string {
    const classes: Record<string, string> = {
      'Active': 'bg-success',
      'Inactive': 'bg-secondary',
      'Completed': 'bg-info',
      'Withdrawn': 'bg-warning text-dark',
      'Blocked': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
  }

  editLearner(learner: Learner): void {
    // Navigate to edit page
    console.log('Edit learner:', learner.id);
  }

  deactivateLearner(learner: Learner): void {
    if (confirm(`Are you sure you want to deactivate ${learner.fullName}?`)) {
      this.learnerService.deactivateLearner(learner.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadLearners();
            this.loadStats();
          },
          error: (error) => {
            console.error('Error deactivating learner:', error);
          }
        });
    }
  }

  reactivateLearner(learner: Learner): void {
    if (confirm(`Are you sure you want to reactivate ${learner.fullName}?`)) {
      this.learnerService.reactivateLearner(learner.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadLearners();
            this.loadStats();
          },
          error: (error) => {
            console.error('Error reactivating learner:', error);
          }
        });
    }
  }
}
