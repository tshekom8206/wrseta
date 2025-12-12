import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="forgot-password-container">
      <div class="card">
        <div class="card-body text-center p-5">
          <h2>Forgot Password</h2>
          <p class="text-muted">This feature is coming soon.</p>
          <a routerLink="/auth/login" class="btn btn-primary">
            Back to Login
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .forgot-password-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background-color: var(--seta-bg-secondary);
    }
    .card {
      max-width: 400px;
      width: 100%;
    }
  `]
})
export class ForgotPasswordComponent {}
