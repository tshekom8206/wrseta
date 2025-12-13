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
    const user = this.authService.currentUser;
    if (user?.role === UserRole.Learner) {
      this.router.navigate(['/app/my-portal/status']);
    } else {
      this.router.navigate(['/app/dashboard']);
    }
  }
}

