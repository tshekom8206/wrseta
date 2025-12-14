import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UserRole } from '../../interfaces/user.interface';

@Component({
  selector: 'app-role-redirect',
  standalone: true,
  template: ''
})
export class RoleRedirectComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    // Use setTimeout to ensure auth state is fully initialized
    setTimeout(() => {
      const user = this.authService.currentUser;
      if (!user) {
        // If no user, redirect to login
        this.router.navigate(['/auth/login']);
        return;
      }

      if (user.role === UserRole.Learner) {
        this.router.navigate(['/app/my-portal/status'], { replaceUrl: true });
      } else if (user.role === UserRole.Admin || user.role === UserRole.Staff) {
        this.router.navigate(['/app/dashboard'], { replaceUrl: true });
      } else {
        // Fallback to dashboard for any other role
        this.router.navigate(['/app/dashboard'], { replaceUrl: true });
      }
    }, 0);
  }
}

