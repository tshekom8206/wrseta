import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { UserRole } from '../../interfaces/user.interface';

export function roleGuard(allowedRoles: UserRole[]): CanActivateFn {
  return (route: ActivatedRouteSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Check if user is authenticated first
    if (!authService.isAuthenticated) {
      router.navigate(['/auth/login']);
      return false;
    }

    // Check if user has required role
    if (authService.hasRole(allowedRoles)) {
      return true;
    }

    // User doesn't have permission
    router.navigate(['/error/403']);
    return false;
  };
}

// Predefined guards for common role combinations
export const adminGuard: CanActivateFn = roleGuard([UserRole.Admin]);

export const staffGuard: CanActivateFn = roleGuard([UserRole.Admin, UserRole.Staff]);

export const learnerGuard: CanActivateFn = roleGuard([UserRole.Learner]);

export const adminOrStaffGuard: CanActivateFn = roleGuard([UserRole.Admin, UserRole.Staff]);
