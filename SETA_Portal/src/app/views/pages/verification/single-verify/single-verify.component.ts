import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import { VerificationService } from '../../../../core/services/verification.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { VerificationResponse } from '../../../../interfaces/verification.interface';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-single-verify',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, PageHeaderComponent],
  template: `
    <app-page-header
      titleKey="verification.singleVerification"
      subtitleKey="verification.enterIdNumber"
      icon="check-circle"
    ></app-page-header>

    <div class="row">
      <!-- Input Section -->
      <div class="col-lg-5">
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">
              <span class="card-title__icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7"></path>
                  <path d="M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4"></path>
                  <path d="M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"></path>
                  <line x1="9" y1="9" x2="9.01" y2="9"></line>
                  <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
              </span>
              {{ 'verification.idNumber' | translate }}
            </h5>
          </div>
          <div class="card-body">
            <form (ngSubmit)="verify()" #verifyForm="ngForm">
              <div class="mb-4">
                <label for="idNumber" class="form-label visually-hidden">
                  {{ 'verification.idNumber' | translate }}
                </label>
                <input
                  type="text"
                  id="idNumber"
                  class="form-control form-control-lg text-center font-monospace"
                  [(ngModel)]="idNumber"
                  name="idNumber"
                  placeholder="0000000000000"
                  maxlength="13"
                  pattern="\\d{13}"
                  [class.is-invalid]="idNumber && !isValidFormat"
                  [class.is-valid]="idNumber && isValidFormat"
                  (input)="onIdInput($event)"
                  autocomplete="off"
                  inputmode="numeric"
                  required
                  aria-describedby="idHelp idError"
                />
                <div id="idHelp" class="form-text">
                  Enter a 13-digit South African ID number
                </div>
                @if (idNumber && !isValidFormat) {
                  <div id="idError" class="invalid-feedback d-block">
                    {{ 'verification.invalidIdFormat' | translate }}
                  </div>
                }
              </div>

              @if (idNumber && isValidFormat) {
                <div class="id-preview mb-4 p-3 bg-light rounded">
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
                      <strong>{{ extractedAge }} years</strong>
                    </div>
                  </div>
                </div>
              }

              <button
                type="submit"
                class="btn btn-primary btn-lg w-100"
                [disabled]="!isValidFormat || loading"
              >
                @if (loading) {
                  <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {{ 'verification.verifying' | translate }}
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  {{ 'verification.verify' | translate }}
                }
              </button>
            </form>
          </div>
        </div>
      </div>

      <!-- Result Section -->
      <div class="col-lg-7">
        @if (result) {
          @if (result.status === 'RED' || !result.success) {
            <!-- Invalid ID Message -->
            <div class="invalid-id-message">
              <div class="invalid-icon-wrapper">
                <div class="invalid-icon-circle">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                </div>
              </div>
              <h3 class="invalid-title">Verification Unsuccessful</h3>
              <p class="invalid-message">
                {{ result.message || 'The ID number provided could not be verified. Please check the number and try again.' }}
              </p>
              @if (result.errorCode) {
                <div class="invalid-details">
                  <small>Error Code: <code>{{ result.errorCode }}</code></small>
                </div>
              }
              <div class="invalid-actions">
                <button type="button" class="btn btn-outline-primary" (click)="verifyAnother()">
                  Try Another ID
                </button>
                <button type="button" class="btn btn-outline-secondary" (click)="clearResult()">
                  Clear
                </button>
              </div>
            </div>
          } @else {
            <!-- ID Card Display -->
            <div class="id-card-wrapper">
              <div class="id-card" [class]="'id-card-' + result.status.toLowerCase()">
              <div class="id-card-split">
                <!-- Left Section - Flag, Logo and ID Text -->
                <div class="id-card-left-section">
                  <div class="id-card-flag">
                    <img src="/assets/images/South_Africa.svg.png" alt="South African Flag" class="flag-image" />
                  </div>
                  <div class="id-logo-section">
                    <div class="id-logo">
                      <div class="id-logo-dot"></div>
                      <div class="id-logo-text">iD</div>
                    </div>
                  </div>
                </div>

                <!-- Right Section - All Other Information -->
                <div class="id-card-right-section">
                  <!-- Card Header -->
                  <div class="id-card-header">
                    <div class="id-card-title">
                      <div class="id-card-title-main">REPUBLIC OF SOUTH AFRICA</div>
                      <div class="id-card-title-sub">NATIONAL IDENTITY CARD</div>
                    </div>
                  </div>

                  <!-- Card Body -->
                  <div class="id-card-body">
                    <!-- Personal Information -->
                    <div class="id-card-info">
                      @if (result.learnerInfo) {
                        <div class="id-info-row">
                          <span class="id-info-label">Surname</span>
                          <span class="id-info-value">{{ (result.learnerInfo.lastName || 'N/A') | uppercase }}</span>
                        </div>
                        <div class="id-info-row">
                          <span class="id-info-label">Names</span>
                          <span class="id-info-value">{{ (result.learnerInfo.firstName || 'N/A') | uppercase }}</span>
                        </div>
                    <div class="id-info-row">
                      <span class="id-info-label">Sex</span>
                      <span class="id-info-value">{{ result.learnerInfo.gender === 'Male' ? 'M' : result.learnerInfo.gender === 'Female' ? 'F' : result.learnerInfo.gender || 'N/A' }}</span>
                    </div>
                        <div class="id-info-row">
                          <span class="id-info-label">Nationality</span>
                          <span class="id-info-value">{{ (result.learnerInfo.citizenship || 'RSA') | uppercase }}</span>
                        </div>
                        <div class="id-info-row">
                          <span class="id-info-label">Identity Number</span>
                          <span class="id-info-value">{{ result.idNumber }}</span>
                        </div>
                        <div class="id-info-row">
                          <span class="id-info-label">Date of Birth</span>
                          <span class="id-info-value">{{ result.learnerInfo.dateOfBirth | date:'dd MMM yyyy' | uppercase }}</span>
                        </div>
                        <div class="id-info-row">
                          <span class="id-info-label">Country of Birth</span>
                          <span class="id-info-value">{{ (result.learnerInfo.citizenship || 'RSA') | uppercase }}</span>
                        </div>
                        <div class="id-info-row">
                          <span class="id-info-label">Status</span>
                          <span class="id-info-value">{{ (result.learnerInfo.status || 'CITIZEN') | uppercase }}</span>
                        </div>
                      } @else {
                        <div class="id-info-row">
                          <span class="id-info-label">Identity Number</span>
                          <span class="id-info-value">{{ result.idNumber }}</span>
                        </div>
                        <div class="id-info-row">
                          <span class="id-info-label">Status</span>
                          <span class="id-info-value id-status-badge" [class]="'status-' + result.status.toLowerCase()">
                            {{ result.status }}
                          </span>
                        </div>
                      }
                    </div>

                    <!-- Photo and Security Features -->
                    <div class="id-card-photo-section">
                      <div class="id-photo-wrapper">
                        <!-- RSA Watermark behind photo -->
                        <div class="id-photo-watermark">RSA</div>
                        <div class="id-photo-placeholder">
                          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="photo-icon">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                        </div>
                      </div>
                      <div class="id-signature-area">
                        <div class="signature-label">Signature:</div>
                        <div class="signature-line">
                          <span class="generic-signature">
                            @if (result.learnerInfo && result.learnerInfo.fullName) {
                              {{ result.learnerInfo.fullName }}
                            } @else {
                              Signature
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Card Footer -->
                  <div class="id-card-footer">
                    <!-- Verification Status Indicator -->
                    <div class="id-verification-status" [class]="'verification-' + result.status.toLowerCase()">
                      <div class="verification-status-icon">
                        @if (result.status === 'GREEN') {
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                          </svg>
                        } @else if (result.status === 'AMBER') {
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                          </svg>
                        } @else {
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                          </svg>
                        }
                      </div>
                      <span class="verification-status-text">{{ result.status }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Buttons Below Card -->
            <div class="id-card-actions">
              <div class="action-buttons">
                @if (result.status === 'GREEN') {
                  <a routerLink="/learners/enroll" [queryParams]="{id: result.idNumber}" class="btn btn-success">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="8.5" cy="7" r="4"></circle>
                      <line x1="20" y1="8" x2="20" y2="14"></line>
                      <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                    {{ 'nav.enrollLearner' | translate }}
                  </a>
                }
                <button type="button" class="btn btn-outline-primary" (click)="verifyAnother()">
                  Verify Another
                </button>
                <button type="button" class="btn btn-outline-secondary" (click)="clearResult()">
                  Clear
                </button>
              </div>

              <!-- Duplicate Info (if applicable) -->
              @if (result.duplicateInfo && result.duplicateInfo.isDuplicate) {
                <div class="duplicate-info mt-3">
                  <div class="alert alert-warning mb-0">
                    <strong>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                      Duplicate Enrollment Detected
                    </strong>
                    <div class="mt-2">
                      <small>This ID number is already enrolled in the following SETA(s):</small>
                      <ul class="mb-0 mt-2">
                        @for (seta of result.duplicateInfo.enrolledSetas; track seta.setaCode) {
                          <li>
                            <strong>{{ seta.setaName }}</strong> - Enrolled {{ seta.enrollmentDate | date:'dd MMM yyyy' }} 
                            <span class="badge ms-2" [class.bg-success]="seta.status !== 'Active'" [class.bg-danger]="seta.status === 'Active'">
                              {{ seta.status }}
                            </span>
                          </li>
                        }
                      </ul>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
          }
        } @else {
          <!-- Placeholder when no result -->
          <div class="card h-100">
            <div class="card-body d-flex flex-column justify-content-center align-items-center text-center py-5">
              <div class="placeholder-icon mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h5 class="text-muted">Enter an ID Number</h5>
              <p class="text-secondary mb-0">
                The verification result will appear here
              </p>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .form-control-lg {
      font-size: 1.5rem;
      letter-spacing: 0.25rem;
      padding: 1rem;
    }

    .id-preview {
      border: 1px solid var(--bs-border-color);
    }

    .id-card-wrapper {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      width: 100%;
    }

    .id-card {
      background: #f8f8f8;
      border: 2px solid #d0d0d0;
      border-radius: 0.5rem;
      padding: 1rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      position: relative;
      overflow: hidden;
      max-width: 100%;
      /* Maintain standard ID card aspect ratio (85.6mm x 53.98mm ≈ 1.586:1) */
      aspect-ratio: 1.586 / 1;
      min-height: 240px;
      
      /* Guilloché-style security pattern background */
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        opacity: 0.03;
        background-image: 
          /* Fine grid pattern */
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 1px,
            rgba(0, 0, 0, 0.1) 1px,
            rgba(0, 0, 0, 0.1) 2px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 1px,
            rgba(0, 0, 0, 0.1) 1px,
            rgba(0, 0, 0, 0.1) 2px
          ),
          /* Circular guilloché patterns */
          radial-gradient(
            circle at 25% 25%,
            rgba(0, 0, 0, 0.05) 0.5px,
            transparent 0.5px
          ),
          radial-gradient(
            circle at 75% 75%,
            rgba(0, 0, 0, 0.05) 0.5px,
            transparent 0.5px
          );
        background-size: 
          20px 20px,
          20px 20px,
          15px 15px,
          15px 15px;
        pointer-events: none;
        z-index: 0;
      }

      &.id-card-green {
        border-color: rgba(25, 135, 84, 0.3);
        box-shadow: 0 4px 12px rgba(25, 135, 84, 0.2);
      }

      &.id-card-amber {
        border-color: rgba(255, 193, 7, 0.3);
        box-shadow: 0 4px 12px rgba(255, 193, 7, 0.2);
      }

      &.id-card-red {
        border-color: rgba(220, 53, 69, 0.3);
        box-shadow: 0 4px 12px rgba(220, 53, 69, 0.2);
      }
    }

    .id-card-split {
      display: grid;
      grid-template-columns: 20% 1fr;
      gap: 1rem;
      height: 100%;
      position: relative;
      z-index: 1;
    }

    .id-card-left-section {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 4rem 0.5rem 0.5rem;
      border-right: 1px solid rgba(0, 0, 0, 0.1);
      overflow: visible;
    }

    .id-card-left-section .id-card-flag {
      flex-shrink: 0;
      margin-top: 0.5rem;
    }

    .id-logo-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 0.5rem;
      overflow: visible;
    }

    .id-card-right-section {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding:10px;
    }

    .id-card-header {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
      padding-right: 1rem;
      position: relative;
      z-index: 1;
    }

    .flag-image {
      width: 45px;
      height: 30px;
      object-fit: contain;
      display: block;
    }

    .id-card-title {
      flex: 1;
    }

    .id-card-title-main {
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #000;
      margin-bottom: 0.1rem;
      line-height: 1.15;
    }

    .id-card-title-sub {
      font-size: 0.825rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      color: #333;
      line-height: 1.15;
    }

    .id-card-body {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 1rem;
      margin-bottom: 0.75rem;
      flex: 1;
      position: relative;
      z-index: 1;
    }

    .id-card-info {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      padding-right: 1rem;
    }

    .id-info-row {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .id-info-label {
      font-size: 0.5625rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #6b9e78;
      line-height: 1.1;
    }

    .id-info-value {
      font-size: 0.75rem;
      font-weight: 700;
      color: #000;
      letter-spacing: 0.01em;
      word-break: break-word;
      line-height: 1.2;
    }

    .id-info-row-with-braille {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .id-info-content {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      flex: 1;
    }

    .id-braille-dots {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.2rem;
      margin-top: 0.2rem;
    }

    .braille-dot {
      width: 3px;
      height: 3px;
      background: #000;
      border-radius: 50%;
    }

    .id-status-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      
      &.status-green {
        background: rgba(25, 135, 84, 0.15);
        color: #198754;
      }
      
      &.status-amber {
        background: rgba(255, 193, 7, 0.2);
        color: #856404;
      }
      
      &.status-red {
        background: rgba(220, 53, 69, 0.15);
        color: #dc3545;
      }
    }

    .id-card-photo-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      position: relative;
    }

    .id-photo-wrapper {
      position: relative;
      width: 90px;
      height: 110px;
    }

    .id-photo-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 2.25rem;
      font-weight: 700;
      color: rgba(0, 0, 0, 0.08);
      z-index: 0;
      letter-spacing: 0.2em;
    }

    .id-photo-placeholder {
      width: 100%;
      height: 100%;
      background: #f0f0f0;
      border: 2px solid #d0d0d0;
      border-radius: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 1;

      .photo-icon {
        color: #999;
        width: 45px;
        height: 45px;
      }
    }


    .id-signature-area {
      width: 90px;
      text-align: center;
    }

    .signature-label {
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
      color: #6b9e78;
      margin-bottom: 0.2rem;
    }

    .signature-line {
      height: 30px;
      border-bottom: 2px solid #000;
      border-style: dashed;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .generic-signature {
      font-family: 'Brush Script MT', 'Lucida Handwriting', cursive, serif;
      font-size: 0.875rem;
      font-style: italic;
      color: #000;
      font-weight: 400;
      letter-spacing: 0.05em;
    }

    .id-card-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding-top: 0.5rem;
      margin-top: auto;
      border-top: 1px solid rgba(0, 0, 0, 0.1);
      position: relative;
      z-index: 1;
    }

    .id-logo {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      overflow: visible;
      white-space: nowrap;
    }

    .id-logo-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: linear-gradient(135deg, #8b4513 0%, #a0522d 50%, #cd853f 100%);
    }

    .id-logo-text {
      font-size: 1.875rem;
      font-weight: 700;
      font-style: italic;
      background: linear-gradient(135deg, #8b4513 0%, #a0522d 50%, #cd853f 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
      overflow: visible;
      padding-right:4px;
    }

    .id-verification-status {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.75rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;

      &.verification-green {
        background: rgba(25, 135, 84, 0.15);
        color: #198754;
      }

      &.verification-amber {
        background: rgba(255, 193, 7, 0.2);
        color: #856404;
      }

      &.verification-red {
        background: rgba(220, 53, 69, 0.15);
        color: #dc3545;
      }
    }

    .verification-status-icon {
      display: flex;
      align-items: center;
      
      svg {
        width: 14px;
        height: 14px;
      }
    }

    .id-card-actions {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .action-buttons {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;

      .btn-success {
        color: #fff !important;
        
        svg {
          color: #fff !important;
          stroke: #fff !important;
        }
      }
    }

    .duplicate-info {
      .alert {
        font-size: 0.875rem;
      }

      ul {
        padding-left: 1.5rem;
      }

      li {
        margin-bottom: 0.5rem;
      }
    }

     .placeholder-icon {
       opacity: 0.3;
     }

     /* Invalid ID Message Styles */
     .invalid-id-message {
       background: #fff;
       border: 2px solid #dc3545;
       border-radius: 1rem;
       padding: 3rem 2rem;
       text-align: center;
       box-shadow: 0 4px 12px rgba(220, 53, 69, 0.15);
       animation: fadeInUp 0.5s ease;
     }

     @keyframes fadeInUp {
       from {
         opacity: 0;
         transform: translateY(20px);
       }
       to {
         opacity: 1;
         transform: translateY(0);
       }
     }

     .invalid-icon-wrapper {
       margin-bottom: 1.5rem;
     }

     .invalid-icon-circle {
       width: 120px;
       height: 120px;
       margin: 0 auto;
       border-radius: 50%;
       background: linear-gradient(135deg, rgba(220, 53, 69, 0.1) 0%, rgba(220, 53, 69, 0.05) 100%);
       display: flex;
       align-items: center;
       justify-content: center;
       position: relative;
       animation: pulse 2s ease-in-out infinite;

       svg {
         color: #dc3545;
       }
     }

     @keyframes pulse {
       0%, 100% {
         transform: scale(1);
       }
       50% {
         transform: scale(1.05);
       }
     }

     .invalid-title {
       font-size: 1.75rem;
       font-weight: 700;
       color: #dc3545;
       margin-bottom: 1rem;
     }

     .invalid-message {
       font-size: 1.125rem;
       color: #666;
       margin-bottom: 1.5rem;
       line-height: 1.6;
       max-width: 500px;
       margin-left: auto;
       margin-right: auto;
     }

     .invalid-details {
       margin-bottom: 2rem;
       padding: 1rem;
       background: #f8f9fa;
       border-radius: 0.5rem;

       code {
         background: #fff;
         padding: 0.25rem 0.5rem;
         border-radius: 0.25rem;
         font-size: 0.875rem;
         color: #dc3545;
         font-weight: 600;
       }
     }

     .invalid-actions {
       display: flex;
       gap: 1rem;
       justify-content: center;
       flex-wrap: wrap;
     }

    @media (max-width: 991.98px) {
      .id-card-split {
        grid-template-columns: 1fr;
        gap: 0;
      }

      .id-card-left-section {
        display: none;
      }

      .id-card-body {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }

      .id-card-photo-section {
        align-items: flex-start;
      }

      .action-buttons {
        flex-direction: column;

        .btn {
          width: 100%;
        }
      }
    }

     @media (max-width: 575.98px) {
       .invalid-id-message {
         padding: 2rem 1.5rem;
       }

       .invalid-icon-circle {
         width: 100px;
         height: 100px;

         svg {
           width: 48px;
           height: 48px;
         }
       }

       .invalid-title {
         font-size: 1.5rem;
       }

       .invalid-message {
         font-size: 1rem;
       }

       .invalid-actions {
         flex-direction: column;

         .btn {
           width: 100%;
         }
       }

       .id-card {
         padding: 0.75rem;
         min-height: 200px;
       }

      .id-card-header {
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
      }

      .id-card-title-main {
        font-size: 0.8125rem;
      }

      .id-card-title-sub {
        font-size: 0.625rem;
      }

      .id-photo-wrapper {
        width: 80px;
        height: 100px;
      }

      .id-card-body {
        gap: 0.75rem;
        margin-bottom: 0.75rem;
      }

      .id-card-info {
        gap: 0.3rem;
      }

      .id-info-label {
        font-size: 0.5rem;
      }

      .id-info-value {
        font-size: 0.6875rem;
      }
    }
  `]
})
export class SingleVerifyComponent implements OnDestroy {
  private readonly verificationService = inject(VerificationService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  idNumber = '';
  loading = false;
  result: VerificationResponse | null = null;

  get isValidFormat(): boolean {
    return this.verificationService.isValidIdNumber(this.idNumber);
  }

  get extractedDob(): Date | null {
    return this.verificationService.extractDateOfBirth(this.idNumber);
  }

  get extractedGender(): string {
    return this.verificationService.extractGender(this.idNumber);
  }

  get extractedAge(): number {
    const dob = this.extractedDob;
    if (!dob) return 0;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onIdInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Only allow digits
    this.idNumber = input.value.replace(/\D/g, '');
  }

  verify(): void {
    if (!this.isValidFormat || this.loading) return;

    this.loading = true;
    this.result = null;

    this.verificationService
      .verifySingle(this.idNumber, '', '')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.result = response;
          this.loading = false;

          // Show notification based on status
          if (response.status === 'GREEN') {
            this.notificationService.success('Verification completed - Clear');
          } else if (response.status === 'AMBER') {
            this.notificationService.warning('Verification completed - Warning');
          } else {
            this.notificationService.error('Verification completed - Blocked');
          }
        },
        error: (error) => {
          this.loading = false;
          this.notificationService.error(error.message || 'Verification failed');
        }
      });
  }

  clearResult(): void {
    this.result = null;
  }

  verifyAnother(): void {
    this.result = null;
    this.idNumber = '';
  }

  maskIdNumber(idNumber: string): string {
    return this.verificationService.maskIdNumber(idNumber);
  }
}
