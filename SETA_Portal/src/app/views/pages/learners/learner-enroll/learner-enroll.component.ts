import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import { LearnerService, QualificationOption } from '../../../../core/services/learner.service';
import { VerificationService } from '../../../../core/services/verification.service';
import { VerificationResponse } from '../../../../interfaces/verification.interface';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

type EnrollmentStep = 'verify' | 'details' | 'confirm';

@Component({
  selector: 'app-learner-enroll',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, TranslateModule, PageHeaderComponent],
  template: `
    <div class="learner-enroll">
      <app-page-header
        titleKey="learner.enroll"
        subtitleKey="learner.enrollSubtitle"
        icon="user-plus"
      >
        <a routerLink="/learners/list" class="btn btn-outline-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="me-2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
          {{ 'learner.list' | translate }}
        </a>
      </app-page-header>

      <!-- Progress Steps -->
      <div class="card mb-4">
        <div class="card-body py-4">
          <div class="steps">
            <div class="step" [class.active]="currentStep === 'verify'" [class.completed]="isStepCompleted('verify')">
              <div class="step-number">
                @if (isStepCompleted('verify')) {
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                } @else {
                  1
                }
              </div>
              <div class="step-label">{{ 'learner.steps.verify' | translate }}</div>
            </div>
            <div class="step-connector" [class.completed]="isStepCompleted('verify')"></div>
            <div class="step" [class.active]="currentStep === 'details'" [class.completed]="isStepCompleted('details')">
              <div class="step-number">
                @if (isStepCompleted('details')) {
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                } @else {
                  2
                }
              </div>
              <div class="step-label">{{ 'learner.steps.details' | translate }}</div>
            </div>
            <div class="step-connector" [class.completed]="isStepCompleted('details')"></div>
            <div class="step" [class.active]="currentStep === 'confirm'" [class.completed]="isStepCompleted('confirm')">
              <div class="step-number">
                @if (isStepCompleted('confirm')) {
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                } @else {
                  3
                }
              </div>
              <div class="step-label">{{ 'learner.steps.confirm' | translate }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 1: ID Verification -->
      @if (currentStep === 'verify') {
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              {{ 'learner.verifyId' | translate }}
            </h5>
          </div>
          <div class="card-body">
            <p class="text-muted mb-4">{{ 'learner.verifyIdDesc' | translate }}</p>

            <form (ngSubmit)="verifyId()">
              <div class="row justify-content-center">
                <div class="col-md-8 col-lg-6">
                  <div class="mb-3">
                    <label class="form-label" for="idNumber">{{ 'verification.idNumber' | translate }} *</label>
                    <input
                      type="text"
                      id="idNumber"
                      class="form-control form-control-lg text-center"
                      [(ngModel)]="idNumber"
                      name="idNumber"
                      maxlength="13"
                      pattern="[0-9]*"
                      inputmode="numeric"
                      placeholder="0000000000000"
                      [class.is-invalid]="idNumber && !isIdValid"
                      [class.is-valid]="idNumber && isIdValid"
                      (input)="onIdInput($event)"
                      required
                    />
                    @if (idNumber && !isIdValid) {
                      <div class="invalid-feedback">{{ 'validation.invalidId' | translate }}</div>
                    }
                    @if (idNumber && isIdValid) {
                      <div class="valid-feedback">{{ 'validation.validId' | translate }}</div>
                    }
                  </div>

                  <!-- Live ID Preview -->
                  @if (idNumber.length === 13 && isIdValid) {
                    <div class="id-preview mb-4">
                      <div class="row text-center">
                        <div class="col-4">
                          <small class="text-muted d-block">{{ 'verification.dateOfBirth' | translate }}</small>
                          <strong>{{ extractedDob | date:'dd MMM yyyy' }}</strong>
                        </div>
                        <div class="col-4">
                          <small class="text-muted d-block">{{ 'verification.gender' | translate }}</small>
                          <strong>{{ extractedGender }}</strong>
                        </div>
                        <div class="col-4">
                          <small class="text-muted d-block">{{ 'verification.age' | translate }}</small>
                          <strong>{{ calculateAge() }} years</strong>
                        </div>
                      </div>
                    </div>
                  }

                  <button
                    type="submit"
                    class="btn btn-primary btn-lg w-100"
                    [disabled]="!isIdValid || verifying"
                  >
                    @if (verifying) {
                      <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                      {{ 'common.verifying' | translate }}
                    } @else {
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                      {{ 'verification.verify' | translate }}
                    }
                  </button>
                </div>
              </div>
            </form>

            <!-- Verification Result -->
            @if (verificationResult) {
              <div class="mt-4">
                <div
                  class="verification-result"
                  [class.result-green]="verificationResult.status === 'GREEN'"
                  [class.result-amber]="verificationResult.status === 'AMBER'"
                  [class.result-red]="verificationResult.status === 'RED'"
                >
                  <div class="result-header">
                    <div class="result-icon">
                      @if (verificationResult.status === 'GREEN') {
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                      } @else if (verificationResult.status === 'AMBER') {
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                          <line x1="12" y1="9" x2="12" y2="13"></line>
                          <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                      } @else {
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="15" y1="9" x2="9" y2="15"></line>
                          <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                      }
                    </div>
                    <div class="result-status">
                      @if (verificationResult.errorCode) {
                        {{ 'dha.status.serviceError' | translate }}
                      } @else if (verificationResult.status === 'GREEN') {
                        {{ 'verification.resultGreen' | translate }}
                      } @else if (verificationResult.status === 'AMBER') {
                        {{ 'verification.resultAmber' | translate }}
                      } @else {
                        {{ 'verification.resultRed' | translate }}
                      }
                    </div>
                  </div>
                  <p class="result-message">{{ verificationResult.message }}</p>

                  @if (verificationResult.status === 'GREEN' || verificationResult.status === 'AMBER') {
                    <button class="btn btn-lg mt-3" [ngClass]="verificationResult.status === 'GREEN' ? 'btn-success' : 'btn-warning'" (click)="proceedToDetails()">
                      {{ 'learner.proceedToEnroll' | translate }}
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ms-2">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </button>
                  }

                  @if (verificationResult.status === 'RED') {
                    <div class="alert alert-danger mt-3 mb-0">
                      <strong>{{ 'learner.cannotEnroll' | translate }}</strong>
                      <p class="mb-0 mt-1">{{ 'learner.cannotEnrollDesc' | translate }}</p>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Step 2: Learner Details -->
      @if (currentStep === 'details') {
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              {{ 'learner.personalDetails' | translate }}
            </h5>
          </div>
          <div class="card-body">
            <form [formGroup]="detailsForm" (ngSubmit)="proceedToConfirm()">
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label" for="firstName">{{ 'learner.firstName' | translate }} *</label>
                  <input
                    type="text"
                    id="firstName"
                    class="form-control"
                    formControlName="firstName"
                    [class.is-invalid]="isFieldInvalid('firstName')"
                  />
                  @if (isFieldInvalid('firstName')) {
                    <div class="invalid-feedback">{{ 'validation.required' | translate }}</div>
                  }
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label" for="lastName">{{ 'learner.lastName' | translate }} *</label>
                  <input
                    type="text"
                    id="lastName"
                    class="form-control"
                    formControlName="lastName"
                    [class.is-invalid]="isFieldInvalid('lastName')"
                  />
                  @if (isFieldInvalid('lastName')) {
                    <div class="invalid-feedback">{{ 'validation.required' | translate }}</div>
                  }
                </div>
              </div>

              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label" for="email">{{ 'learner.email' | translate }}</label>
                  <input
                    type="email"
                    id="email"
                    class="form-control"
                    formControlName="email"
                    [class.is-invalid]="isFieldInvalid('email')"
                  />
                  @if (isFieldInvalid('email')) {
                    <div class="invalid-feedback">{{ 'validation.invalidEmail' | translate }}</div>
                  }
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label" for="phone">{{ 'learner.phone' | translate }}</label>
                  <input
                    type="tel"
                    id="phone"
                    class="form-control"
                    formControlName="phone"
                    placeholder="0XX XXX XXXX"
                    [class.is-invalid]="isFieldInvalid('phone')"
                  />
                  @if (isFieldInvalid('phone')) {
                    <div class="invalid-feedback">{{ 'validation.invalidPhone' | translate }}</div>
                  }
                </div>
              </div>

              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label" for="idNumberDisplay">{{ 'learner.idNumber' | translate }}</label>
                  <input
                    type="text"
                    id="idNumberDisplay"
                    class="form-control"
                    [value]="idNumber"
                    disabled
                  />
                  <small class="text-muted">{{ 'learner.idVerified' | translate }}</small>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label" for="dateOfBirth">{{ 'learner.dateOfBirth' | translate }}</label>
                  <input
                    type="text"
                    id="dateOfBirth"
                    class="form-control"
                    [value]="extractedDob | date:'dd MMMM yyyy'"
                    disabled
                  />
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label" for="qualification">{{ 'learner.qualification' | translate }}</label>
                <select
                  id="qualification"
                  class="form-select"
                  formControlName="qualificationId"
                >
                  <option [value]="null">{{ 'learner.selectQualification' | translate }}</option>
                  @for (qual of qualificationOptions; track qual.id) {
                    <option [value]="qual.id">{{ qual.name }} (NQF {{ qual.nqfLevel }})</option>
                  }
                </select>
                <small class="text-muted">{{ 'learner.qualificationOptional' | translate }}</small>
              </div>

              <div class="d-flex justify-content-between mt-4">
                <button type="button" class="btn btn-outline-secondary" (click)="goBack()">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                  {{ 'common.back' | translate }}
                </button>
                <button type="submit" class="btn btn-primary" [disabled]="detailsForm.invalid">
                  {{ 'common.continue' | translate }}
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ms-2">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Step 3: Confirm -->
      @if (currentStep === 'confirm') {
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              {{ 'learner.confirmEnrollment' | translate }}
            </h5>
          </div>
          <div class="card-body">
            <p class="text-muted mb-4">{{ 'learner.reviewDetails' | translate }}</p>

            <div class="confirmation-summary">
              <div class="summary-section">
                <h6 class="summary-title">{{ 'learner.personalDetails' | translate }}</h6>
                <div class="row">
                  <div class="col-sm-6">
                    <dl class="mb-0">
                      <dt>{{ 'learner.fullName' | translate }}</dt>
                      <dd>{{ detailsForm.get('firstName')?.value }} {{ detailsForm.get('lastName')?.value }}</dd>
                      <dt>{{ 'learner.idNumber' | translate }}</dt>
                      <dd><code>{{ maskIdNumber(idNumber) }}</code></dd>
                      <dt>{{ 'learner.dateOfBirth' | translate }}</dt>
                      <dd>{{ extractedDob | date:'dd MMMM yyyy' }}</dd>
                    </dl>
                  </div>
                  <div class="col-sm-6">
                    <dl class="mb-0">
                      <dt>{{ 'learner.gender' | translate }}</dt>
                      <dd>{{ extractedGender }}</dd>
                      <dt>{{ 'learner.email' | translate }}</dt>
                      <dd>{{ detailsForm.get('email')?.value || '-' }}</dd>
                      <dt>{{ 'learner.phone' | translate }}</dt>
                      <dd>{{ detailsForm.get('phone')?.value || '-' }}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              @if (getSelectedQualification()) {
                <div class="summary-section">
                  <h6 class="summary-title">{{ 'learner.qualification' | translate }}</h6>
                  <dl class="mb-0">
                    <dt>{{ 'learner.programme' | translate }}</dt>
                    <dd>{{ getSelectedQualification()?.name }}</dd>
                    <dt>{{ 'learner.nqfLevel' | translate }}</dt>
                    <dd>NQF {{ getSelectedQualification()?.nqfLevel }}</dd>
                    <dt>{{ 'learner.credits' | translate }}</dt>
                    <dd>{{ getSelectedQualification()?.credits }} credits</dd>
                  </dl>
                </div>
              }

              <div class="summary-section">
                <h6 class="summary-title">{{ 'verification.status' | translate }}</h6>
                <div class="d-flex align-items-center">
                  <span
                    class="verification-badge me-2"
                    [ngClass]="'verification-' + verificationResult?.status?.toLowerCase()"
                  >
                    {{ verificationResult?.status }}
                  </span>
                  <span class="text-muted">{{ verificationResult?.message }}</span>
                </div>
              </div>
            </div>

            <div class="alert alert-info mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              {{ 'learner.enrollmentNote' | translate }}
            </div>

            <div class="d-flex justify-content-between mt-4">
              <button type="button" class="btn btn-outline-secondary" (click)="goBack()">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                {{ 'common.back' | translate }}
              </button>
              <button type="button" class="btn btn-success btn-lg" (click)="submitEnrollment()" [disabled]="submitting">
                @if (submitting) {
                  <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                  {{ 'common.submitting' | translate }}
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  {{ 'learner.confirmAndEnroll' | translate }}
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Success Modal -->
      @if (enrollmentSuccess) {
        <div class="modal-backdrop show"></div>
        <div class="modal show d-block" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-body text-center py-5">
                <div class="success-icon mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <h4 class="mb-3">{{ 'learner.enrollmentSuccess' | translate }}</h4>
                <p class="text-muted mb-4">{{ 'learner.enrollmentSuccessDesc' | translate }}</p>
                <div class="d-flex justify-content-center gap-3">
                  <a routerLink="/learners" class="btn btn-outline-primary">
                    {{ 'learner.viewAllLearners' | translate }}
                  </a>
                  <button class="btn btn-primary" (click)="enrollAnother()">
                    {{ 'learner.enrollAnother' | translate }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .learner-enroll {
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .steps {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .step-number {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--bs-light);
      border: 2px solid var(--bs-border-color);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: var(--bs-secondary);
      margin-bottom: 0.5rem;
      transition: all 0.3s ease;
    }

    .step.active .step-number {
      background: var(--bs-primary);
      border-color: var(--bs-primary);
      color: white;
    }

    .step.completed .step-number {
      background: #10b981;
      border-color: #10b981;
      color: white;
    }

    .step-label {
      font-size: 0.875rem;
      color: var(--bs-secondary);
      font-weight: 500;
    }

    .step.active .step-label,
    .step.completed .step-label {
      color: var(--bs-dark);
    }

    .step-connector {
      width: 80px;
      height: 2px;
      background: var(--bs-border-color);
      margin: 0 1rem;
      margin-bottom: 1.5rem;
      transition: background 0.3s ease;
    }

    .step-connector.completed {
      background: #10b981;
    }

    .card {
      border: none;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .card-header {
      background: transparent;
      border-bottom: 1px solid var(--bs-border-color);
      padding: 1rem 1.25rem;
    }

    .card-title {
      font-size: 1rem;
      font-weight: 600;
      display: flex;
      align-items: center;
    }

    .id-preview {
      background: var(--bs-light);
      border-radius: 0.5rem;
      padding: 1rem;
    }

    .verification-result {
      border-radius: 0.5rem;
      padding: 2rem;
      text-align: center;
    }

    .result-green {
      background: #d1fae5;
      border: 1px solid #a7f3d0;
    }

    .result-amber {
      background: #fef3c7;
      border: 1px solid #fde68a;
    }

    .result-red {
      background: #fee2e2;
      border: 1px solid #fecaca;
    }

    .result-icon {
      margin-bottom: 1rem;
    }

    .result-green .result-icon { color: #065f46; }
    .result-amber .result-icon { color: #92400e; }
    .result-red .result-icon { color: #991b1b; }

    .result-status {
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .result-green .result-status { color: #065f46; }
    .result-amber .result-status { color: #92400e; }
    .result-red .result-status { color: #991b1b; }

    .result-message {
      color: var(--bs-secondary);
      margin-bottom: 0;
    }

    .confirmation-summary {
      background: var(--bs-light);
      border-radius: 0.5rem;
      padding: 1.5rem;
    }

    .summary-section {
      padding-bottom: 1rem;
      margin-bottom: 1rem;
      border-bottom: 1px solid var(--bs-border-color);

      &:last-child {
        border-bottom: none;
        padding-bottom: 0;
        margin-bottom: 0;
      }
    }

    .summary-title {
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--bs-secondary);
      margin-bottom: 1rem;
    }

    dl {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 0.5rem;
    }

    dt {
      font-weight: 500;
      color: var(--bs-secondary);
    }

    dd {
      margin-bottom: 0;
    }

    .verification-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .verification-green {
      background: #d1fae5;
      color: #065f46;
    }

    .verification-amber {
      background: #fef3c7;
      color: #92400e;
    }

    .verification-red {
      background: #fee2e2;
      color: #991b1b;
    }

    .success-icon {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: #d1fae5;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      color: #065f46;
    }

    .modal {
      background: rgba(0, 0, 0, 0.5);
    }

    @media (max-width: 576px) {
      .steps {
        flex-direction: column;
      }

      .step-connector {
        width: 2px;
        height: 30px;
        margin: 0.5rem 0;
      }

      dl {
        grid-template-columns: 1fr;
      }

      dt {
        margin-bottom: 0.25rem;
      }

      dd {
        margin-bottom: 0.75rem;
      }
    }
  `]
})
export class LearnerEnrollComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly learnerService = inject(LearnerService);
  private readonly verificationService = inject(VerificationService);
  private readonly destroy$ = new Subject<void>();

  // Steps
  currentStep: EnrollmentStep = 'verify';
  completedSteps: EnrollmentStep[] = [];

  // Step 1: Verification
  idNumber = '';
  verifying = false;
  verificationResult: VerificationResponse | null = null;

  // Step 2: Details
  detailsForm: FormGroup;
  qualificationOptions: QualificationOption[] = [];

  // Step 3: Confirm
  submitting = false;
  enrollmentSuccess = false;

  // Extracted from ID
  extractedDob: Date | null = null;
  extractedGender = '';

  constructor() {
    this.detailsForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.email]],
      phone: ['', [Validators.pattern(/^0[0-9]{9}$/)]],
      qualificationId: [null]
    });

    this.qualificationOptions = this.learnerService.getQualificationOptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isIdValid(): boolean {
    return this.verificationService.isValidIdNumber(this.idNumber);
  }

  onIdInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Remove non-digits
    this.idNumber = input.value.replace(/\D/g, '').slice(0, 13);
    input.value = this.idNumber;

    // Extract DOB and gender if valid
    if (this.idNumber.length === 13 && this.isIdValid) {
      this.extractedDob = this.verificationService.extractDateOfBirth(this.idNumber);
      this.extractedGender = this.verificationService.extractGender(this.idNumber);
    }
  }

  calculateAge(): number {
    if (!this.extractedDob) return 0;
    const today = new Date();
    let age = today.getFullYear() - this.extractedDob.getFullYear();
    const monthDiff = today.getMonth() - this.extractedDob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < this.extractedDob.getDate())) {
      age--;
    }
    return age;
  }

  verifyId(): void {
    if (!this.isIdValid) return;

    this.verifying = true;
    this.verificationResult = null;

    this.verificationService.verifySingle(this.idNumber)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.verificationResult = result;
          this.verifying = false;

          // Pre-fill details from verification result
          if (result.learnerInfo) {
            this.detailsForm.patchValue({
              firstName: result.learnerInfo.firstName,
              lastName: result.learnerInfo.lastName
            });
          }
        },
        error: (error) => {
          console.error('Verification error:', error);
          this.verifying = false;

          // Display error as AMBER status with the error message
          this.verificationResult = {
            success: false,
            status: error.status || 'AMBER',
            idNumber: this.idNumber,
            message: error.message || 'Verification service unavailable. Please try again later.',
            verifiedAt: new Date(),
            needsManualReview: error.needsManualReview || true,
            errorCode: error.errorCode
          };
        }
      });
  }

  proceedToDetails(): void {
    this.completedSteps.push('verify');
    this.currentStep = 'details';
  }

  proceedToConfirm(): void {
    if (this.detailsForm.invalid) return;
    this.completedSteps.push('details');
    this.currentStep = 'confirm';
  }

  goBack(): void {
    if (this.currentStep === 'details') {
      this.currentStep = 'verify';
      this.completedSteps = this.completedSteps.filter(s => s !== 'verify');
    } else if (this.currentStep === 'confirm') {
      this.currentStep = 'details';
      this.completedSteps = this.completedSteps.filter(s => s !== 'details');
    }
  }

  isStepCompleted(step: EnrollmentStep): boolean {
    return this.completedSteps.includes(step);
  }

  isFieldInvalid(field: string): boolean {
    const control = this.detailsForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getSelectedQualification(): QualificationOption | undefined {
    const id = this.detailsForm.get('qualificationId')?.value;
    return this.qualificationOptions.find(q => q.id === Number(id));
  }

  maskIdNumber(idNumber: string): string {
    return this.verificationService.maskIdNumber(idNumber);
  }

  submitEnrollment(): void {
    this.submitting = true;

    const request = {
      idNumber: this.idNumber,
      firstName: this.detailsForm.get('firstName')?.value,
      lastName: this.detailsForm.get('lastName')?.value,
      email: this.detailsForm.get('email')?.value || undefined,
      phone: this.detailsForm.get('phone')?.value || undefined,
      qualificationId: this.detailsForm.get('qualificationId')?.value || undefined
    };

    this.learnerService.enrollLearner(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.submitting = false;
          this.completedSteps.push('confirm');
          this.enrollmentSuccess = true;
        },
        error: (error) => {
          console.error('Enrollment error:', error);
          this.submitting = false;
          alert(error.message || 'Failed to enroll learner. Please try again.');
        }
      });
  }

  enrollAnother(): void {
    // Reset everything
    this.currentStep = 'verify';
    this.completedSteps = [];
    this.idNumber = '';
    this.verificationResult = null;
    this.extractedDob = null;
    this.extractedGender = '';
    this.enrollmentSuccess = false;
    this.detailsForm.reset();
  }
}
