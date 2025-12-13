import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NgbModal, NgbModalModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IconService } from '../../../../core/services/icon.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

interface Seta {
  id: number;
  code: string;
  name: string;
  description: string;
  logo: string;
  colors: {
    primary: string;
    primaryDark: string;
    secondary: string;
    accent: string;
  };
  contactEmail: string;
  contactPhone: string;
  website: string;
  address: string;
  isActive: boolean;
  totalLearners: number;
  totalUsers: number;
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-seta-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NgbModalModule,
    NgbNavModule,
    PageHeaderComponent
  ],
  template: `
    <app-page-header
      title="SETA Management"
      subtitle="Manage SETA configurations and branding"
      icon="briefcase"
    ></app-page-header>

    <!-- Stats Overview -->
    <div class="row g-3 mb-4">
      <div class="col-sm-6 col-lg-3">
        <div class="stat-card stat-card-primary">
          <div class="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ setas.length }}</div>
            <div class="stat-label">Total SETAs</div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-3">
        <div class="stat-card stat-card-success">
          <div class="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ activeSetas }}</div>
            <div class="stat-label">Active SETAs</div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-3">
        <div class="stat-card stat-card-info">
          <div class="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ totalLearners | number }}</div>
            <div class="stat-label">Total Learners</div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 col-lg-3">
        <div class="stat-card stat-card-warning">
          <div class="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ totalUsers | number }}</div>
            <div class="stat-label">Total Users</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Search -->
    <div class="card mb-4">
      <div class="card-body">
        <div class="row">
          <div class="col-md-6">
            <div class="input-group">
              <span class="input-group-text">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                type="text"
                class="form-control"
                placeholder="Search SETAs..."
                [(ngModel)]="searchTerm"
                (ngModelChange)="filterSetas()">
            </div>
          </div>
          <div class="col-md-3">
            <select class="form-select" [(ngModel)]="statusFilter" (ngModelChange)="filterSetas()">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- SETA Cards Grid -->
    <div class="row" *ngIf="!loading; else loadingTemplate">
      <div class="col-lg-4 col-md-6 mb-4" *ngFor="let seta of filteredSetas">
        <div class="card seta-card h-100">
          <div class="card-header seta-header" [style.background-color]="seta.colors.primary">
            <div class="d-flex justify-content-between align-items-center">
              <div class="seta-logo-wrapper">
                <div class="seta-logo" [style.background-color]="'white'">
                  <span class="seta-logo-text" [style.color]="seta.colors.primary">
                    {{ seta.code.substring(0, 2) }}
                  </span>
                </div>
              </div>
              <span class="badge" [ngClass]="seta.isActive ? 'bg-light text-success' : 'bg-light text-danger'">
                {{ seta.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <div class="seta-header-content">
              <h5 class="text-white mb-1">{{ seta.code }}</h5>
              <p class="text-white-50 small mb-0" style="opacity: 0.9;">{{ seta.name }}</p>
            </div>
          </div>
          <div class="card-body">
            <div class="seta-stats mb-3">
              <div class="row text-center">
                <div class="col-6">
                  <div class="stat-value">{{ seta.totalLearners | number }}</div>
                  <div class="stat-label">Learners</div>
                </div>
                <div class="col-6">
                  <div class="stat-value">{{ seta.totalUsers | number }}</div>
                  <div class="stat-label">Users</div>
                </div>
              </div>
            </div>

            <div class="seta-info small">
              <div class="mb-2 d-flex align-items-center" *ngIf="seta.contactEmail">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted me-2 flex-shrink-0">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <a [href]="'mailto:' + seta.contactEmail" class="text-decoration-none">{{ seta.contactEmail }}</a>
              </div>
              <div class="mb-2 d-flex align-items-center" *ngIf="seta.contactPhone">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted me-2 flex-shrink-0">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span>{{ seta.contactPhone }}</span>
              </div>
              <div class="d-flex align-items-center" *ngIf="seta.website">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted me-2 flex-shrink-0">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                <a [href]="seta.website" target="_blank" class="text-decoration-none">{{ getDomain(seta.website) }}</a>
              </div>
            </div>

            <div class="color-preview mt-3">
              <small class="text-muted d-block mb-2">Brand Colors</small>
              <div class="d-flex gap-2">
                <div class="color-swatch" [style.background-color]="seta.colors.primary" title="Primary"></div>
                <div class="color-swatch" [style.background-color]="seta.colors.primaryDark" title="Primary Dark"></div>
                <div class="color-swatch" [style.background-color]="seta.colors.secondary" title="Secondary"></div>
                <div class="color-swatch" [style.background-color]="seta.colors.accent" title="Accent"></div>
              </div>
            </div>
          </div>
          <div class="card-footer bg-transparent">
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-primary flex-grow-1 d-flex align-items-center justify-content-center" (click)="openEditModal(editModal, seta)">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="me-1 flex-shrink-0">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
                <span>Edit</span>
              </button>
              <button class="btn btn-sm btn-outline-info d-flex align-items-center justify-content-center" (click)="openDetailsModal(detailsModal, seta)">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="me-1 flex-shrink-0">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span>View</span>
              </button>
              <button
                class="btn btn-sm"
                [ngClass]="seta.isActive ? 'btn-outline-warning' : 'btn-outline-success'"
                (click)="toggleSetaStatus(seta)">
                <i class="feather" [ngClass]="seta.isActive ? 'icon-pause' : 'icon-play'"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12" *ngIf="filteredSetas.length === 0">
        <div class="card">
          <div class="card-body text-center py-5">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-muted">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <p class="text-muted mt-3">No SETAs found matching your criteria</p>
          </div>
        </div>
      </div>
    </div>

    <ng-template #loadingTemplate>
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="text-muted mt-3">Loading SETAs...</p>
      </div>
    </ng-template>

    <!-- Edit Modal -->
    <ng-template #editModal let-modal>
      <div class="modal-header">
        <h5 class="modal-title">Edit SETA: {{ selectedSeta?.code }}</h5>
        <button type="button" class="btn-close" (click)="modal.dismiss()"></button>
      </div>
      <form [formGroup]="setaForm" (ngSubmit)="saveSeta(modal)">
        <div class="modal-body">
          <ul ngbNav #nav="ngbNav" [(activeId)]="activeTab" class="nav-tabs mb-3">
            <li [ngbNavItem]="1">
              <button ngbNavLink>General</button>
              <ng-template ngbNavContent>
                <div class="row g-3">
                  <div class="col-md-4">
                    <label class="form-label">SETA Code</label>
                    <input type="text" class="form-control" formControlName="code" readonly>
                  </div>
                  <div class="col-md-8">
                    <label class="form-label">Full Name</label>
                    <input type="text" class="form-control" formControlName="name">
                  </div>
                  <div class="col-12">
                    <label class="form-label">Description</label>
                    <textarea class="form-control" rows="3" formControlName="description"></textarea>
                  </div>
                </div>
              </ng-template>
            </li>
            <li [ngbNavItem]="2">
              <button ngbNavLink>Contact</button>
              <ng-template ngbNavContent>
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-control" formControlName="contactEmail">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Phone</label>
                    <input type="tel" class="form-control" formControlName="contactPhone">
                  </div>
                  <div class="col-12">
                    <label class="form-label">Website</label>
                    <input type="url" class="form-control" formControlName="website">
                  </div>
                  <div class="col-12">
                    <label class="form-label">Address</label>
                    <textarea class="form-control" rows="2" formControlName="address"></textarea>
                  </div>
                </div>
              </ng-template>
            </li>
            <li [ngbNavItem]="3">
              <button ngbNavLink>Branding</button>
              <ng-template ngbNavContent>
                <div class="row g-3" formGroupName="colors">
                  <div class="col-md-6">
                    <label class="form-label">Primary Color</label>
                    <div class="input-group">
                      <input type="color" class="form-control form-control-color" formControlName="primary">
                      <input type="text" class="form-control" formControlName="primary">
                    </div>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Primary Dark</label>
                    <div class="input-group">
                      <input type="color" class="form-control form-control-color" formControlName="primaryDark">
                      <input type="text" class="form-control" formControlName="primaryDark">
                    </div>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Secondary Color</label>
                    <div class="input-group">
                      <input type="color" class="form-control form-control-color" formControlName="secondary">
                      <input type="text" class="form-control" formControlName="secondary">
                    </div>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Accent Color</label>
                    <div class="input-group">
                      <input type="color" class="form-control form-control-color" formControlName="accent">
                      <input type="text" class="form-control" formControlName="accent">
                    </div>
                  </div>
                  <div class="col-12">
                    <label class="form-label">Preview</label>
                    <div class="brand-preview p-3 rounded" [style.background-color]="setaForm.get('colors.primary')?.value">
                      <div class="text-white">
                        <strong>{{ setaForm.get('code')?.value }}</strong>
                        <p class="mb-0 small opacity-75">{{ setaForm.get('name')?.value }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ng-template>
            </li>
          </ul>
          <div [ngbNavOutlet]="nav"></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="saving">
            <span *ngIf="saving" class="spinner-border spinner-border-sm me-2"></span>
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </form>
    </ng-template>

    <!-- Details Modal -->
    <ng-template #detailsModal let-modal>
      <div class="modal-header" [style.background-color]="selectedSeta?.colors?.primary">
        <h5 class="modal-title text-white">{{ selectedSeta?.code }} Details</h5>
        <button type="button" class="btn-close btn-close-white" (click)="modal.dismiss()"></button>
      </div>
      <div class="modal-body" *ngIf="selectedSeta">
        <div class="row">
          <div class="col-md-6">
            <h6 class="text-muted mb-3">General Information</h6>
            <table class="table table-sm">
              <tr>
                <td class="text-muted">Code:</td>
                <td><strong>{{ selectedSeta.code }}</strong></td>
              </tr>
              <tr>
                <td class="text-muted">Name:</td>
                <td>{{ selectedSeta.name }}</td>
              </tr>
              <tr>
                <td class="text-muted">Status:</td>
                <td>
                  <span class="badge" [ngClass]="selectedSeta.isActive ? 'bg-success' : 'bg-danger'">
                    {{ selectedSeta.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
              </tr>
              <tr>
                <td class="text-muted">Learners:</td>
                <td>{{ selectedSeta.totalLearners | number }}</td>
              </tr>
              <tr>
                <td class="text-muted">Users:</td>
                <td>{{ selectedSeta.totalUsers | number }}</td>
              </tr>
            </table>
          </div>
          <div class="col-md-6">
            <h6 class="text-muted mb-3">Contact Information</h6>
            <table class="table table-sm">
              <tr>
                <td class="text-muted">Email:</td>
                <td>{{ selectedSeta.contactEmail || '-' }}</td>
              </tr>
              <tr>
                <td class="text-muted">Phone:</td>
                <td>{{ selectedSeta.contactPhone || '-' }}</td>
              </tr>
              <tr>
                <td class="text-muted">Website:</td>
                <td>
                  <a *ngIf="selectedSeta.website" [href]="selectedSeta.website" target="_blank">
                    {{ getDomain(selectedSeta.website) }}
                  </a>
                  <span *ngIf="!selectedSeta.website">-</span>
                </td>
              </tr>
            </table>
          </div>
        </div>
        <hr>
        <h6 class="text-muted mb-3">Description</h6>
        <p>{{ selectedSeta.description || 'No description provided.' }}</p>
        <hr>
        <h6 class="text-muted mb-3">Brand Colors</h6>
        <div class="d-flex gap-3">
          <div class="text-center">
            <div class="color-swatch-lg" [style.background-color]="selectedSeta.colors.primary"></div>
            <small class="text-muted">Primary</small>
          </div>
          <div class="text-center">
            <div class="color-swatch-lg" [style.background-color]="selectedSeta.colors.primaryDark"></div>
            <small class="text-muted">Dark</small>
          </div>
          <div class="text-center">
            <div class="color-swatch-lg" [style.background-color]="selectedSeta.colors.secondary"></div>
            <small class="text-muted">Secondary</small>
          </div>
          <div class="text-center">
            <div class="color-swatch-lg" [style.background-color]="selectedSeta.colors.accent"></div>
            <small class="text-muted">Accent</small>
          </div>
        </div>
        <hr>
        <div class="row text-muted small">
          <div class="col-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="me-1" style="vertical-align: middle; display: inline-block;">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Created: {{ selectedSeta.createdAt | date:'mediumDate' }}
          </div>
          <div class="col-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="me-1" style="vertical-align: middle; display: inline-block;">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Updated: {{ selectedSeta.updatedAt | date:'mediumDate' }}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">Close</button>
        <button type="button" class="btn btn-primary" (click)="modal.dismiss(); openEditModal(editModal, selectedSeta!)">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="me-2" style="vertical-align: middle;">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
          </svg>
          Edit
        </button>
      </div>
    </ng-template>
  `,
  styles: [`
    .stat-card {
      display: flex;
      align-items: center;
      padding: 1rem 1.25rem;
      border-radius: 0.5rem;
      background: var(--bs-white);
      border: 1px solid var(--bs-border-color);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .stat-icon {
      width: 40px;
      height: 40px;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 1rem;
      flex-shrink: 0;
    }
    .stat-icon svg {
      width: 20px;
      height: 20px;
    }
    .stat-card-primary .stat-icon { 
      background: rgba(0, 133, 80, 0.1);
      color: #008550;
    }
    .stat-card-success .stat-icon { 
      background: rgba(25, 135, 84, 0.1);
      color: #198754;
    }
    .stat-card-info .stat-icon { 
      background: rgba(13, 202, 240, 0.1);
      color: #0dcaf0;
    }
    .stat-card-warning .stat-icon { 
      background: rgba(255, 193, 7, 0.1);
      color: #ffc107;
    }
    .stat-content {
      flex: 1;
      min-width: 0;
    }
    .stat-value {
      font-size: 1.375rem;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 0.25rem;
    }
    .stat-label {
      font-size: 0.8125rem;
      color: var(--bs-secondary);
      font-weight: 500;
    }

    .seta-card {
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .seta-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }
    .seta-header {
      padding: 1.5rem;
      border-radius: 0.375rem 0.375rem 0 0;
      height: 160px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .seta-logo-wrapper {
      display: flex;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .seta-logo {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .seta-logo-text {
      font-size: 18px;
      font-weight: 700;
    }
    .seta-header-content {
      margin-top: 0;
      flex-shrink: 0;
    }
    .seta-header-content h5 {
      font-size: 1.25rem;
      font-weight: 600;
      line-height: 1.3;
      margin-bottom: 0.5rem;
    }
    .seta-header-content p {
      font-size: 0.8125rem;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      margin-bottom: 2rem;
    }
    .seta-info {
      display: flex;
      flex-direction: column;
    }
    .seta-info svg {
      flex-shrink: 0;
      display: block;
    }
    .seta-info a {
      color: inherit;
      text-decoration: none;
    }
    .seta-info a:hover {
      color: var(--seta-primary);
      text-decoration: underline;
    }
    .seta-stats {
      padding: 1rem 0;
      border-bottom: 1px solid #eee;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 600;
      color: #333;
    }
    .stat-label {
      font-size: 0.75rem;
      color: #888;
      text-transform: uppercase;
    }
    .color-swatch {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 2px solid white;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
    }
    .color-swatch-lg {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .form-control-color {
      width: 50px;
      padding: 0.25rem;
    }
    .brand-preview {
      transition: background-color 0.3s;
    }
    .nav-tabs .nav-link {
      color: #666;
    }
    .nav-tabs .nav-link.active {
      font-weight: 600;
    }
  `]
})
export class SetaManagementComponent implements OnInit, OnDestroy {
  private readonly iconService = inject(IconService);
  private readonly sanitizer = inject(DomSanitizer);
  private destroy$ = new Subject<void>();

  getSafeIcon(iconName: string): SafeHtml {
    const iconPath = this.iconService.getIconPath(iconName);
    return this.sanitizer.bypassSecurityTrustHtml(iconPath);
  }

  setas: Seta[] = [];
  filteredSetas: Seta[] = [];
  selectedSeta: Seta | null = null;

  loading = false;
  saving = false;

  searchTerm = '';
  statusFilter = '';

  activeSetas = 0;
  totalLearners = 0;
  totalUsers = 0;

  setaForm!: FormGroup;
  activeTab = 1;

  // Mock data for all 21 SETAs
  private mockSetas: Seta[] = [
    { id: 1, code: 'WRSETA', name: 'Wholesale and Retail SETA', description: 'The Wholesale and Retail Sector Education and Training Authority promotes skills development in the wholesale and retail sector.', logo: '', colors: { primary: '#008550', primaryDark: '#006640', secondary: '#4a90d9', accent: '#ff9800' }, contactEmail: 'info@wrseta.org.za', contactPhone: '+27 11 622 0800', website: 'https://www.wrseta.org.za', address: '87 Juta Street, Braamfontein, Johannesburg', isActive: true, totalLearners: 45230, totalUsers: 156, createdAt: new Date('2020-01-01'), updatedAt: new Date('2024-12-15') },
    { id: 2, code: 'MICT', name: 'Media, Information and Communication Technologies SETA', description: 'MICT SETA leads and facilitates the development of appropriately skilled people in the MICT sector.', logo: '', colors: { primary: '#2EA3F2', primaryDark: '#1a8fd4', secondary: '#6bc4f7', accent: '#ff6b35' }, contactEmail: 'info@mict.org.za', contactPhone: '+27 11 207 2600', website: 'https://www.mict.org.za', address: 'Block 2, Gallagher Estate, Midrand', isActive: true, totalLearners: 32150, totalUsers: 89, createdAt: new Date('2020-01-01'), updatedAt: new Date('2024-11-20') },
    { id: 3, code: 'MERSETA', name: 'Manufacturing, Engineering and Related Services SETA', description: 'merSETA facilitates skills development in the manufacturing, engineering and related services sector.', logo: '', colors: { primary: '#1a5276', primaryDark: '#123d57', secondary: '#5dade2', accent: '#f39c12' }, contactEmail: 'info@merseta.org.za', contactPhone: '+27 10 219 3000', website: 'https://www.merseta.org.za', address: '95 7th Avenue, Cnr Rustenburg Road, Melville', isActive: true, totalLearners: 67890, totalUsers: 234, createdAt: new Date('2020-01-01'), updatedAt: new Date('2024-12-01') },
    { id: 4, code: 'BANKSETA', name: 'Banking Sector Education and Training Authority', description: 'BANKSETA develops skills for the banking and microfinance industry.', logo: '', colors: { primary: '#1e3a5f', primaryDark: '#152a45', secondary: '#3498db', accent: '#27ae60' }, contactEmail: 'info@bankseta.org.za', contactPhone: '+27 11 805 9661', website: 'https://www.bankseta.org.za', address: '3rd Floor, Building 3, Waterfall Corporate Campus, Midrand', isActive: true, totalLearners: 28500, totalUsers: 67, createdAt: new Date('2020-01-01'), updatedAt: new Date('2024-10-30') },
    { id: 5, code: 'FASSET', name: 'Financial and Accounting Services SETA', description: 'FASSET serves the finance and accounting sector through skills development initiatives.', logo: '', colors: { primary: '#2c3e50', primaryDark: '#1a252f', secondary: '#8e44ad', accent: '#e74c3c' }, contactEmail: 'info@fasset.org.za', contactPhone: '+27 11 476 8570', website: 'https://www.fasset.org.za', address: '1st Floor, Cnr Grayston Drive and Rivonia Road, Morningside', isActive: true, totalLearners: 41200, totalUsers: 98, createdAt: new Date('2020-01-01'), updatedAt: new Date('2024-11-15') },
    { id: 6, code: 'HWSETA', name: 'Health and Welfare SETA', description: 'HWSETA develops skills for the health and social development sectors.', logo: '', colors: { primary: '#16a085', primaryDark: '#117a64', secondary: '#48c9b0', accent: '#e74c3c' }, contactEmail: 'info@hwseta.org.za', contactPhone: '+27 11 607 6900', website: 'https://www.hwseta.org.za', address: '17 Bradford Road, Bedfordview', isActive: true, totalLearners: 52340, totalUsers: 145, createdAt: new Date('2020-01-01'), updatedAt: new Date('2024-12-10') },
    { id: 7, code: 'ETDP', name: 'Education, Training and Development Practices SETA', description: 'ETDP SETA facilitates skills development in the education sector.', logo: '', colors: { primary: '#8e44ad', primaryDark: '#6c3483', secondary: '#bb8fce', accent: '#f1c40f' }, contactEmail: 'info@etdpseta.org.za', contactPhone: '+27 11 372 3300', website: 'https://www.etdpseta.org.za', address: '23 Sturdee Avenue, Rosebank', isActive: true, totalLearners: 38900, totalUsers: 112, createdAt: new Date('2020-01-01'), updatedAt: new Date('2024-11-05') },
    { id: 8, code: 'CETA', name: 'Construction Education and Training Authority', description: 'CETA promotes skills development in the construction industry.', logo: '', colors: { primary: '#d35400', primaryDark: '#a04000', secondary: '#f39c12', accent: '#2980b9' }, contactEmail: 'info@ceta.org.za', contactPhone: '+27 11 265 5900', website: 'https://www.ceta.org.za', address: 'Building 7, Thornhill Office Park, Midrand', isActive: true, totalLearners: 48760, totalUsers: 167, createdAt: new Date('2020-01-01'), updatedAt: new Date('2024-12-05') },
    { id: 9, code: 'CATHSSETA', name: 'Culture, Arts, Tourism, Hospitality and Sport SETA', description: 'CATHSSETA develops skills for the tourism, hospitality and creative industries.', logo: '', colors: { primary: '#c0392b', primaryDark: '#922b21', secondary: '#e74c3c', accent: '#3498db' }, contactEmail: 'info@cathsseta.org.za', contactPhone: '+27 11 217 0600', website: 'https://www.cathsseta.org.za', address: '1 Newtown Ave, Killarney', isActive: true, totalLearners: 29870, totalUsers: 89, createdAt: new Date('2020-01-01'), updatedAt: new Date('2024-10-20') },
    { id: 10, code: 'AGRISETA', name: 'Agriculture Sector Education and Training Authority', description: 'AgriSETA develops skills for the primary and secondary agricultural sectors.', logo: '', colors: { primary: '#27ae60', primaryDark: '#1e8449', secondary: '#58d68d', accent: '#f1c40f' }, contactEmail: 'info@agriseta.co.za', contactPhone: '+27 12 301 5600', website: 'https://www.agriseta.co.za', address: '529 Belvedere Street, Arcadia, Pretoria', isActive: true, totalLearners: 35600, totalUsers: 78, createdAt: new Date('2020-01-01'), updatedAt: new Date('2024-11-25') },
    { id: 11, code: 'CHIETA', name: 'Chemical Industries Education and Training Authority', description: 'CHIETA is responsible for skills development in the chemical industry.', logo: '', colors: { primary: '#2980b9', primaryDark: '#1f618d', secondary: '#5dade2', accent: '#e67e22' }, contactEmail: 'info@chieta.org.za', contactPhone: '+27 11 726 4026', website: 'https://www.chieta.org.za', address: '2 Clamart Road, Richmond', isActive: true, totalLearners: 22450, totalUsers: 56, createdAt: new Date('2020-01-01'), updatedAt: new Date('2024-10-15') },
    { id: 12, code: 'EWSETA', name: 'Energy and Water SETA', description: 'EWSETA facilitates skills development in the energy and water sectors.', logo: '', colors: { primary: '#0066cc', primaryDark: '#004d99', secondary: '#3399ff', accent: '#00cc66' }, contactEmail: 'info@ewseta.org.za', contactPhone: '+27 11 274 4700', website: 'https://www.ewseta.org.za', address: '27 Melrose Boulevard, Melrose Arch', isActive: true, totalLearners: 18900, totalUsers: 45, createdAt: new Date('2020-01-01'), updatedAt: new Date('2024-09-30') },
    { id: 13, code: 'FP&M', name: 'Fibre Processing and Manufacturing SETA', description: 'FP&M SETA covers the fibre processing, manufacturing, printing and packaging sectors.', logo: '', colors: { primary: '#6c3461', primaryDark: '#4a2443', secondary: '#9b59b6', accent: '#1abc9c' }, contactEmail: 'info@fpmseta.org.za', contactPhone: '+27 11 403 1700', website: 'https://www.fpmseta.org.za', address: '24 Johnson Road, Bedfordview', isActive: true, totalLearners: 15780, totalUsers: 42, createdAt: new Date('2020-01-01'), updatedAt: new Date('2024-08-20') },
    { id: 14, code: 'FOODBEV', name: 'Food and Beverages Manufacturing SETA', description: 'FoodBev SETA develops skills for the food and beverage manufacturing industry.', logo: '', colors: { primary: '#d4af37', primaryDark: '#b8972e', secondary: '#f4d03f', accent: '#2ecc71' }, contactEmail: 'info@foodbev.co.za', contactPhone: '+27 11 253 7300', website: 'https://www.foodbev.co.za', address: '13 Autumn Street, Rivonia', isActive: true, totalLearners: 27340, totalUsers: 64, createdAt: new Date('2020-01-01'), updatedAt: new Date('2024-11-10') },
    { id: 15, code: 'INSETA', name: 'Insurance Sector Education and Training Authority', description: 'INSETA is the SETA for the insurance and related services sector.', logo: '', colors: { primary: '#34495e', primaryDark: '#2c3e50', secondary: '#7f8c8d', accent: '#e74c3c' }, contactEmail: 'info@inseta.org.za', contactPhone: '+27 11 381 8900', website: 'https://www.inseta.org.za', address: '37 Empire Road, Parktown', isActive: true, totalLearners: 31200, totalUsers: 73, createdAt: new Date('2020-01-01'), updatedAt: new Date('2024-10-25') },
    { id: 16, code: 'LGSETA', name: 'Local Government SETA', description: 'LGSETA develops skills for the local government sector.', logo: '', colors: { primary: '#1a5276', primaryDark: '#154360', secondary: '#2980b9', accent: '#f39c12' }, contactEmail: 'info@lgseta.org.za', contactPhone: '+27 11 456 8579', website: 'https://www.lgseta.org.za', address: '47 Van Buuren Road, Bedfordview', isActive: true, totalLearners: 42100, totalUsers: 134, createdAt: new Date('2020-01-01'), updatedAt: new Date('2024-12-08') },
    { id: 17, code: 'MQA', name: 'Mining Qualifications Authority', description: 'MQA is the SETA for the mining and minerals sector.', logo: '', colors: { primary: '#7d6608', primaryDark: '#5d4b06', secondary: '#b7950b', accent: '#e74c3c' }, contactEmail: 'info@mqa.org.za', contactPhone: '+27 11 547 2600', website: 'https://www.mqa.org.za', address: '7 Anerley Road, Parktown', isActive: true, totalLearners: 56780, totalUsers: 189, createdAt: new Date('2020-01-01'), updatedAt: new Date('2024-11-30') },
    { id: 18, code: 'PSETA', name: 'Public Service Sector Education and Training Authority', description: 'PSETA coordinates skills development for the public service.', logo: '', colors: { primary: '#1a5276', primaryDark: '#154360', secondary: '#85c1e9', accent: '#28b463' }, contactEmail: 'info@pseta.org.za', contactPhone: '+27 12 423 5700', website: 'https://www.pseta.org.za', address: '353 Festival Street, Hatfield, Pretoria', isActive: true, totalLearners: 89450, totalUsers: 267, createdAt: new Date('2020-01-01'), updatedAt: new Date('2024-12-12') },
    { id: 19, code: 'SASSETA', name: 'Safety and Security SETA', description: 'SASSETA provides skills development for the safety and security sector.', logo: '', colors: { primary: '#1c2833', primaryDark: '#0d1318', secondary: '#566573', accent: '#c0392b' }, contactEmail: 'info@sasseta.org.za', contactPhone: '+27 11 087 5500', website: 'https://www.sasseta.org.za', address: '420 Witch-Hazel Avenue, Eco Glades 2', isActive: true, totalLearners: 38900, totalUsers: 98, createdAt: new Date('2020-01-01'), updatedAt: new Date('2024-10-18') },
    { id: 20, code: 'SERVICES', name: 'Services SETA', description: 'Services SETA covers labour recruitment, cleaning, security and other services.', logo: '', colors: { primary: '#5b2c6f', primaryDark: '#4a235a', secondary: '#8e44ad', accent: '#f1c40f' }, contactEmail: 'info@serviceseta.org.za', contactPhone: '+27 11 276 9600', website: 'https://www.serviceseta.org.za', address: '15 Sherborne Road, Parktown', isActive: true, totalLearners: 51200, totalUsers: 145, createdAt: new Date('2020-01-01'), updatedAt: new Date('2024-11-22') },
    { id: 21, code: 'TETA', name: 'Transport Education and Training Authority', description: 'TETA is responsible for skills development in the transport sector.', logo: '', colors: { primary: '#1e8449', primaryDark: '#186a3b', secondary: '#27ae60', accent: '#e67e22' }, contactEmail: 'info@teta.org.za', contactPhone: '+27 11 577 0000', website: 'https://www.teta.org.za', address: '6 Constantia Park, Constantia Kloof', isActive: true, totalLearners: 43670, totalUsers: 123, createdAt: new Date('2020-01-01'), updatedAt: new Date('2024-12-02') }
  ];

  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadSetas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.setaForm = this.fb.group({
      code: [''],
      name: ['', Validators.required],
      description: [''],
      contactEmail: ['', Validators.email],
      contactPhone: [''],
      website: [''],
      address: [''],
      colors: this.fb.group({
        primary: ['#008550'],
        primaryDark: ['#002244'],
        secondary: ['#4a90d9'],
        accent: ['#ff9800']
      })
    });
  }

  loadSetas(): void {
    this.loading = true;
    setTimeout(() => {
      this.setas = [...this.mockSetas];
      this.calculateStats();
      this.filterSetas();
      this.loading = false;
    }, 500);
  }

  private calculateStats(): void {
    this.activeSetas = this.setas.filter(s => s.isActive).length;
    this.totalLearners = this.setas.reduce((sum, s) => sum + s.totalLearners, 0);
    this.totalUsers = this.setas.reduce((sum, s) => sum + s.totalUsers, 0);
  }

  filterSetas(): void {
    let filtered = [...this.setas];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.code.toLowerCase().includes(term) ||
        s.name.toLowerCase().includes(term)
      );
    }

    if (this.statusFilter) {
      const isActive = this.statusFilter === 'active';
      filtered = filtered.filter(s => s.isActive === isActive);
    }

    this.filteredSetas = filtered;
  }

  getDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  openEditModal(modal: any, seta: Seta): void {
    this.selectedSeta = seta;
    this.activeTab = 1;
    this.setaForm.patchValue({
      code: seta.code,
      name: seta.name,
      description: seta.description,
      contactEmail: seta.contactEmail,
      contactPhone: seta.contactPhone,
      website: seta.website,
      address: seta.address,
      colors: {
        primary: seta.colors.primary,
        primaryDark: seta.colors.primaryDark,
        secondary: seta.colors.secondary,
        accent: seta.colors.accent
      }
    });
    this.modalService.open(modal, { size: 'lg' });
  }

  openDetailsModal(modal: any, seta: Seta): void {
    this.selectedSeta = seta;
    this.modalService.open(modal, { size: 'lg' });
  }

  saveSeta(modal: any): void {
    if (this.setaForm.invalid || !this.selectedSeta) return;

    this.saving = true;
    const formValue = this.setaForm.value;

    setTimeout(() => {
      const index = this.setas.findIndex(s => s.id === this.selectedSeta!.id);
      if (index !== -1) {
        this.setas[index] = {
          ...this.setas[index],
          name: formValue.name,
          description: formValue.description,
          contactEmail: formValue.contactEmail,
          contactPhone: formValue.contactPhone,
          website: formValue.website,
          address: formValue.address,
          colors: { ...formValue.colors },
          updatedAt: new Date()
        };
      }

      this.filterSetas();
      this.saving = false;
      modal.close();
      this.selectedSeta = null;
    }, 1000);
  }

  toggleSetaStatus(seta: Seta): void {
    const action = seta.isActive ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${action} "${seta.code}"?`)) {
      seta.isActive = !seta.isActive;
      seta.updatedAt = new Date();
      this.calculateStats();
    }
  }
}
