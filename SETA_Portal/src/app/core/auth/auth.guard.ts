import { inject } from '@angular/core';
import { Router, CanActivateFn, CanActivateChildFn } from '@angular/router';
import { AuthService } from './auth.service';
import { UserRole } from '../../interfaces/user.interface';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated) {
    return true;
  }

  // Store the attempted URL for redirecting after login
  router.navigate(['/auth/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};

export const authChildGuard: CanActivateChildFn = (route, state) => {
  return authGuard(route, state);
};

export const publicGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated) {
    return true;
  }

  // Already logged in, redirect based on user role
  const user = authService.currentUser;
  if (user?.role === UserRole.Learner) {
    router.navigate(['/app/my-portal/status']);
  } else if (user?.role === UserRole.Admin || user?.role === UserRole.Staff) {
    router.navigate(['/app/dashboard']);
  } else {
    // Fallback to dashboard for any other role
    router.navigate(['/app/dashboard']);
  }
  return false;
};

// Guard to redirect to role-appropriate default page
export const roleBasedRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated) {
    router.navigate(['/auth/login']);
    return false;
  }

  const user = authService.currentUser;
  if (user?.role === UserRole.Learner) {
    router.navigate(['/app/my-portal/status']);
  } else if (user?.role === UserRole.Admin || user?.role === UserRole.Staff) {
    router.navigate(['/app/dashboard']);
  } else {
    // Fallback to dashboard for any other role
    router.navigate(['/app/dashboard']);
  }
  return false;
};
