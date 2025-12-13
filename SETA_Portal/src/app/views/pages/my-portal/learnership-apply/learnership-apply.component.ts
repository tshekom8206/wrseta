import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import { LearnerService, QualificationOption } from '../../../../core/services/learner.service';
import { VerificationService } from '../../../../core/services/verification.service';
import { VerificationResponse } from '../../../../interfaces/verification.interface';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

type EnrollmentStep = 'verify' | 'details' | 'confirm';

@Component({
  selector: 'app-learnership-apply',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, TranslateModule, PageHeaderComponent],
  template: `
    <div class="learner-enroll">
      <app-page-header
        title="Apply for Learnership"
        subtitle="Complete your application for this learnership program"
        icon="book-open"
      >
        <a routerLink="/app/my-portal/learnerships" class="btn btn-outline-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="me-2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Learnerships
        </a>
      </app-page-header>

      <!-- Selected Learnership Info -->
      @if (selectedLearnership) {
        <div class="card mb-4">
          <div class="card-body">
            <div class="learnership-summary">
              <div class="learnership-summary-header">
                <h5 class="learnership-summary-title">{{ selectedLearnership.title }}</h5>
                <span class="learnership-summary-badge">NQF Level {{ selectedLearnership.nqfLevel }}</span>
              </div>
              <div class="learnership-summary-meta">
                <span class="meta-item">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  Code: {{ selectedLearnership.code }}
                </span>
                <span class="meta-item">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="8" r="7"></circle>
                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                  </svg>
                  {{ selectedLearnership.credits }} Credits
                </span>
                <span class="meta-item">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  Duration: {{ selectedLearnership.duration }}
                </span>
              </div>
            </div>
          </div>
        </div>
      }

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
              <div class="step-label">Verify ID</div>
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
              <div class="step-label">Learner Details</div>
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
              <div class="step-label">Confirm & Apply</div>
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
              Verify ID Number
            </h5>
          </div>
          <div class="card-body">
            <p class="text-muted mb-4">Enter your South African ID number to verify your identity and check for existing enrollments.</p>

            <form (ngSubmit)="verifyId()">
              <div class="row justify-content-center">
                <div class="col-md-8 col-lg-6">
                  <div class="mb-3">
                    <label class="form-label" for="idNumber">ID Number *</label>
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
                      <div class="invalid-feedback">Invalid ID number format</div>
                    }
                    @if (idNumber && isIdValid) {
                      <div class="valid-feedback">Valid ID number format</div>
                    }
                  </div>

                  <!-- Live ID Preview -->
                  @if (idNumber.length === 13 && isIdValid) {
                    <div class="id-preview mb-4">
                      <div class="row text-center">
                        <div class="col-4">
                          <small class="text-muted d-block">Date of Birth</small>
                          <strong>{{ extractedDob | date:'dd MMM yyyy' }}</strong>
                        </div>
                        <div class="col-4">
                          <small class="text-muted d-block">Gender</small>
                          <strong>{{ extractedGender }}</strong>
                        </div>
                        <div class="col-4">
                          <small class="text-muted d-block">Age</small>
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
                      Verifying...
                    } @else {
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                      Verify
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
                        Service Error
                      } @else if (verificationResult.status === 'GREEN') {
                        Verification Successful
                      } @else if (verificationResult.status === 'AMBER') {
                        Verification Warning
                      } @else {
                        Verification Failed
                      }
                    </div>
                  </div>
                  <p class="result-message">{{ verificationResult.message }}</p>

                  @if (verificationResult.status === 'GREEN' || verificationResult.status === 'AMBER') {
                    <button class="btn btn-lg mt-3" [ngClass]="verificationResult.status === 'GREEN' ? 'btn-success' : 'btn-warning'" (click)="proceedToDetails()">
                      Continue to Details
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ms-2">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </button>
                  }

                  @if (verificationResult.status === 'RED') {
                    <div class="alert alert-danger mt-3 mb-0">
                      <strong>Cannot Proceed</strong>
                      <p class="mb-0 mt-1">{{ verificationResult.message || 'Your ID could not be verified. Please check the number and try again, or contact support for assistance.' }}</p>
                      @if (verificationResult.duplicateInfo) {
                        <div class="mt-2">
                          <strong>Existing Enrollment Details:</strong>
                          <ul class="mb-0 mt-1">
                            @for (enrollment of verificationResult.duplicateInfo.enrolledSetas; track enrollment.setaCode) {
                              <li>
                                {{ enrollment.setaName }} - {{ enrollment.status }}
                                @if (enrollment.enrollmentDate) {
                                  (Enrolled: {{ enrollment.enrollmentDate | date:'dd MMM yyyy' }})
                                }
                              </li>
                            }
                          </ul>
                        </div>
                      }
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
              Personal Details
            </h5>
          </div>
          <div class="card-body">
            <form [formGroup]="detailsForm" (ngSubmit)="proceedToConfirm()">
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label" for="firstName">First Name *</label>
                  <input
                    type="text"
                    id="firstName"
                    class="form-control"
                    formControlName="firstName"
                    [disabled]="isFieldDisabled('firstName')"
                    [class.is-invalid]="isFieldInvalid('firstName')"
                  />
                  @if (isFieldDisabled('firstName')) {
                    <small class="text-muted">ID verified</small>
                  }
                  @if (isFieldInvalid('firstName')) {
                    <div class="invalid-feedback">This field is required</div>
                  }
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label" for="lastName">Last Name *</label>
                  <input
                    type="text"
                    id="lastName"
                    class="form-control"
                    formControlName="lastName"
                    [disabled]="isFieldDisabled('lastName')"
                    [class.is-invalid]="isFieldInvalid('lastName')"
                  />
                  @if (isFieldDisabled('lastName')) {
                    <small class="text-muted">ID verified</small>
                  }
                  @if (isFieldInvalid('lastName')) {
                    <div class="invalid-feedback">This field is required</div>
                  }
                </div>
              </div>

              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label" for="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    class="form-control"
                    formControlName="email"
                    [class.is-invalid]="isFieldInvalid('email')"
                  />
                  @if (isFieldInvalid('email')) {
                    <div class="invalid-feedback">Invalid email address</div>
                  }
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label" for="phone">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    class="form-control"
                    formControlName="phone"
                    placeholder="0XX XXX XXXX"
                    [class.is-invalid]="isFieldInvalid('phone')"
                  />
                  @if (isFieldInvalid('phone')) {
                    <div class="invalid-feedback">Invalid phone number</div>
                  }
                </div>
              </div>

              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label" for="idNumberDisplay">ID Number</label>
                  <input
                    type="text"
                    id="idNumberDisplay"
                    class="form-control"
                    [value]="idNumber"
                    disabled
                  />
                  <small class="text-muted">ID verified</small>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label" for="dateOfBirth">Date of Birth</label>
                  <input
                    type="text"
                    id="dateOfBirth"
                    class="form-control"
                    [value]="extractedDob | date:'dd MMMM yyyy'"
                    disabled
                  />
                </div>
              </div>

              <div class="d-flex justify-content-between mt-4">
                <button type="button" class="btn btn-outline-secondary" (click)="goBack()">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                  Back
                </button>
                <button type="submit" class="btn btn-primary" [disabled]="detailsForm.invalid">
                  Continue
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
              Confirm Application
            </h5>
          </div>
          <div class="card-body">
            <p class="text-muted mb-4">Please review your details before submitting your application.</p>

            <div class="confirmation-summary">
              @if (selectedLearnership) {
                <div class="summary-section">
                  <h6 class="summary-title">Selected Learnership</h6>
                  <dl class="mb-0">
                    <dt>Program</dt>
                    <dd>{{ selectedLearnership.title }}</dd>
                    <dt>Code</dt>
                    <dd>{{ selectedLearnership.code }}</dd>
                    <dt>NQF Level</dt>
                    <dd>Level {{ selectedLearnership.nqfLevel }}</dd>
                    <dt>Credits</dt>
                    <dd>{{ selectedLearnership.credits }} credits</dd>
                    <dt>Duration</dt>
                    <dd>{{ selectedLearnership.duration }}</dd>
                  </dl>
                </div>
              }

              <div class="summary-section">
                <h6 class="summary-title">Personal Details</h6>
                <div class="row">
                  <div class="col-sm-6">
                    <dl class="mb-0">
                      <dt>Full Name</dt>
                      <dd>{{ detailsForm.get('firstName')?.value }} {{ detailsForm.get('lastName')?.value }}</dd>
                      <dt>ID Number</dt>
                      <dd><code>{{ maskIdNumber(idNumber) }}</code></dd>
                      <dt>Date of Birth</dt>
                      <dd>{{ extractedDob | date:'dd MMMM yyyy' }}</dd>
                    </dl>
                  </div>
                  <div class="col-sm-6">
                    <dl class="mb-0">
                      <dt>Gender</dt>
                      <dd>{{ extractedGender }}</dd>
                      <dt>Email</dt>
                      <dd>{{ detailsForm.get('email')?.value || '-' }}</dd>
                      <dt>Phone</dt>
                      <dd>{{ detailsForm.get('phone')?.value || '-' }}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div class="summary-section">
                <h6 class="summary-title">Verification Status</h6>
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
              Your application will be reviewed by the SETA. You will be notified once a decision has been made.
            </div>

            <div class="d-flex justify-content-between mt-4">
              <button type="button" class="btn btn-outline-secondary" (click)="goBack()">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Back
              </button>
              <button type="button" class="btn btn-success btn-lg" (click)="submitApplication()" [disabled]="submitting">
                @if (submitting) {
                  <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                  Submitting...
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  Submit Application
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Duplicate Enrollment Modal -->
      @if (showDuplicateModal) {
        <div class="modal-backdrop show"></div>
        <div class="modal show d-block" tabindex="-1" role="dialog">
          <div class="modal-dialog modal-dialog-centered duplicate-enrollment-modal">
            <div class="modal-content">
              <div class="modal-header duplicate-modal-header">
                <div class="d-flex align-items-center w-100">
                  <div class="duplicate-icon-wrapper me-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="15" y1="9" x2="9" y2="15"></line>
                      <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                  </div>
                  <div class="flex-grow-1">
                    <h4 class="modal-title mb-0">Enrollment Already Exists</h4>
                    <p class="text-muted mb-0 small">Unable to proceed with application</p>
                  </div>
                  <button type="button" class="btn-close btn-close-white" (click)="closeDuplicateModal()" aria-label="Close"></button>
                </div>
              </div>
              <div class="modal-body duplicate-modal-body">
                <div class="warning-message-box">
                  <div class="d-flex align-items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2 flex-shrink-0 mt-1">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <p class="mb-0">{{ duplicateMessage }}</p>
                  </div>
                </div>

                @if (duplicateEnrollmentInfo) {
                  <div class="enrollment-details-section">
                    <h6 class="section-title">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>
                      Existing Enrollment Details
                    </h6>
                    <div class="enrollment-info-card">
                      <div class="info-row">
                        @if (duplicateEnrollmentInfo.setaName) {
                          <div class="info-item">
                            <span class="info-label">SETA</span>
                            <span class="info-value">{{ duplicateEnrollmentInfo.setaName }}</span>
                          </div>
                        }
                        @if (duplicateEnrollmentInfo.learnershipCode) {
                          <div class="info-item">
                            <span class="info-label">Learnership Code</span>
                            <span class="info-value">{{ duplicateEnrollmentInfo.learnershipCode }}</span>
                          </div>
                        }
                      </div>
                      <div class="info-row">
                        @if (duplicateEnrollmentInfo.province) {
                          <div class="info-item">
                            <span class="info-label">Province</span>
                            <span class="info-value">{{ duplicateEnrollmentInfo.province }}</span>
                          </div>
                        }
                        @if (duplicateEnrollmentInfo.enrollmentYear) {
                          <div class="info-item">
                            <span class="info-label">Enrollment Year</span>
                            <span class="info-value">{{ duplicateEnrollmentInfo.enrollmentYear }}</span>
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                }

                <div class="dispute-info-box">
                  <div class="d-flex align-items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2 flex-shrink-0 mt-1">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <div>
                      <p class="mb-1"><strong>Don't agree with this information?</strong></p>
                      <p class="mb-0 small text-muted">If you believe this enrollment record is incorrect, you can log a dispute with WRSETA. Our team will review your case and contact you within 5-7 business days.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="modal-footer duplicate-modal-footer">
                <button type="button" class="btn btn-outline-secondary" (click)="closeDuplicateModal()">
                  Close
                </button>
                <button
                  type="button"
                  class="btn btn-primary btn-dispute"
                  (click)="logDispute()"
                  [disabled]="loggingDispute"
                >
                  @if (loggingDispute) {
                    <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                    Logging Dispute...
                  } @else {
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    Log Dispute with WRSETA
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Success Modal -->
      @if (applicationSuccess) {
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
                <h4 class="mb-3">Application Submitted Successfully!</h4>
                <p class="text-muted mb-4">Your learnership application has been submitted and is under review. You will be notified via email once a decision has been made.</p>
                <div class="d-flex justify-content-center gap-3">
                  <a routerLink="/app/my-portal/learnerships" class="btn btn-primary">
                    Back to Learnerships
                  </a>
                  <a routerLink="/app/my-portal/status" class="btn btn-outline-primary">
                    View My Status
                  </a>
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

    .learnership-summary {
      padding: 1rem 0;
    }

    .learnership-summary-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .learnership-summary-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--seta-text-primary, #212529);
      margin: 0;
      flex: 1;
      min-width: 200px;
    }

    .learnership-summary-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.375rem 0.75rem;
      background: linear-gradient(135deg, var(--seta-primary, #008550) 0%, var(--seta-primary-dark, #006640) 100%);
      color: white;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .learnership-summary-meta {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.875rem;
      color: var(--seta-text-secondary, #6c757d);
      font-weight: 500;
    }

    .meta-item svg {
      color: var(--seta-primary, #008550);
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
      background: var(--seta-primary, #008550);
      border-color: var(--seta-primary, #008550);
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

    /* Duplicate Enrollment Modal Styles */
    .duplicate-enrollment-modal {
      max-width: 600px;
    }

    .duplicate-modal-header {
      background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
      color: white;
      padding: 1.5rem;
      border-radius: 0.5rem 0.5rem 0 0;
    }

    .duplicate-icon-wrapper {
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .duplicate-modal-body {
      padding: 2rem;
    }

    .warning-message-box {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-left: 4px solid #ffc107;
      border-radius: 0.5rem;
      padding: 1rem 1.25rem;
      margin-bottom: 1.5rem;
    }

    .warning-message-box p {
      color: #856404;
      font-weight: 500;
      margin: 0;
    }

    .enrollment-details-section {
      margin-bottom: 1.5rem;
    }

    .section-title {
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6c757d;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
    }

    .enrollment-info-card {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 0.5rem;
      padding: 1.25rem;
    }

    .info-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem;
      margin-bottom: 1rem;
    }

    .info-row:last-child {
      margin-bottom: 0;
    }

    .info-item {
      display: flex;
      flex-direction: column;
    }

    .info-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6c757d;
      margin-bottom: 0.375rem;
    }

    .info-value {
      font-size: 0.9375rem;
      font-weight: 500;
      color: #212529;
    }

    .dispute-info-box {
      background: #e7f3ff;
      border: 1px solid #b3d9ff;
      border-left: 4px solid #0d6efd;
      border-radius: 0.5rem;
      padding: 1rem 1.25rem;
      margin-top: 1.5rem;
    }

    .dispute-info-box p {
      margin: 0;
      color: #004085;
    }

    .dispute-info-box p strong {
      color: #002752;
    }

    .duplicate-modal-footer {
      padding: 1.25rem 2rem;
      border-top: 1px solid #dee2e6;
      background: #f8f9fa;
    }

    .btn-dispute {
      min-width: 200px;
      font-weight: 600;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .btn-dispute:hover:not(:disabled) {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      transform: translateY(-1px);
      transition: all 0.2s ease;
    }

    @media (max-width: 576px) {
      .duplicate-modal-body {
        padding: 1.5rem;
      }

      .info-row {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .duplicate-modal-footer {
        padding: 1rem;
        flex-direction: column;
        gap: 0.75rem;
      }

      .btn-dispute {
        width: 100%;
        min-width: auto;
      }
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

      .learnership-summary-header {
        flex-direction: column;
      }
    }
  `]
})
export class LearnershipApplyComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly learnerService = inject(LearnerService);
  private readonly verificationService = inject(VerificationService);
  private readonly destroy$ = new Subject<void>();

  // Steps
  currentStep: EnrollmentStep = 'verify';
  completedSteps: EnrollmentStep[] = [];

  // Selected learnership
  selectedLearnership: any = null;

  // Step 1: Verification
  idNumber = '';
  verifying = false;
  verificationResult: VerificationResponse | null = null;

  // Step 2: Details
  detailsForm: FormGroup;

  // Step 3: Confirm
  submitting = false;
  applicationSuccess = false;

  // Duplicate enrollment modal
  showDuplicateModal = false;
  duplicateEnrollmentInfo: any = null;
  duplicateMessage = '';
  loggingDispute = false;

  // Extracted from ID
  extractedDob: Date | null = null;
  extractedGender = '';

  constructor() {
    this.detailsForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.email]],
      phone: ['']
    });
  }

  ngOnInit(): void {
    // Get learnership ID from route params
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const learnershipId = params['id'];
      if (learnershipId) {
        this.loadLearnership(learnershipId);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isIdValid(): boolean {
    if (!this.idNumber || this.idNumber.length !== 13) return false;
    return /^\d{13}$/.test(this.idNumber);
  }

  onIdInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.idNumber = input.value.replace(/\D/g, '');

    if (this.idNumber.length === 13) {
      this.extractIdInfo();
    } else {
      this.extractedDob = null;
      this.extractedGender = '';
    }
  }

  extractIdInfo(): void {
    if (this.idNumber.length !== 13) return;

    const year = parseInt(this.idNumber.substring(0, 2));
    const month = parseInt(this.idNumber.substring(2, 4));
    const day = parseInt(this.idNumber.substring(4, 6));
    const genderCode = parseInt(this.idNumber.substring(6, 10));

    // Determine century
    const currentYear = new Date().getFullYear();
    const currentCenturyYear = currentYear % 100;
    const fullYear = year <= currentCenturyYear ? 2000 + year : 1900 + year;

    this.extractedDob = new Date(fullYear, month - 1, day);
    this.extractedGender = genderCode < 5000 ? 'Female' : 'Male';
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

    // Get names from form if available, otherwise use empty strings
    // DHA verification will use these for name matching
    const firstName = this.detailsForm.get('firstName')?.value || '';
    const lastName = this.detailsForm.get('lastName')?.value || '';

    // Call verification service which connects to DHA endpoint
    this.verificationService.verifySingle(this.idNumber, firstName, lastName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.verificationResult = result;
          this.verifying = false;

          // Fetch DHA data to get firstName and surname
          if (result.status === 'GREEN' || result.status === 'AMBER') {
            this.fetchDHAInfo();
          } else if (result.learnerInfo) {
            // If verification failed but we have learnerInfo, try to use it
            const currentFirstName = this.detailsForm.get('firstName')?.value || '';
            const currentLastName = this.detailsForm.get('lastName')?.value || '';

            this.detailsForm.patchValue({
              firstName: currentFirstName || result.learnerInfo.firstName || '',
              lastName: currentLastName || result.learnerInfo.lastName || ''
            });
          }
        },
        error: (error) => {
          console.error('Verification error:', error);
          this.verifying = false;

          // Show error message to user
          if (error.message) {
            alert(`Verification failed: ${error.message}`);
          } else {
            alert('ID verification failed. Please check the ID number and try again.');
          }
        }
      });
  }

  /**
   * Fetch DHA person data to get firstName and surname
   */
  private fetchDHAInfo(): void {
    this.verificationService.verifyWithDHA(this.idNumber)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (dhaResponse) => {
          if (dhaResponse.success && dhaResponse.data) {
            const dhaData = dhaResponse.data;

            // Populate firstName and lastName from DHA response
            if (dhaData.firstName || dhaData.surname) {
              this.detailsForm.patchValue({
                firstName: dhaData.firstName || '',
                lastName: dhaData.surname || ''
              });

              // Make fields read-only after populating from DHA
              this.detailsForm.get('firstName')?.disable();
              this.detailsForm.get('lastName')?.disable();
            }
          }
        },
        error: (error) => {
          // Silently fail - names might not be available from DHA
          console.warn('Could not fetch DHA person data:', error);
        }
      });
  }

  proceedToDetails(): void {
    this.completedSteps.push('verify');
    this.currentStep = 'details';

    // If fields are already disabled (from DHA data), keep them disabled
    // This ensures the names from DHA remain read-only
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

  isFieldDisabled(field: string): boolean {
    const control = this.detailsForm.get(field);
    return !!(control && control.disabled);
  }

  maskIdNumber(idNumber: string): string {
    if (!idNumber || idNumber.length !== 13) return idNumber;
    return `${idNumber.substring(0, 6)}*****${idNumber.substring(11)}`;
  }

  submitApplication(): void {
    if (!this.selectedLearnership) {
      alert('No learnership selected');
      return;
    }

    if (!this.idNumber || !this.verificationResult) {
      alert('Please verify your ID number first');
      return;
    }

    // Check if verification shows learner already exists (RED status with duplicate)
    if (this.verificationResult.status === 'RED' && this.verificationResult.duplicateInfo?.isDuplicate) {
      this.showDuplicateEnrollmentModal(
        this.verificationResult.message || 'You cannot apply because you are already enrolled in other courses.',
        this.verificationResult.duplicateInfo
      );
      return;
    }

    if (this.detailsForm.invalid) {
      alert('Please fill in all required fields');
      return;
    }

    this.submitting = true;

    // Get form values - use getRawValue() to include disabled fields
    const formValues = this.detailsForm.getRawValue();
    const firstName = formValues.firstName || '';
    const lastName = formValues.lastName || '';

    // Get current year for enrollment
    const enrollmentYear = new Date().getFullYear();

    // Get province (default to 'GP' if not available - should be added to form)
    const province = 'GP'; // TODO: Add province selection to form

    // Register the learner
    this.learnerService.registerLearner({
      idNumber: this.idNumber,
      firstName: firstName,
      surname: lastName,
      learnershipCode: this.selectedLearnership.code || '',
      learnershipName: this.selectedLearnership.title || '',
      enrollmentYear: enrollmentYear,
      province: province
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.submitting = false;

        if (result.success && result.decision === 'ALLOWED') {
          // Registration successful
          this.completedSteps.push('confirm');
          this.applicationSuccess = true;
        } else if (result.decision === 'BLOCKED') {
          // Learner already exists - show modal dialog
          this.showDuplicateEnrollmentModal(
            result.message || 'You cannot apply because you are already enrolled in other courses.',
            result.existingEnrollment
          );
        } else {
          // Other error
          alert(result.message || 'Registration failed. Please try again.');
        }
      },
      error: (error) => {
        console.error('Registration error:', error);
        this.submitting = false;

        // Check if it's a duplicate error
        if (error.decision === 'BLOCKED' || error.message?.toLowerCase().includes('already enrolled') || error.message?.toLowerCase().includes('duplicate')) {
          this.showDuplicateEnrollmentModal(
            error.message || 'You cannot apply because you are already enrolled in other courses.',
            error.existingEnrollment
          );
        } else {
          alert(error.message || 'Registration failed. Please try again later.');
        }
      }
    });
  }

  /**
   * Show duplicate enrollment modal dialog
   */
  showDuplicateEnrollmentModal(message: string, enrollmentInfo?: any): void {
    this.duplicateMessage = message;
    this.duplicateEnrollmentInfo = enrollmentInfo;
    this.showDuplicateModal = true;
  }

  /**
   * Close duplicate enrollment modal
   */
  closeDuplicateModal(): void {
    this.showDuplicateModal = false;
    this.duplicateEnrollmentInfo = null;
    this.duplicateMessage = '';
  }

  /**
   * Log a dispute with WRSETA
   */
  logDispute(): void {
    if (!this.idNumber || !this.selectedLearnership) {
      alert('Missing information to log dispute');
      return;
    }

    this.loggingDispute = true;

    // Get form values - use getRawValue() to include disabled fields
    const formValues = this.detailsForm.getRawValue();
    const firstName = formValues.firstName || '';
    const lastName = formValues.lastName || '';

    // Prepare dispute data
    const disputeData = {
      idNumber: this.idNumber,
      firstName: firstName,
      lastName: lastName,
      learnershipCode: this.selectedLearnership.code || '',
      learnershipName: this.selectedLearnership.title || '',
      reason: 'Dispute existing enrollment record',
      existingEnrollment: this.duplicateEnrollmentInfo,
      disputeDate: new Date().toISOString()
    };

    // Call API to log dispute
    this.learnerService.logDispute(disputeData).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result: { success: boolean; disputeId?: string; message: string }) => {
        this.loggingDispute = false;
        this.closeDuplicateModal();

        alert('Your dispute has been logged successfully. WRSETA will review your case and contact you within 5-7 business days.');
      },
      error: (error: any) => {
        console.error('Dispute logging error:', error);
        this.loggingDispute = false;
        alert('Failed to log dispute. Please contact WRSETA support directly.');
      }
    });
  }

  private loadLearnership(learnershipId: string): void {
    // TODO: Load learnership from service/API
    // For now, use mock data or get from route state
    const state = history.state;
    if (state && state.learnership) {
      this.selectedLearnership = state.learnership;
    } else {
      // Fallback: create a mock learnership from ID
      // In production, fetch from API
      this.selectedLearnership = {
        id: learnershipId,
        title: 'National Certificate: Wholesale and Retail Operations',
        code: '58206',
        nqfLevel: 2,
        credits: 120,
        duration: '12 months'
      };
    }
  }
}

