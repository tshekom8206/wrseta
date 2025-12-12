import { Routes } from '@angular/router';
import { authGuard, authChildGuard, publicGuard } from './core/auth/auth.guard';
import { adminGuard, staffGuard, learnerGuard, adminOrStaffGuard } from './core/auth/role.guard';

export const routes: Routes = [
  // Public Routes (Auth)
  {
    path: 'auth',
    canActivate: [publicGuard],
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./views/pages/auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./views/pages/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  },

  // Protected Routes - Main Layout
  {
    path: '',
    loadComponent: () =>
      import('./views/layout/base/base.component').then(m => m.BaseComponent),
    canActivate: [authGuard],
    canActivateChild: [authChildGuard],
    children: [
      // Dashboard
      {
        path: 'dashboard',
        canActivate: [adminOrStaffGuard],
        loadComponent: () =>
          import('./views/pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },

      // Verification Module
      {
        path: 'verification',
        canActivate: [adminOrStaffGuard],
        children: [
          {
            path: 'single',
            loadComponent: () =>
              import('./views/pages/verification/single-verify/single-verify.component').then(m => m.SingleVerifyComponent)
          },
          {
            path: 'batch',
            loadComponent: () =>
              import('./views/pages/verification/batch-verify/batch-verify.component').then(m => m.BatchVerifyComponent)
          },
          {
            path: 'history',
            loadComponent: () =>
              import('./views/pages/verification/verification-history/verification-history.component').then(m => m.VerificationHistoryComponent)
          },
          {
            path: '',
            redirectTo: 'single',
            pathMatch: 'full'
          }
        ]
      },

      // Learners Module
      {
        path: 'learners',
        canActivate: [adminOrStaffGuard],
        children: [
          {
            path: 'list',
            loadComponent: () =>
              import('./views/pages/learners/learner-list/learner-list.component').then(m => m.LearnerListComponent)
          },
          {
            path: 'enroll',
            loadComponent: () =>
              import('./views/pages/learners/learner-enroll/learner-enroll.component').then(m => m.LearnerEnrollComponent)
          },
          {
            path: 'search',
            loadComponent: () =>
              import('./views/pages/learners/learner-search/learner-search.component').then(m => m.LearnerSearchComponent)
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./views/pages/learners/learner-detail/learner-detail.component').then(m => m.LearnerDetailComponent)
          },
          {
            path: '',
            redirectTo: 'list',
            pathMatch: 'full'
          }
        ]
      },

      // Reports Module
      {
        path: 'reports',
        canActivate: [adminOrStaffGuard],
        children: [
          {
            path: 'audit',
            loadComponent: () =>
              import('./views/pages/reports/audit-log/audit-log.component').then(m => m.AuditLogComponent)
          },
          {
            path: 'verification',
            loadComponent: () =>
              import('./views/pages/reports/verification-report/verification-report.component').then(m => m.VerificationReportComponent)
          },
          {
            path: 'enrollment',
            loadComponent: () =>
              import('./views/pages/reports/enrollment-report/enrollment-report.component').then(m => m.EnrollmentReportComponent)
          },
          {
            path: '',
            redirectTo: 'verification',
            pathMatch: 'full'
          }
        ]
      },

      // Admin Module
      {
        path: 'admin',
        canActivate: [adminGuard],
        children: [
          {
            path: 'users',
            loadComponent: () =>
              import('./views/pages/admin/user-management/user-management.component').then(m => m.UserManagementComponent)
          },
          {
            path: 'setas',
            loadComponent: () =>
              import('./views/pages/admin/seta-management/seta-management.component').then(m => m.SetaManagementComponent)
          },
          {
            path: 'settings',
            loadComponent: () =>
              import('./views/pages/admin/system-settings/system-settings.component').then(m => m.SystemSettingsComponent)
          },
          {
            path: '',
            redirectTo: 'users',
            pathMatch: 'full'
          }
        ]
      },

      // Learner Portal (for Learner role)
      {
        path: 'my-portal',
        canActivate: [learnerGuard],
        children: [
          {
            path: 'status',
            loadComponent: () =>
              import('./views/pages/learner-portal/my-status/my-status.component').then(m => m.MyStatusComponent)
          },
          {
            path: 'certificates',
            loadComponent: () =>
              import('./views/pages/learner-portal/my-certificates/my-certificates.component').then(m => m.MyCertificatesComponent)
          },
          {
            path: '',
            redirectTo: 'status',
            pathMatch: 'full'
          }
        ]
      },

      // Profile (all authenticated users)
      {
        path: 'profile',
        loadComponent: () =>
          import('./views/pages/profile/profile.component').then(m => m.ProfileComponent)
      },

      // Default redirect
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },

  // Error Pages
  {
    path: 'error/:type',
    loadComponent: () =>
      import('./views/pages/error/error.component').then(m => m.ErrorComponent)
  },

  // Wildcard - 404
  {
    path: '**',
    redirectTo: 'error/404'
  }
];
