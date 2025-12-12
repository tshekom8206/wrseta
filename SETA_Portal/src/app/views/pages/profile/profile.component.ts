import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'profile.title' | translate }}</h1>
      <p class="page-subtitle">Manage your profile information</p>
    </div>
    <div class="row">
      <div class="col-lg-8">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">{{ 'profile.personalInfo' | translate }}</h5>
          </div>
          <div class="card-body">
            @if (user) {
              <div class="row mb-3">
                <label class="col-sm-3 col-form-label">Full Name</label>
                <div class="col-sm-9">
                  <input type="text" class="form-control" [value]="user.fullName" readonly>
                </div>
              </div>
              <div class="row mb-3">
                <label class="col-sm-3 col-form-label">Username</label>
                <div class="col-sm-9">
                  <input type="text" class="form-control" [value]="user.username" readonly>
                </div>
              </div>
              <div class="row mb-3">
                <label class="col-sm-3 col-form-label">Email</label>
                <div class="col-sm-9">
                  <input type="email" class="form-control" [value]="user.email" readonly>
                </div>
              </div>
              <div class="row mb-3">
                <label class="col-sm-3 col-form-label">Role</label>
                <div class="col-sm-9">
                  <span class="badge bg-primary">{{ user.role }}</span>
                </div>
              </div>
              <div class="row mb-3">
                <label class="col-sm-3 col-form-label">SETA</label>
                <div class="col-sm-9">
                  <input type="text" class="form-control" [value]="user.setaName" readonly>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class ProfileComponent {
  private readonly authService = inject(AuthService);

  get user() {
    return this.authService.currentUser;
  }
}
