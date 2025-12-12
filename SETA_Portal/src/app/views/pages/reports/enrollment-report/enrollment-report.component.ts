import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-enrollment-report',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'reports.enrollmentReport' | translate }}</h1>
      <p class="page-subtitle">Generate enrollment reports</p>
    </div>
    <div class="card">
      <div class="card-body">
        <p class="text-muted text-center py-5">Enrollment report component - Coming soon</p>
      </div>
    </div>
  `
})
export class EnrollmentReportComponent {}
