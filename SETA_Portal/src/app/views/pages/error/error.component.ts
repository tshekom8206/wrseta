import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-error',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="error-container">
      <div class="error-content">
        <h1 class="error-code">{{ errorCode }}</h1>
        <h2 class="error-title">{{ 'error.' + errorCode + '.title' | translate }}</h2>
        <p class="error-message text-muted">{{ 'error.' + errorCode + '.message' | translate }}</p>
        <div class="error-actions">
          <a routerLink="/app/dashboard" class="btn btn-primary me-2">
            {{ 'error.goHome' | translate }}
          </a>
          <button class="btn btn-outline-secondary" (click)="goBack()">
            {{ 'error.goBack' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .error-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background-color: var(--seta-bg-secondary);
    }

    .error-content {
      text-align: center;
      max-width: 500px;
    }

    .error-code {
      font-size: 8rem;
      font-weight: 700;
      color: var(--seta-primary);
      line-height: 1;
      margin-bottom: 1rem;
    }

    .error-title {
      font-size: 1.75rem;
      margin-bottom: 0.5rem;
    }

    .error-message {
      font-size: 1rem;
      margin-bottom: 2rem;
    }
  `]
})
export class ErrorComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  errorCode = '404';

  ngOnInit(): void {
    this.errorCode = this.route.snapshot.params['type'] || '404';
  }

  goBack(): void {
    window.history.back();
  }
}
