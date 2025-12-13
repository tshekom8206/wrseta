import { Component, inject, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import { VerificationService } from '../../../../core/services/verification.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { BatchVerificationService, BatchJobStatus, BatchItemResult, BatchIdItem, RetryingItemInfo } from '../../../../core/services/batch-verification.service';
import { BatchVerificationResponse, VerificationResult } from '../../../../interfaces/verification.interface';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-batch-verify',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, PageHeaderComponent],
  template: `
    <app-page-header
      titleKey="verification.batchVerification"
      subtitleKey="verification.dragDropFile"
      icon="upload"
    ></app-page-header>

    <div class="row">
      <!-- Upload Section -->
      <div class="col-lg-5">
        <div class="card upload-card">
          <div class="card-header upload-header">
            <h5 class="card-title mb-0">
              <span class="card-title__icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </span>
              {{ 'verification.uploadFile' | translate }}
            </h5>
          </div>
          <div class="card-body upload-body">
            <!-- File Drop Zone -->
            <div
              class="drop-zone"
              [class.dragover]="isDragOver"
              [class.has-file]="selectedFile"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)"
              (click)="fileInput.click()"
              role="button"
              tabindex="0"
              (keydown.enter)="fileInput.click()"
              (keydown.space)="fileInput.click()"
              aria-label="Click or drop file to upload"
            >
              <input
                #fileInput
                type="file"
                accept=".csv,.xlsx,.xls"
                (change)="onFileSelected($event)"
                hidden
              />

              @if (!selectedFile) {
                <div class="drop-zone__content">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="drop-zone__icon">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <p class="drop-zone__text mb-1">{{ 'verification.dragDropFile' | translate }}</p>
                  <small class="text-muted">{{ 'verification.supportedFormats' | translate }}</small>
                </div>
              } @else {
                <div class="drop-zone__file">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-success">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  <div class="file-info">
                    <span class="file-name">{{ selectedFile.name }}</span>
                    <small class="text-muted">{{ formatFileSize(selectedFile.size) }}</small>
                  </div>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger"
                    (click)="clearFile($event)"
                    aria-label="Remove file"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              }
            </div>

            <!-- Manual Entry -->
            <div class="divider-premium my-4">
              <span>OR</span>
            </div>

            <div class="mb-4">
              <label for="idNumbers" class="form-label-premium">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="me-2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                Paste ID Numbers (one per line)
              </label>
              <textarea
                id="idNumbers"
                class="form-control font-monospace textarea-premium"
                rows="6"
                [(ngModel)]="manualInput"
                placeholder="8501015009087&#10;9012125009088&#10;7803125009089"
              ></textarea>
              <div class="form-text-premium">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="me-1">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                {{ 'verification.maxRecords' | translate }}
              </div>
            </div>

            <!-- Process Button -->
            <button
              type="button"
              class="btn btn-process-premium btn-lg w-100"
              [disabled]="(!selectedFile && !manualInput) || processing || asyncProcessing"
              (click)="processVerification()"
            >
              @if (processing || asyncProcessing) {
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                @if (asyncProcessing && batchStatus) {
                  Processing {{ batchStatus.processedCount }}/{{ batchStatus.totalItems }}...
                } @else {
                  {{ 'batch.submitting' | translate }}
                }
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                Process Batch
              }
            </button>

            <!-- Async Processing Progress -->
            @if (asyncProcessing && batchStatus) {
              <div class="progress-section-premium mt-4">
                <div class="progress-header-premium">
                  <div class="d-flex align-items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="progress-header-icon">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                    <span class="progress-header-label">{{ 'batch.progress' | translate }}</span>
                  </div>
                  <span class="progress-status-badge" [ngClass]="{
                    'status-pending': batchStatus.status === 'PENDING',
                    'status-processing': batchStatus.status === 'PROCESSING',
                    'status-completed': batchStatus.status === 'COMPLETED',
                    'status-partial': batchStatus.status === 'PARTIAL',
                    'status-failed': batchStatus.status === 'FAILED'
                  }">
                    {{ batchStatus.status }}
                  </span>
                </div>
                <div class="progress-bar-wrapper-premium">
                  <div
                    class="progress-bar-premium"
                    role="progressbar"
                    [style.width.%]="batchStatus.progressPercent"
                    [attr.aria-valuenow]="batchStatus.progressPercent"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    [ngClass]="{
                      'bg-processing': batchStatus.status === 'PROCESSING',
                      'bg-completed': batchStatus.status === 'COMPLETED',
                      'bg-partial': batchStatus.status === 'PARTIAL',
                      'bg-failed': batchStatus.status === 'FAILED'
                    }"
                  ></div>
                </div>
                <div class="d-flex justify-content-between mt-2">
                  <small class="progress-text">{{ batchStatus.processedCount }} / {{ batchStatus.totalItems }} processed</small>
                  <small class="progress-text progress-percentage">{{ batchStatus.progressPercent }}%</small>
                </div>

                <!-- Live Stats -->
                <div class="row g-2 mt-4">
                  <div class="col-3">
                    <div class="mini-stat-premium mini-stat-success">
                      <div class="mini-stat-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                      </div>
                      <div class="mini-stat-content">
                        <span class="mini-stat-value">{{ batchStatus.greenCount }}</span>
                        <span class="mini-stat-label">Green</span>
                      </div>
                    </div>
                  </div>
                  <div class="col-3">
                    <div class="mini-stat-premium mini-stat-warning">
                      <div class="mini-stat-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                          <line x1="12" y1="9" x2="12" y2="13"></line>
                          <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                      </div>
                      <div class="mini-stat-content">
                        <span class="mini-stat-value">{{ batchStatus.yellowCount }}</span>
                        <span class="mini-stat-label">Yellow</span>
                      </div>
                    </div>
                  </div>
                  <div class="col-3">
                    <div class="mini-stat-premium mini-stat-danger">
                      <div class="mini-stat-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="15" y1="9" x2="9" y2="15"></line>
                          <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                      </div>
                      <div class="mini-stat-content">
                        <span class="mini-stat-value">{{ batchStatus.redCount }}</span>
                        <span class="mini-stat-label">Red</span>
                      </div>
                    </div>
                  </div>
                  <div class="col-3">
                    <div class="mini-stat-premium mini-stat-secondary">
                      <div class="mini-stat-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                      </div>
                      <div class="mini-stat-content">
                        <span class="mini-stat-value">{{ batchStatus.failedCount }}</span>
                        <span class="mini-stat-label">Failed</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Current Activity -->
                @if (batchStatus.currentActivity) {
                  <div class="current-activity mt-3">
                    <div class="d-flex align-items-center">
                      <div class="spinner-grow spinner-grow-sm text-primary me-2" role="status">
                        <span class="visually-hidden">Processing...</span>
                      </div>
                      <span class="text-muted small">{{ batchStatus.currentActivity }}</span>
                    </div>
                  </div>
                }

                <!-- Retry Status -->
                @if (batchStatus.retryingCount && batchStatus.retryingCount > 0) {
                  <div class="retry-status mt-3">
                    <div class="alert alert-warning py-2 mb-2">
                      <div class="d-flex align-items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                          <polyline points="23 4 23 10 17 10"></polyline>
                          <polyline points="1 20 1 14 7 14"></polyline>
                          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        <strong>{{ batchStatus.retryingCount }}</strong>
                        <span class="ms-1">{{ batchStatus.retryingCount === 1 ? 'item' : 'items' }} being retried</span>
                      </div>
                    </div>

                    @if (batchStatus.retryingItems && batchStatus.retryingItems.length > 0) {
                      <div class="retrying-items">
                        @for (item of batchStatus.retryingItems; track item.idNumber) {
                          <div class="retrying-item d-flex justify-content-between align-items-center">
                            <div>
                              <code class="me-2">{{ maskIdNumber(item.idNumber) }}</code>
                              <span class="badge bg-warning text-dark">
                                Retry {{ item.retryAttempt }}/{{ item.maxRetries }}
                              </span>
                            </div>
                            <small class="text-muted">{{ item.reason }}</small>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }

                <!-- Exhausted Retries Warning -->
                @if (batchStatus.exhaustedRetriesCount && batchStatus.exhaustedRetriesCount > 0) {
                  <div class="alert alert-danger py-2 mt-3 mb-0">
                    <div class="d-flex align-items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <strong>{{ batchStatus.exhaustedRetriesCount }}</strong>
                      <span class="ms-1">{{ batchStatus.exhaustedRetriesCount === 1 ? 'item' : 'items' }} failed after max retries</span>
                    </div>
                  </div>
                }

                @if (currentBatchId) {
                  <div class="mt-3">
                    <small class="text-muted">Batch ID: <code>{{ currentBatchId }}</code></small>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Results Section -->
      <div class="col-lg-7">
        @if (result || asyncResults.length > 0) {
          <div class="card results-card">
            <div class="card-header results-header">
              <div class="d-flex justify-content-between align-items-center">
                <h5 class="card-title mb-0">
                  <span class="card-title__icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </span>
                  {{ 'verification.result' | translate }}
                </h5>
                <div class="d-flex gap-2">
                  <button class="btn btn-sm btn-outline-primary" (click)="exportResults()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Export
                  </button>
                  <button class="btn btn-sm btn-outline-secondary" (click)="clearResults()">
                    Clear
                  </button>
                </div>
              </div>
            </div>
            <div class="card-body results-body">
              <!-- Summary Stats -->
              <div class="row g-4 mb-4">
                <div class="col-6 col-md-3">
                  <div class="stat-card-batch">
                    <div class="stat-card__icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                    </div>
                    <div class="stat-card__content">
                      <span class="stat-card__label">{{ 'verification.totalProcessed' | translate }}</span>
                      <div class="stat-card__value-row">
                        <span class="stat-card__value">{{ getTotalProcessed() }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="stat-card-batch stat-card-batch--success">
                    <div class="stat-card__icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </div>
                    <div class="stat-card__content">
                      <span class="stat-card__label">Green (Clear)</span>
                      <div class="stat-card__value-row">
                        <span class="stat-card__value">{{ getTotalGreen() }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="stat-card-batch stat-card-batch--warning">
                    <div class="stat-card__icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                    </div>
                    <div class="stat-card__content">
                      <span class="stat-card__label">Yellow (Review)</span>
                      <div class="stat-card__value-row">
                        <span class="stat-card__value">{{ getTotalYellow() }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="stat-card-batch stat-card-batch--danger">
                    <div class="stat-card__icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                      </svg>
                    </div>
                    <div class="stat-card__content">
                      <span class="stat-card__label">Red (Blocked)</span>
                      <div class="stat-card__value-row">
                        <span class="stat-card__value">{{ getTotalRed() }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Filter Tabs -->
              <div class="filter-tabs-premium mb-4">
                <button
                  class="filter-tab"
                  [class.active]="activeFilter === 'all'"
                  (click)="setFilter('all')"
                  type="button"
                >
                  <span class="filter-tab-badge">{{ getAllResults().length }}</span>
                  <span class="filter-tab-label">All</span>
                </button>
                <button
                  class="filter-tab filter-tab-green"
                  [class.active]="activeFilter === 'GREEN'"
                  (click)="setFilter('GREEN')"
                  type="button"
                >
                  <span class="filter-tab-badge">{{ getTotalGreen() }}</span>
                  <span class="filter-tab-label">Green</span>
                </button>
                <button
                  class="filter-tab filter-tab-yellow"
                  [class.active]="activeFilter === 'YELLOW'"
                  (click)="setFilter('YELLOW')"
                  type="button"
                >
                  <span class="filter-tab-badge">{{ getTotalYellow() }}</span>
                  <span class="filter-tab-label">Yellow</span>
                </button>
                <button
                  class="filter-tab filter-tab-red"
                  [class.active]="activeFilter === 'RED'"
                  (click)="setFilter('RED')"
                  type="button"
                >
                  <span class="filter-tab-badge">{{ getTotalRed() }}</span>
                  <span class="filter-tab-label">Red</span>
                </button>
              </div>

              <!-- Results Table -->
              <div class="table-responsive table-premium-wrapper">
                <table class="table table-premium">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{{ 'verification.idNumber' | translate }}</th>
                      <th>{{ 'common.status' | translate }}</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of filteredResults; track item.idNumber; let i = $index) {
                      <tr>
                        <td class="text-muted">{{ i + 1 }}</td>
                        <td><code>{{ maskIdNumber(item.idNumber) }}</code></td>
                        <td>
                          <span
                            class="badge status-badge-premium"
                            [class.bg-success]="item.status === 'GREEN'"
                            [class.bg-warning]="item.status === 'YELLOW' || item.status === 'AMBER'"
                            [class.text-dark]="item.status === 'YELLOW' || item.status === 'AMBER'"
                            [class.bg-danger]="item.status === 'RED' || item.status === 'FAILED'"
                          >
                            {{ item.status }}
                          </span>
                        </td>
                        <td class="text-muted small">{{ item.message }}</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="4" class="text-center text-muted py-4">
                          No results match the selected filter
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              @if (batchStatus && batchStatus.completedAt) {
                <div class="text-muted small text-end mt-2">
                  {{ 'verification.processedAt' | translate }}: {{ batchStatus.completedAt | date:'dd MMM yyyy, HH:mm' }}
                </div>
              } @else if (result && result.processedAt) {
                <div class="text-muted small text-end mt-2">
                  {{ 'verification.processedAt' | translate }}: {{ result.processedAt | date:'dd MMM yyyy, HH:mm' }}
                </div>
              }
            </div>
          </div>
        } @else {
          <!-- Placeholder -->
          <div class="card placeholder-card h-100">
            <div class="card-body d-flex flex-column justify-content-center align-items-center text-center py-5">
              <div class="placeholder-icon-premium mb-4">
                <div class="placeholder-icon-circle">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
              </div>
              <h5 class="placeholder-title">Upload a File or Paste IDs</h5>
              <p class="placeholder-text mb-0">
                Batch verification results will appear here
              </p>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    // Premium Upload Card
    .upload-card {
      border: 1px solid rgba(0, 0, 0, 0.06);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }

    .upload-header {
      background: linear-gradient(135deg, rgba(0, 133, 80, 0.04) 0%, rgba(0, 133, 80, 0.01) 100%);
      border-bottom: 1px solid rgba(0, 133, 80, 0.1);
      padding: 1.25rem 1.5rem;
      position: relative;

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 1.5rem;
        right: 1.5rem;
        height: 1px;
        background: rgba(0, 133, 80, 0.15);
      }

      .card-title {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        font-size: 1.125rem;
        color: var(--seta-text-primary, #212529);
      }

      .card-title__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 0.5rem;
        background: rgba(0, 133, 80, 0.1);
        color: var(--seta-primary, #008550);
        flex-shrink: 0;

        svg {
          width: 18px;
          height: 18px;
        }
      }
    }

    .upload-body {
      padding: 1.75rem 1.5rem;
      background: linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(248, 249, 250, 0.5) 100%);
    }

    .drop-zone {
      border: 2px dashed rgba(0, 133, 80, 0.3);
      border-radius: 0.75rem;
      padding: 2.5rem 2rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      background: linear-gradient(135deg, rgba(0, 133, 80, 0.02) 0%, rgba(0, 133, 80, 0.01) 100%);
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(0, 133, 80, 0.1) 0%, transparent 70%);
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      &:hover::before, &.dragover::before {
        opacity: 1;
      }

      &:hover, &.dragover {
        border-color: var(--seta-primary, #008550);
        background: linear-gradient(135deg, rgba(0, 133, 80, 0.08) 0%, rgba(0, 133, 80, 0.04) 100%);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 133, 80, 0.15);
      }

      &.has-file {
        border-style: solid;
        border-color: var(--bs-success, #198754);
        background: linear-gradient(135deg, rgba(25, 135, 84, 0.08) 0%, rgba(25, 135, 84, 0.04) 100%);
      }
    }

    .drop-zone__icon {
      color: var(--seta-primary, #008550);
      margin-bottom: 1rem;
      transition: transform 0.3s ease;
    }

    .drop-zone:hover .drop-zone__icon,
    .drop-zone.dragover .drop-zone__icon {
      transform: translateY(-4px);
    }

    .drop-zone__text {
      font-weight: 600;
      color: var(--seta-text-primary, #212529);
      font-size: 1rem;
    }

    .drop-zone__file {
      display: flex;
      align-items: center;
      gap: 1rem;
      text-align: left;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.8);
      border-radius: 0.5rem;
    }

    .file-info {
      flex: 1;
      min-width: 0;
    }

    .file-name {
      display: block;
      font-weight: 600;
      color: var(--seta-text-primary, #212529);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .divider-premium {
      display: flex;
      align-items: center;
      color: var(--bs-secondary);
      margin: 1.5rem 0;

      &::before, &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, 0.1) 50%, transparent 100%);
      }

      span {
        padding: 0 1.5rem;
        font-size: 0.8125rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 600;
        color: var(--bs-secondary);
      }
    }

    .form-label-premium {
      display: flex;
      align-items: center;
      font-weight: 600;
      color: var(--seta-text-primary, #212529);
      margin-bottom: 0.75rem;
      font-size: 0.9375rem;

      svg {
        color: var(--seta-primary, #008550);
        opacity: 0.7;
      }
    }

    .textarea-premium {
      border: 2px solid rgba(0, 0, 0, 0.08);
      border-radius: 0.625rem;
      padding: 1rem;
      font-size: 0.875rem;
      line-height: 1.6;
      transition: all 0.2s ease;
      background: #ffffff;

      &:focus {
        border-color: var(--seta-primary, #008550);
        box-shadow: 0 0 0 4px rgba(0, 133, 80, 0.1);
        outline: none;
      }
    }

    .form-text-premium {
      display: flex;
      align-items: center;
      margin-top: 0.5rem;
      font-size: 0.8125rem;
      color: var(--bs-secondary);

      svg {
        color: var(--bs-secondary);
        opacity: 0.6;
      }
    }

    .btn-process-premium {
      background: linear-gradient(135deg, var(--seta-primary, #008550) 0%, var(--seta-primary-dark, #006640) 100%);
      border: none;
      color: #fff;
      font-weight: 600;
      padding: 1rem 2rem;
      border-radius: 0.75rem;
      box-shadow: 0 4px 12px rgba(0, 133, 80, 0.3);
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: 0.9375rem;

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 133, 80, 0.4);
        background: linear-gradient(135deg, var(--seta-primary-light, #00a866) 0%, var(--seta-primary, #008550) 100%);
      }

      &:active:not(:disabled) {
        transform: translateY(0);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    // Premium Results Card
    .results-card {
      border: 1px solid rgba(0, 0, 0, 0.06);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }

    .results-header {
      background: linear-gradient(135deg, rgba(0, 133, 80, 0.04) 0%, rgba(0, 133, 80, 0.01) 100%);
      border-bottom: 1px solid rgba(0, 133, 80, 0.1);
      padding: 1.25rem 1.5rem;
      position: relative;

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 1.5rem;
        right: 1.5rem;
        height: 1px;
        background: rgba(0, 133, 80, 0.15);
      }

      .card-title {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        font-size: 1.125rem;
        color: var(--seta-text-primary, #212529);
      }

      .card-title__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 0.5rem;
        background: rgba(0, 133, 80, 0.1);
        color: var(--seta-primary, #008550);
        flex-shrink: 0;

        svg {
          width: 18px;
          height: 18px;
        }
      }
    }

    .results-body {
      padding: 1.75rem 1.5rem;
      background: linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(248, 249, 250, 0.5) 100%);
    }

    // Dashboard-style Stat Cards
    .stat-card-batch {
      position: relative;
      display: flex;
      flex-direction: column;
      padding: 1.5rem;
      background: var(--bs-white);
      border-radius: 0.75rem;
      border: 1px solid rgba(0, 0, 0, 0.06);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      transition: box-shadow 0.2s ease, transform 0.2s ease;
      height: 100%;
      width: 100%;
      box-sizing: border-box;
      overflow: visible;

      &:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
      }
    }

    .stat-card-batch .stat-card__icon {
      position: absolute;
      top: -8px;
      left: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: 0.75rem;
      flex-shrink: 0;
      background: var(--seta-primary, #008550);
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
      color: var(--bs-white);
      transition: box-shadow 0.2s ease;
      z-index: 2;

      svg {
        width: 24px;
        height: 24px;
      }
    }

    .stat-card-batch:hover .stat-card__icon {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .stat-card-batch--success .stat-card__icon,
    .stat-card-batch--warning .stat-card__icon,
    .stat-card-batch--danger .stat-card__icon {
      background: var(--seta-primary, #008550);
    }

    .stat-card-batch--success .stat-card__icon {
      background: var(--bs-success, #198754);
    }

    .stat-card-batch--warning .stat-card__icon {
      background: var(--bs-warning, #ffc107);
    }

    .stat-card-batch--danger .stat-card__icon {
      background: var(--bs-danger, #dc3545);
    }

    .stat-card-batch .stat-card__content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      text-align: left;
      margin-top: 1.5rem;
      padding-top: 0.75rem;
      position: relative;
      z-index: 0;
    }

    .stat-card-batch .stat-card__label {
      display: block;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--bs-secondary, #6c757d);
      margin-bottom: 0.75rem;
      line-height: 1.4;
    }

    .stat-card-batch .stat-card__value-row {
      display: flex;
      align-items: baseline;
      justify-content: flex-start;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .stat-card-batch .stat-card__value {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--bs-dark, #212529);
      line-height: 1.2;
      letter-spacing: -0.02em;
    }

    // Premium Filter Tabs
    .filter-tabs-premium {
      display: flex;
      gap: 0.75rem;
      padding: 0.5rem;
      background: #f8f9fa;
      border-radius: 0.625rem;
      flex-wrap: wrap;
    }

    .filter-tab {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      background: #ffffff;
      border: 2px solid transparent;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--seta-text-primary, #212529);
      cursor: pointer;
      transition: all 0.2s ease;
      flex: 1;
      min-width: 0;
      justify-content: center;

      &:hover:not(.active) {
        background: rgba(0, 133, 80, 0.05);
        border-color: rgba(0, 133, 80, 0.1);
      }

      &.active {
        background: var(--seta-primary, #008550);
        border-color: var(--seta-primary, #008550);
        color: #fff;
        box-shadow: 0 2px 8px rgba(0, 133, 80, 0.3);
      }

      &.filter-tab-green.active {
        background: var(--bs-success, #198754);
        border-color: var(--bs-success, #198754);
      }

      &.filter-tab-yellow.active {
        background: #ffc107;
        border-color: #ffc107;
        color: #212529;
      }

      &.filter-tab-red.active {
        background: var(--bs-danger, #dc3545);
        border-color: var(--bs-danger, #dc3545);
      }
    }

    .filter-tab-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 24px;
      padding: 0 0.5rem;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 700;
      transition: all 0.2s ease;
    }

    .filter-tab.active .filter-tab-badge {
      background: rgba(255, 255, 255, 0.3);
      color: inherit;
    }

    .filter-tab-label {
      white-space: nowrap;
    }

    // Premium Table
    .table-premium-wrapper {
      border-radius: 0.625rem;
      overflow: hidden;
      border: 1px solid rgba(0, 0, 0, 0.05);
    }

    .table-premium {
      margin-bottom: 0;
      background: #ffffff;

      thead {
        background: linear-gradient(135deg, rgba(0, 133, 80, 0.04) 0%, rgba(0, 133, 80, 0.01) 100%);

        th {
          font-weight: 600;
          font-size: 0.8125rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--seta-text-primary, #212529);
          padding: 1rem;
          border-bottom: 2px solid rgba(0, 133, 80, 0.1);
        }
      }

      tbody {
        tr {
          transition: all 0.2s ease;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);

          &:hover {
            background: rgba(0, 133, 80, 0.03);
            transform: scale(1.01);
          }

          td {
            padding: 1rem;
            vertical-align: middle;
          }
        }
      }
    }

    .table-premium code {
      font-size: 0.8125rem;
      background: rgba(0, 0, 0, 0.05);
      padding: 0.375rem 0.625rem;
      border-radius: 0.375rem;
      font-weight: 500;
      color: var(--seta-text-primary, #212529);
    }

    .status-badge-premium {
      display: inline-block;
      min-width: 70px;
      text-align: center;
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.025em;
      border-radius: 0.375rem;
    }

    .placeholder-card {
      border: 1px solid rgba(0, 0, 0, 0.06);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .placeholder-icon-premium {
      position: relative;
    }

    .placeholder-icon-circle {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(0, 133, 80, 0.08) 0%, rgba(0, 133, 80, 0.04) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.8;
        transform: scale(1.05);
      }
    }

    .placeholder-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--seta-text-primary, #212529);
      margin-bottom: 0.5rem;
    }

    .placeholder-text {
      font-size: 0.9375rem;
      color: var(--bs-secondary, #6c757d);
    }

    // Premium Progress Section
    .progress-section-premium {
      padding: 1.5rem;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.05);
      border-radius: 0.625rem;
    }

    .progress-header-premium {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .progress-header-label {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--seta-text-primary, #212529);
    }

    .progress-header-icon {
      color: var(--seta-primary, #008550);
    }

    .progress-status-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.375rem 0.75rem;
      border-radius: 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;

      &.status-pending {
        background: rgba(108, 117, 125, 0.15);
        color: var(--bs-secondary, #6c757d);
      }

      &.status-processing {
        background: rgba(0, 133, 80, 0.15);
        color: var(--seta-primary, #008550);
      }

      &.status-completed {
        background: rgba(25, 135, 84, 0.15);
        color: var(--bs-success, #198754);
      }

      &.status-partial {
        background: rgba(255, 193, 7, 0.2);
        color: #856404;
      }

      &.status-failed {
        background: rgba(220, 53, 69, 0.15);
        color: var(--bs-danger, #dc3545);
      }
    }

    .progress-bar-wrapper-premium {
      width: 100%;
      height: 12px;
      background: #e9ecef;
      border-radius: 6px;
      overflow: hidden;
      position: relative;
    }

    .progress-bar-premium {
      height: 100%;
      border-radius: 6px;
      transition: width 0.6s ease;
      position: relative;
      overflow: hidden;

      &.bg-processing {
        background: linear-gradient(90deg, var(--seta-primary, #008550) 0%, var(--seta-primary-light, #00a866) 100%);
      }

      &.bg-completed {
        background: linear-gradient(90deg, var(--bs-success, #198754) 0%, #20c997 100%);
      }

      &.bg-partial {
        background: linear-gradient(90deg, #ffc107 0%, #ffca2c 100%);
      }

      &.bg-failed {
        background: linear-gradient(90deg, var(--bs-danger, #dc3545) 0%, #e4606d 100%);
      }

      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
        animation: shimmer 2s infinite;
      }
    }

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .progress-text {
      font-size: 0.8125rem;
      color: var(--bs-secondary, #6c757d);
      font-weight: 500;
    }

    .progress-percentage {
      font-weight: 700;
      color: var(--seta-primary, #008550);
    }

    .mini-stat-premium {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.05);
      border-radius: 0.5rem;
      transition: all 0.2s ease;

      &:hover {
        border-color: rgba(0, 133, 80, 0.15);
        box-shadow: 0 2px 6px rgba(0, 133, 80, 0.08);
      }
    }

    .mini-stat-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 0.375rem;
      flex-shrink: 0;
    }

    .mini-stat-success .mini-stat-icon {
      background: rgba(25, 135, 84, 0.1);
      color: var(--bs-success, #198754);
    }

    .mini-stat-warning .mini-stat-icon {
      background: rgba(255, 193, 7, 0.15);
      color: #ffc107;
    }

    .mini-stat-danger .mini-stat-icon {
      background: rgba(220, 53, 69, 0.1);
      color: var(--bs-danger, #dc3545);
    }

    .mini-stat-secondary .mini-stat-icon {
      background: rgba(108, 117, 125, 0.1);
      color: var(--bs-secondary, #6c757d);
    }

    .mini-stat-content {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      flex: 1;
      min-width: 0;
    }

    .mini-stat-value {
      font-size: 1.125rem;
      font-weight: 700;
      line-height: 1.2;
    }

    .mini-stat-success .mini-stat-value {
      color: var(--bs-success, #198754);
    }

    .mini-stat-warning .mini-stat-value {
      color: #ffc107;
    }

    .mini-stat-danger .mini-stat-value {
      color: var(--bs-danger, #dc3545);
    }

    .mini-stat-secondary .mini-stat-value {
      color: var(--bs-secondary, #6c757d);
    }

    .mini-stat-label {
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
      color: var(--bs-secondary, #6c757d);
    }

    .current-activity {
      padding: 0.875rem;
      background: linear-gradient(135deg, rgba(0, 133, 80, 0.05) 0%, rgba(0, 133, 80, 0.02) 100%);
      border-radius: 0.5rem;
      border-left: 3px solid var(--seta-primary, #008550);
    }

    .retry-status .alert {
      font-size: 0.875rem;
    }

    .retrying-items {
      max-height: 150px;
      overflow-y: auto;
      background: var(--bs-light);
      border-radius: 0.375rem;
      padding: 0.5rem;
    }

    .retrying-item {
      padding: 0.5rem;
      border-bottom: 1px solid var(--bs-border-color);
      font-size: 0.8125rem;

      &:last-child {
        border-bottom: none;
      }

      code {
        font-size: 0.75rem;
        background: rgba(0, 0, 0, 0.05);
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
      }
    }
  `]
})
export class BatchVerifyComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private readonly verificationService = inject(VerificationService);
  private readonly notificationService = inject(NotificationService);
  private readonly batchService = inject(BatchVerificationService);
  private readonly destroy$ = new Subject<void>();

  selectedFile: File | null = null;
  manualInput = '';
  isDragOver = false;
  processing = false;
  processedCount = 0;
  totalCount = 0;

  // Async batch processing
  asyncProcessing = false;
  batchStatus: BatchJobStatus | null = null;
  asyncResults: BatchItemResult[] = [];
  currentBatchId: string | null = null;

  result: BatchVerificationResponse | null = null;
  activeFilter: 'all' | 'GREEN' | 'YELLOW' | 'RED' = 'all';

  get filteredResults(): any[] {
    const allResults = this.getAllResults();
    if (this.activeFilter === 'all') return allResults;
    return allResults.filter(r => {
      // Handle both YELLOW and AMBER status
      if (this.activeFilter === 'YELLOW') {
        return r.status === 'YELLOW' || r.status === 'AMBER';
      }
      return r.status === this.activeFilter;
    });
  }

  ngOnInit(): void {
    // Subscribe to batch status updates
    this.batchService.status$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.batchStatus = status;

        // Check if processing is complete
        if (status && ['COMPLETED', 'FAILED', 'PARTIAL'].includes(status.status)) {
          this.onBatchComplete(status);
        }
      });
  }

  private onBatchComplete(status: BatchJobStatus): void {
    this.asyncProcessing = false;

    // Fetch results
    if (this.currentBatchId) {
      this.batchService.getAllResults(this.currentBatchId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (results) => {
            this.asyncResults = results;
          },
          error: (error) => {
            console.error('Failed to fetch results:', error);
          }
        });
    }

    // Show notification
    const message = status.status === 'COMPLETED'
      ? `Batch verification complete: ${status.greenCount} verified, ${status.yellowCount} need review, ${status.redCount} blocked`
      : status.status === 'PARTIAL'
        ? `Batch verification partially complete: ${status.processedCount}/${status.totalItems} processed, ${status.failedCount} failed`
        : `Batch verification failed. Please try again.`;

    if (status.status === 'COMPLETED') {
      this.notificationService.success(message);
    } else if (status.status === 'PARTIAL') {
      this.notificationService.warning(message);
    } else {
      this.notificationService.error(message);
    }
  }

  // Helper methods for combined results
  getAllResults(): any[] {
    if (this.asyncResults.length > 0) {
      return this.asyncResults;
    }
    return this.result?.results || [];
  }

  getTotalProcessed(): number {
    if (this.batchStatus) {
      return this.batchStatus.processedCount;
    }
    return this.result?.totalProcessed || 0;
  }

  getTotalGreen(): number {
    if (this.batchStatus) {
      return this.batchStatus.greenCount;
    }
    return this.result?.totalGreen || 0;
  }

  getTotalYellow(): number {
    if (this.batchStatus) {
      return this.batchStatus.yellowCount;
    }
    return this.result?.totalAmber || 0;
  }

  getTotalRed(): number {
    if (this.batchStatus) {
      return this.batchStatus.redCount;
    }
    return this.result?.totalRed || 0;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  private handleFile(file: File): void {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const validExtensions = ['.csv', '.xls', '.xlsx'];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(extension)) {
      this.notificationService.error('Invalid file type. Please upload CSV or Excel file.');
      return;
    }

    this.selectedFile = file;
    this.manualInput = '';
  }

  clearFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async processVerification(): Promise<void> {
    let verificationItems: Array<{ idNumber: string; firstName?: string; surname?: string; reference?: string }> = [];

    if (this.selectedFile) {
      verificationItems = await this.parseFile(this.selectedFile);
    } else if (this.manualInput) {
      verificationItems = this.parseManualInput(this.manualInput);
    }

    if (verificationItems.length === 0) {
      this.notificationService.warning('No valid ID numbers found');
      return;
    }

    // Check batch size limits
    // Bulk API supports up to 100, fallback method supports up to 500
    if (verificationItems.length > 500) {
      this.notificationService.error('Maximum 500 records per batch. Please split your file.');
      return;
    }

    // Warn if over bulk API limit (will use fallback)
    if (verificationItems.length > 100) {
      this.notificationService.info('Batch size exceeds 100 records. Will use fallback verification method if bulk API is unavailable.');
    }

    // Reset state
    this.result = null;
    this.asyncResults = [];
    this.batchStatus = null;
    this.currentBatchId = null;
    this.activeFilter = 'all';

    // Use bulk verification API
    this.processing = true;
    this.asyncProcessing = false;
    this.processBulkVerification(verificationItems);
  }


  private processBulkVerification(verificationItems: Array<{ idNumber: string; firstName?: string; surname?: string; reference?: string }>): void {
    this.totalCount = verificationItems.length;
    this.processedCount = 0;

    // Simulate progress
    const progressInterval = setInterval(() => {
      if (this.processedCount < this.totalCount) {
        this.processedCount = Math.min(this.processedCount + Math.floor(Math.random() * 20) + 5, this.totalCount);
      }
    }, 200);

    // Try bulk verification API first
    this.verificationService
      .verifyBulk(verificationItems)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          clearInterval(progressInterval);
          this.processedCount = this.totalCount;
          this.result = response;
          this.processing = false;
          this.asyncProcessing = false;

          this.notificationService.success(
            `Batch verification complete: ${response.totalGreen} clear, ${response.totalAmber} warning, ${response.totalRed} blocked`
          );
        },
        error: (error) => {
          clearInterval(progressInterval);

          // Check if we should fall back to the previous method
          const errorMessage = error.message || error.error?.error?.message || '';
          const isBatchTooLarge = errorMessage.includes('Maximum 100') ||
            errorMessage.includes('BATCH_TOO_LARGE') ||
            error.error?.error?.code === 'BATCH_TOO_LARGE';
          const isEndpointDown = error.status === 0 ||
            error.status === 503 ||
            error.status === 502 ||
            error.status >= 500 ||
            (error.error?.error?.code === 'SERVICE_UNAVAILABLE');

          if (isEndpointDown || isBatchTooLarge) {
            // Fall back to previous batch verification method
            console.warn('Bulk verification unavailable or batch too large, falling back to batch verification:', error);
            const fallbackMessage = isBatchTooLarge
              ? 'Batch size exceeds bulk API limit, using fallback method...'
              : 'Bulk verification endpoint unavailable, using fallback method...';
            this.notificationService.warning(fallbackMessage);
            this.processFallbackVerification(verificationItems);
          } else {
            // Other errors (validation, etc.) - show error
            this.processing = false;
            this.asyncProcessing = false;
            this.notificationService.error(error.message || 'Batch verification failed');
          }
        }
      });
  }

  private processFallbackVerification(verificationItems: Array<{ idNumber: string; firstName?: string; surname?: string; reference?: string }>): void {
    // Extract just the ID numbers for the fallback method
    const idNumbers = verificationItems.map(item => item.idNumber);

    this.totalCount = idNumbers.length;
    this.processedCount = 0;

    // Simulate progress
    const progressInterval = setInterval(() => {
      if (this.processedCount < this.totalCount) {
        this.processedCount = Math.min(this.processedCount + Math.floor(Math.random() * 20) + 5, this.totalCount);
      }
    }, 200);

    // Use the previous batch verification method (verifyBatch)
    this.verificationService
      .verifyBatch(idNumbers)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          clearInterval(progressInterval);
          this.processedCount = this.totalCount;
          this.result = response;
          this.processing = false;
          this.asyncProcessing = false;

          this.notificationService.success(
            `Batch verification complete (fallback method): ${response.totalGreen} clear, ${response.totalAmber} warning, ${response.totalRed} blocked`
          );
        },
        error: (error) => {
          clearInterval(progressInterval);
          this.processing = false;
          this.asyncProcessing = false;
          this.notificationService.error(error.message || 'Batch verification failed');
        }
      });
  }

  private async parseFile(file: File): Promise<Array<{ idNumber: string; firstName?: string; surname?: string; reference?: string }>> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result as string;
        const items = this.extractVerificationItems(content, file.name);
        resolve(items);
      };

      reader.onerror = () => {
        this.notificationService.error('Failed to read file');
        resolve([]);
      };

      // Check if it's an Excel file
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // For Excel files, we'll read as text and try to parse CSV-like structure
        // In a production app, you'd use a library like xlsx to parse Excel files
        reader.readAsText(file);
      } else {
        // CSV file
        reader.readAsText(file);
      }
    });
  }

  private parseManualInput(input: string): Array<{ idNumber: string; firstName?: string; surname?: string; reference?: string }> {
    return this.extractVerificationItems(input);
  }

  private extractVerificationItems(content: string, fileName?: string): Array<{ idNumber: string; firstName?: string; surname?: string; reference?: string }> {
    // Split by newlines
    const lines = content.split(/[\n\r]+/).filter(line => line.trim().length > 0);

    const items: Array<{ idNumber: string; firstName?: string; surname?: string; reference?: string }> = [];
    const seenIds = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Try to parse as CSV (comma or tab separated)
      const parts = line.split(/[,\t]/).map(p => p.trim());

      if (parts.length >= 1) {
        // Extract ID number (first column or extract from line)
        let idNumber = parts[0].replace(/\D/g, '');

        // If first part doesn't look like an ID, try to extract ID from the whole line
        if (idNumber.length !== 13) {
          idNumber = line.replace(/\D/g, '');
        }

        // Validate ID number
        if (idNumber.length === 13 && this.verificationService.isValidIdNumber(idNumber)) {
          // Skip duplicates
          if (seenIds.has(idNumber)) continue;
          seenIds.add(idNumber);

          // Extract optional fields
          const firstName = parts.length > 1 ? parts[1] : undefined;
          const surname = parts.length > 2 ? parts[2] : undefined;
          const reference = parts.length > 3 ? parts[3] : `Item-${items.length + 1}`;

          items.push({
            idNumber,
            firstName: firstName || '',
            surname: surname || '',
            reference: reference || `Item-${items.length + 1}`
          });
        }
      } else {
        // No delimiters found, try to extract ID number from the line
        const idNumber = line.replace(/\D/g, '');
        if (idNumber.length === 13 && this.verificationService.isValidIdNumber(idNumber)) {
          if (!seenIds.has(idNumber)) {
            seenIds.add(idNumber);
            items.push({
              idNumber,
              firstName: '',
              surname: '',
              reference: `Item-${items.length + 1}`
            });
          }
        }
      }
    }

    return items;
  }

  setFilter(filter: 'all' | 'GREEN' | 'YELLOW' | 'RED'): void {
    this.activeFilter = filter;
  }

  maskIdNumber(idNumber: string): string {
    return this.verificationService.maskIdNumber(idNumber);
  }

  clearResults(): void {
    this.result = null;
    this.asyncResults = [];
    this.batchStatus = null;
    this.currentBatchId = null;
    this.asyncProcessing = false;
    this.selectedFile = null;
    this.manualInput = '';
    this.batchService.reset();
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  exportResults(): void {
    const allResults = this.getAllResults();
    if (allResults.length === 0) return;

    let headers: string[];
    let rows: string[][];

    if (this.asyncResults.length > 0) {
      // Export async results
      headers = ['ID Number', 'Reference', 'Status', 'Name', 'Message'];
      rows = allResults.map((r: BatchItemResult) => [
        r.idNumber,
        r.reference || '',
        r.status,
        r.fullName || '',
        r.message
      ]);
    } else {
      // Export sync results
      headers = ['ID Number', 'Status', 'Is Duplicate', 'Message'];
      rows = allResults.map((r: any) => [
        r.idNumber,
        r.status,
        r.isDuplicate ? 'Yes' : 'No',
        r.message
      ]);
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const batchId = this.currentBatchId || new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `batch-verification-${batchId}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.notificationService.success('Results exported to CSV');
  }
}
