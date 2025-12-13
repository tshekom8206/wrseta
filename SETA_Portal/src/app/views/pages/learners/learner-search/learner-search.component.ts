import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-learner-search',
  standalone: true,
  imports: [CommonModule, TranslateModule, PageHeaderComponent],
  template: `
    <app-page-header
      titleKey="learner.search"
      subtitle="Search for learners across the system"
      icon="search"
    ></app-page-header>
    <div class="card">
      <div class="card-body">
        <p class="text-muted text-center py-5">Learner search component - Coming soon</p>
      </div>
    </div>
  `
})
export class LearnerSearchComponent {}
