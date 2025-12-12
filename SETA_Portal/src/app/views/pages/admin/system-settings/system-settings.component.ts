import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'admin.systemSettings' | translate }}</h1>
      <p class="page-subtitle">Configure system settings</p>
    </div>
    <div class="card">
      <div class="card-body">
        <p class="text-muted text-center py-5">System settings component - Coming soon</p>
      </div>
    </div>
  `
})
export class SystemSettingsComponent {}
