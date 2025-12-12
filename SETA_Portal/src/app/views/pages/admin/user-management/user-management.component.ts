import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NgbModal, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { User, UserRole } from '../../../../interfaces/user.interface';
import { AuthService } from '../../../../core/auth/auth.service';

interface UserWithActions extends User {
  editing?: boolean;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NgbModalModule,
    NgbPaginationModule
  ],
  template: `
    <div class="page-header d-flex justify-content-between align-items-center">
      <div>
        <h1 class="page-title">{{ 'admin.users' | translate }}</h1>
        <p class="page-subtitle">Manage system users and their roles</p>
      </div>
      <button class="btn btn-primary" (click)="openAddUserModal(addUserModal)">
        <i class="feather icon-user-plus me-2"></i>
        Add New User
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="row mb-4">
      <div class="col-md-3">
        <div class="card stat-card">
          <div class="card-body">
            <div class="d-flex justify-content-between">
              <div>
                <p class="text-muted mb-1">Total Users</p>
                <h3 class="mb-0">{{ totalUsers }}</h3>
              </div>
              <div class="stat-icon bg-primary-light">
                <i class="feather icon-users text-primary"></i>
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
                <p class="text-muted mb-1">Active Users</p>
                <h3 class="mb-0 text-success">{{ activeUsers }}</h3>
              </div>
              <div class="stat-icon bg-success-light">
                <i class="feather icon-user-check text-success"></i>
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
                <p class="text-muted mb-1">Admins</p>
                <h3 class="mb-0 text-info">{{ adminCount }}</h3>
              </div>
              <div class="stat-icon bg-info-light">
                <i class="feather icon-shield text-info"></i>
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
                <p class="text-muted mb-1">Inactive Users</p>
                <h3 class="mb-0 text-danger">{{ inactiveUsers }}</h3>
              </div>
              <div class="stat-icon bg-danger-light">
                <i class="feather icon-user-x text-danger"></i>
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
                placeholder="Search by name, email, username..."
                [(ngModel)]="searchTerm"
                (ngModelChange)="onSearchChange($event)">
            </div>
          </div>
          <div class="col-md-2">
            <label class="form-label">Role</label>
            <select class="form-select" [(ngModel)]="selectedRole" (ngModelChange)="applyFilters()">
              <option value="">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Staff">Staff</option>
              <option value="Learner">Learner</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label">Status</label>
            <select class="form-select" [(ngModel)]="selectedStatus" (ngModelChange)="applyFilters()">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label">SETA</label>
            <select class="form-select" [(ngModel)]="selectedSeta" (ngModelChange)="applyFilters()">
              <option value="">All SETAs</option>
              <option *ngFor="let seta of setas" [value]="seta.code">{{ seta.code }}</option>
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

    <!-- Users Table -->
    <div class="card">
      <div class="card-body">
        <div class="table-responsive" *ngIf="!loading; else loadingTemplate">
          <table class="table table-hover" *ngIf="filteredUsers.length > 0; else emptyTemplate">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>SETA</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of paginatedUsers">
                <td>
                  <div class="d-flex align-items-center">
                    <div class="avatar avatar-sm me-3" [style.background-color]="getAvatarColor(user.fullName)">
                      {{ getInitials(user.fullName) }}
                    </div>
                    <div>
                      <div class="fw-semibold">{{ user.fullName }}</div>
                      <small class="text-muted">&#64;{{ user.username }}</small>
                    </div>
                  </div>
                </td>
                <td>{{ user.email }}</td>
                <td>
                  <span class="badge" [ngClass]="getRoleBadgeClass(user.role)">
                    {{ user.role }}
                  </span>
                </td>
                <td>{{ user.setaCode }}</td>
                <td>
                  <span class="badge" [ngClass]="user.isActive ? 'bg-success' : 'bg-danger'">
                    {{ user.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td>{{ user.lastLogin ? (user.lastLogin | date:'medium') : 'Never' }}</td>
                <td>
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" (click)="openEditUserModal(editUserModal, user)" title="Edit">
                      <i class="feather icon-edit-2"></i>
                    </button>
                    <button
                      class="btn"
                      [ngClass]="user.isActive ? 'btn-outline-warning' : 'btn-outline-success'"
                      (click)="toggleUserStatus(user)"
                      [title]="user.isActive ? 'Deactivate' : 'Activate'">
                      <i class="feather" [ngClass]="user.isActive ? 'icon-user-x' : 'icon-user-check'"></i>
                    </button>
                    <button class="btn btn-outline-info" (click)="resetPassword(user)" title="Reset Password">
                      <i class="feather icon-key"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <ng-template #emptyTemplate>
            <div class="text-center py-5">
              <i class="feather icon-users text-muted" style="font-size: 48px;"></i>
              <p class="text-muted mt-3">No users found matching your criteria</p>
            </div>
          </ng-template>
        </div>

        <ng-template #loadingTemplate>
          <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="text-muted mt-3">Loading users...</p>
          </div>
        </ng-template>

        <!-- Pagination -->
        <div class="d-flex justify-content-between align-items-center mt-4" *ngIf="filteredUsers.length > 0">
          <div class="text-muted">
            Showing {{ startIndex + 1 }} to {{ endIndex }} of {{ filteredUsers.length }} users
          </div>
          <div class="d-flex align-items-center gap-3">
            <select class="form-select form-select-sm" style="width: auto;" [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange()">
              <option [value]="10">10 per page</option>
              <option [value]="25">25 per page</option>
              <option [value]="50">50 per page</option>
            </select>
            <ngb-pagination
              [collectionSize]="filteredUsers.length"
              [(page)]="currentPage"
              [pageSize]="pageSize"
              [maxSize]="5"
              [boundaryLinks]="true"
              (pageChange)="onPageChange()">
            </ngb-pagination>
          </div>
        </div>
      </div>
    </div>

    <!-- Add User Modal -->
    <ng-template #addUserModal let-modal>
      <div class="modal-header">
        <h5 class="modal-title">Add New User</h5>
        <button type="button" class="btn-close" (click)="modal.dismiss()"></button>
      </div>
      <form [formGroup]="userForm" (ngSubmit)="saveNewUser(modal)">
        <div class="modal-body">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Full Name <span class="text-danger">*</span></label>
              <input type="text" class="form-control" formControlName="fullName"
                [ngClass]="{'is-invalid': userForm.get('fullName')?.invalid && userForm.get('fullName')?.touched}">
              <div class="invalid-feedback">Full name is required</div>
            </div>
            <div class="col-md-6">
              <label class="form-label">Username <span class="text-danger">*</span></label>
              <input type="text" class="form-control" formControlName="username"
                [ngClass]="{'is-invalid': userForm.get('username')?.invalid && userForm.get('username')?.touched}">
              <div class="invalid-feedback">Username is required (min 3 characters)</div>
            </div>
            <div class="col-md-6">
              <label class="form-label">Email <span class="text-danger">*</span></label>
              <input type="email" class="form-control" formControlName="email"
                [ngClass]="{'is-invalid': userForm.get('email')?.invalid && userForm.get('email')?.touched}">
              <div class="invalid-feedback">Valid email is required</div>
            </div>
            <div class="col-md-6">
              <label class="form-label">Role <span class="text-danger">*</span></label>
              <select class="form-select" formControlName="role"
                [ngClass]="{'is-invalid': userForm.get('role')?.invalid && userForm.get('role')?.touched}">
                <option value="">Select Role</option>
                <option value="Admin">Admin</option>
                <option value="Staff">Staff</option>
                <option value="Learner">Learner</option>
              </select>
              <div class="invalid-feedback">Role is required</div>
            </div>
            <div class="col-md-6">
              <label class="form-label">SETA <span class="text-danger">*</span></label>
              <select class="form-select" formControlName="setaCode"
                [ngClass]="{'is-invalid': userForm.get('setaCode')?.invalid && userForm.get('setaCode')?.touched}">
                <option value="">Select SETA</option>
                <option *ngFor="let seta of setas" [value]="seta.code">{{ seta.code }} - {{ seta.name }}</option>
              </select>
              <div class="invalid-feedback">SETA is required</div>
            </div>
            <div class="col-md-6">
              <label class="form-label">Temporary Password <span class="text-danger">*</span></label>
              <div class="input-group">
                <input [type]="showPassword ? 'text' : 'password'" class="form-control" formControlName="password"
                  [ngClass]="{'is-invalid': userForm.get('password')?.invalid && userForm.get('password')?.touched}">
                <button type="button" class="btn btn-outline-secondary" (click)="showPassword = !showPassword">
                  <i class="feather" [ngClass]="showPassword ? 'icon-eye-off' : 'icon-eye'"></i>
                </button>
              </div>
              <div class="invalid-feedback d-block" *ngIf="userForm.get('password')?.invalid && userForm.get('password')?.touched">
                Password must be at least 8 characters
              </div>
              <button type="button" class="btn btn-sm btn-link p-0 mt-1" (click)="generatePassword()">
                Generate random password
              </button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="userForm.invalid || saving">
            <span *ngIf="saving" class="spinner-border spinner-border-sm me-2"></span>
            {{ saving ? 'Creating...' : 'Create User' }}
          </button>
        </div>
      </form>
    </ng-template>

    <!-- Edit User Modal -->
    <ng-template #editUserModal let-modal>
      <div class="modal-header">
        <h5 class="modal-title">Edit User</h5>
        <button type="button" class="btn-close" (click)="modal.dismiss()"></button>
      </div>
      <form [formGroup]="editForm" (ngSubmit)="updateUser(modal)">
        <div class="modal-body">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Full Name <span class="text-danger">*</span></label>
              <input type="text" class="form-control" formControlName="fullName"
                [ngClass]="{'is-invalid': editForm.get('fullName')?.invalid && editForm.get('fullName')?.touched}">
            </div>
            <div class="col-md-6">
              <label class="form-label">Username</label>
              <input type="text" class="form-control" formControlName="username" readonly>
              <small class="text-muted">Username cannot be changed</small>
            </div>
            <div class="col-md-6">
              <label class="form-label">Email <span class="text-danger">*</span></label>
              <input type="email" class="form-control" formControlName="email"
                [ngClass]="{'is-invalid': editForm.get('email')?.invalid && editForm.get('email')?.touched}">
            </div>
            <div class="col-md-6">
              <label class="form-label">Role <span class="text-danger">*</span></label>
              <select class="form-select" formControlName="role">
                <option value="Admin">Admin</option>
                <option value="Staff">Staff</option>
                <option value="Learner">Learner</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label">SETA</label>
              <input type="text" class="form-control" [value]="selectedUser?.setaCode" readonly>
              <small class="text-muted">SETA cannot be changed</small>
            </div>
            <div class="col-md-6">
              <label class="form-label">Status</label>
              <div class="form-check form-switch mt-2">
                <input class="form-check-input" type="checkbox" formControlName="isActive" id="userStatus">
                <label class="form-check-label" for="userStatus">
                  {{ editForm.get('isActive')?.value ? 'Active' : 'Inactive' }}
                </label>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="modal.dismiss()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="editForm.invalid || saving">
            <span *ngIf="saving" class="spinner-border spinner-border-sm me-2"></span>
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </form>
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
    .bg-danger-light { background-color: rgba(220, 53, 69, 0.1); }
    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 14px;
    }
    .avatar-sm {
      width: 36px;
      height: 36px;
    }
    .table th {
      font-weight: 600;
      color: #6c757d;
      border-top: none;
    }
    .badge {
      font-weight: 500;
    }
    .btn-group-sm .btn {
      padding: 0.25rem 0.5rem;
    }
  `]
})
export class UserManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  users: UserWithActions[] = [];
  filteredUsers: UserWithActions[] = [];
  paginatedUsers: UserWithActions[] = [];

  loading = false;
  saving = false;

  // Pagination
  currentPage = 1;
  pageSize = 10;

  // Filters
  searchTerm = '';
  selectedRole = '';
  selectedStatus = '';
  selectedSeta = '';

  // Stats
  totalUsers = 0;
  activeUsers = 0;
  adminCount = 0;
  inactiveUsers = 0;

  // Forms
  userForm!: FormGroup;
  editForm!: FormGroup;
  selectedUser: User | null = null;
  showPassword = false;

  // SETA list
  setas = [
    { code: 'WRSETA', name: 'Wholesale and Retail SETA' },
    { code: 'MICT', name: 'Media, Information and Communication Technologies' },
    { code: 'MERSETA', name: 'Manufacturing, Engineering and Related Services' },
    { code: 'BANKSETA', name: 'Banking Sector Education and Training Authority' },
    { code: 'FASSET', name: 'Financial and Accounting Services' },
    { code: 'HWSETA', name: 'Health and Welfare SETA' },
    { code: 'ETDP', name: 'Education, Training and Development Practices' },
    { code: 'CETA', name: 'Construction Education and Training Authority' },
    { code: 'CATHSSETA', name: 'Culture, Arts, Tourism, Hospitality and Sport' },
    { code: 'AGRISETA', name: 'Agriculture Sector Education and Training Authority' }
  ];

  // Mock users data
  private mockUsers: UserWithActions[] = [
    { id: 1, username: 'admin.wrseta', email: 'admin@wrseta.org.za', fullName: 'John Administrator', role: UserRole.Admin, setaId: 1, setaCode: 'WRSETA', setaName: 'Wholesale and Retail SETA', isActive: true, createdAt: new Date('2024-01-15'), lastLogin: new Date('2025-01-10 08:30:00') },
    { id: 2, username: 'sarah.smith', email: 'sarah.smith@wrseta.org.za', fullName: 'Sarah Smith', role: UserRole.Staff, setaId: 1, setaCode: 'WRSETA', setaName: 'Wholesale and Retail SETA', isActive: true, createdAt: new Date('2024-02-20'), lastLogin: new Date('2025-01-09 14:22:00') },
    { id: 3, username: 'thabo.mokoena', email: 'thabo.mokoena@wrseta.org.za', fullName: 'Thabo Mokoena', role: UserRole.Staff, setaId: 1, setaCode: 'WRSETA', setaName: 'Wholesale and Retail SETA', isActive: true, createdAt: new Date('2024-03-10'), lastLogin: new Date('2025-01-08 09:45:00') },
    { id: 4, username: 'learner001', email: 'learner001@gmail.com', fullName: 'Sipho Ndlovu', role: UserRole.Learner, setaId: 1, setaCode: 'WRSETA', setaName: 'Wholesale and Retail SETA', isActive: true, createdAt: new Date('2024-04-05'), lastLogin: new Date('2025-01-07 11:30:00') },
    { id: 5, username: 'admin.mict', email: 'admin@mict.org.za', fullName: 'Mary Johnson', role: UserRole.Admin, setaId: 2, setaCode: 'MICT', setaName: 'MICT SETA', isActive: true, createdAt: new Date('2024-01-20'), lastLogin: new Date('2025-01-10 07:15:00') },
    { id: 6, username: 'peter.van', email: 'peter.van@mict.org.za', fullName: 'Peter van der Berg', role: UserRole.Staff, setaId: 2, setaCode: 'MICT', setaName: 'MICT SETA', isActive: true, createdAt: new Date('2024-02-25'), lastLogin: new Date('2025-01-09 16:00:00') },
    { id: 7, username: 'nomsa.dlamini', email: 'nomsa.dlamini@merseta.org.za', fullName: 'Nomsa Dlamini', role: UserRole.Admin, setaId: 3, setaCode: 'MERSETA', setaName: 'MERSETA', isActive: true, createdAt: new Date('2024-01-25'), lastLogin: new Date('2025-01-10 10:00:00') },
    { id: 8, username: 'david.williams', email: 'david.williams@merseta.org.za', fullName: 'David Williams', role: UserRole.Staff, setaId: 3, setaCode: 'MERSETA', setaName: 'MERSETA', isActive: false, createdAt: new Date('2024-03-15'), lastLogin: new Date('2024-12-15 13:45:00') },
    { id: 9, username: 'learner002', email: 'learner002@yahoo.com', fullName: 'Zanele Mthembu', role: UserRole.Learner, setaId: 1, setaCode: 'WRSETA', setaName: 'Wholesale and Retail SETA', isActive: true, createdAt: new Date('2024-05-10'), lastLogin: new Date('2025-01-06 08:20:00') },
    { id: 10, username: 'james.brown', email: 'james.brown@bankseta.org.za', fullName: 'James Brown', role: UserRole.Admin, setaId: 4, setaCode: 'BANKSETA', setaName: 'BANKSETA', isActive: true, createdAt: new Date('2024-02-01'), lastLogin: new Date('2025-01-10 09:30:00') },
    { id: 11, username: 'lindiwe.khumalo', email: 'lindiwe.khumalo@bankseta.org.za', fullName: 'Lindiwe Khumalo', role: UserRole.Staff, setaId: 4, setaCode: 'BANKSETA', setaName: 'BANKSETA', isActive: true, createdAt: new Date('2024-03-20'), lastLogin: new Date('2025-01-09 15:10:00') },
    { id: 12, username: 'mpho.molefe', email: 'mpho.molefe@fasset.org.za', fullName: 'Mpho Molefe', role: UserRole.Staff, setaId: 5, setaCode: 'FASSET', setaName: 'FASSET', isActive: false, createdAt: new Date('2024-04-01'), lastLogin: new Date('2024-11-20 10:00:00') },
    { id: 13, username: 'susan.meyer', email: 'susan.meyer@hwseta.org.za', fullName: 'Susan Meyer', role: UserRole.Admin, setaId: 6, setaCode: 'HWSETA', setaName: 'HWSETA', isActive: true, createdAt: new Date('2024-01-30'), lastLogin: new Date('2025-01-10 08:00:00') },
    { id: 14, username: 'bongani.zulu', email: 'bongani.zulu@etdp.org.za', fullName: 'Bongani Zulu', role: UserRole.Staff, setaId: 7, setaCode: 'ETDP', setaName: 'ETDP SETA', isActive: true, createdAt: new Date('2024-02-28'), lastLogin: new Date('2025-01-08 14:30:00') },
    { id: 15, username: 'learner003', email: 'learner003@outlook.com', fullName: 'Themba Nkosi', role: UserRole.Learner, setaId: 2, setaCode: 'MICT', setaName: 'MICT SETA', isActive: true, createdAt: new Date('2024-06-15'), lastLogin: new Date('2025-01-05 12:00:00') },
    { id: 16, username: 'old.user', email: 'old.user@wrseta.org.za', fullName: 'Old Inactive User', role: UserRole.Staff, setaId: 1, setaCode: 'WRSETA', setaName: 'Wholesale and Retail SETA', isActive: false, createdAt: new Date('2023-06-01'), lastLogin: new Date('2023-12-01 10:00:00') },
  ];

  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal,
    private authService: AuthService
  ) {
    this.initForms();
  }

  ngOnInit(): void {
    this.loadUsers();
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForms(): void {
    this.userForm = this.fb.group({
      fullName: ['', [Validators.required]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['', [Validators.required]],
      setaCode: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });

    this.editForm = this.fb.group({
      fullName: ['', [Validators.required]],
      username: [''],
      email: ['', [Validators.required, Validators.email]],
      role: ['', [Validators.required]],
      isActive: [true]
    });
  }

  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFilters();
    });
  }

  loadUsers(): void {
    this.loading = true;
    // Simulate API call
    setTimeout(() => {
      this.users = [...this.mockUsers];
      this.calculateStats();
      this.applyFilters();
      this.loading = false;
    }, 500);
  }

  private calculateStats(): void {
    this.totalUsers = this.users.length;
    this.activeUsers = this.users.filter(u => u.isActive).length;
    this.inactiveUsers = this.users.filter(u => !u.isActive).length;
    this.adminCount = this.users.filter(u => u.role === UserRole.Admin).length;
  }

  onSearchChange(term: string): void {
    this.searchSubject.next(term);
  }

  applyFilters(): void {
    let filtered = [...this.users];

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        u.fullName.toLowerCase().includes(term) ||
        u.username.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
      );
    }

    // Role filter
    if (this.selectedRole) {
      filtered = filtered.filter(u => u.role === this.selectedRole);
    }

    // Status filter
    if (this.selectedStatus) {
      const isActive = this.selectedStatus === 'active';
      filtered = filtered.filter(u => u.isActive === isActive);
    }

    // SETA filter
    if (this.selectedSeta) {
      filtered = filtered.filter(u => u.setaCode === this.selectedSeta);
    }

    this.filteredUsers = filtered;
    this.currentPage = 1;
    this.updatePaginatedUsers();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedRole = '';
    this.selectedStatus = '';
    this.selectedSeta = '';
    this.applyFilters();
  }

  updatePaginatedUsers(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedUsers = this.filteredUsers.slice(start, end);
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize;
  }

  get endIndex(): number {
    return Math.min(this.startIndex + this.pageSize, this.filteredUsers.length);
  }

  onPageChange(): void {
    this.updatePaginatedUsers();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePaginatedUsers();
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  getAvatarColor(name: string): string {
    const colors = ['#3498db', '#9b59b6', '#e74c3c', '#1abc9c', '#f39c12', '#2c3e50'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  getRoleBadgeClass(role: UserRole): string {
    switch (role) {
      case UserRole.Admin: return 'bg-danger';
      case UserRole.Staff: return 'bg-primary';
      case UserRole.Learner: return 'bg-info';
      default: return 'bg-secondary';
    }
  }

  openAddUserModal(modal: any): void {
    this.userForm.reset();
    this.showPassword = false;
    this.modalService.open(modal, { size: 'lg' });
  }

  openEditUserModal(modal: any, user: User): void {
    this.selectedUser = user;
    this.editForm.patchValue({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
    this.modalService.open(modal, { size: 'lg' });
  }

  generatePassword(): void {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.userForm.patchValue({ password });
    this.showPassword = true;
  }

  saveNewUser(modal: any): void {
    if (this.userForm.invalid) return;

    this.saving = true;
    const formValue = this.userForm.value;
    const seta = this.setas.find(s => s.code === formValue.setaCode);

    // Simulate API call
    setTimeout(() => {
      const newUser: UserWithActions = {
        id: this.users.length + 1,
        username: formValue.username,
        email: formValue.email,
        fullName: formValue.fullName,
        role: formValue.role as UserRole,
        setaId: this.setas.findIndex(s => s.code === formValue.setaCode) + 1,
        setaCode: formValue.setaCode,
        setaName: seta?.name || '',
        isActive: true,
        createdAt: new Date()
      };

      this.users.unshift(newUser);
      this.calculateStats();
      this.applyFilters();
      this.saving = false;
      modal.close();

      // Show success message
      alert(`User "${newUser.fullName}" created successfully!\nTemporary password: ${formValue.password}`);
    }, 1000);
  }

  updateUser(modal: any): void {
    if (this.editForm.invalid || !this.selectedUser) return;

    this.saving = true;
    const formValue = this.editForm.value;

    // Simulate API call
    setTimeout(() => {
      const index = this.users.findIndex(u => u.id === this.selectedUser!.id);
      if (index !== -1) {
        this.users[index] = {
          ...this.users[index],
          fullName: formValue.fullName,
          email: formValue.email,
          role: formValue.role as UserRole,
          isActive: formValue.isActive
        };
      }

      this.calculateStats();
      this.applyFilters();
      this.saving = false;
      modal.close();
      this.selectedUser = null;
    }, 1000);
  }

  toggleUserStatus(user: UserWithActions): void {
    const action = user.isActive ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${action} user "${user.fullName}"?`)) {
      user.isActive = !user.isActive;
      this.calculateStats();
    }
  }

  resetPassword(user: User): void {
    if (confirm(`Reset password for "${user.fullName}"? A new temporary password will be generated and sent to their email.`)) {
      // Simulate password reset
      setTimeout(() => {
        alert(`Password reset email sent to ${user.email}`);
      }, 500);
    }
  }
}
