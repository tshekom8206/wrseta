import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-learner-search',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'learner.search' | translate }}</h1>
      <p class="page-subtitle">Search for learners across the system</p>
    </div>
    <div class="card">
      <div class="card-body">
        <p class="text-muted text-center py-5">Learner search component - Coming soon</p>
      </div>
    </div>
  `
})
export class LearnerSearchComponent {}
