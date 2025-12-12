import { Component, inject, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import { VerificationService } from '../../../../core/services/verification.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { BatchVerificationResponse, VerificationResult } from '../../../../interfaces/verification.interface';

@Component({
  selector: 'app-batch-verify',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'verification.batchVerification' | translate }}</h1>
      <p class="page-subtitle">{{ 'verification.dragDropFile' | translate }}</p>
    </div>

    <div class="row">
      <!-- Upload Section -->
      <div class="col-lg-5">
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">{{ 'verification.uploadFile' | translate }}</h5>
          </div>
          <div class="card-body">
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
            <div class="divider my-4">
              <span>OR</span>
            </div>

            <div class="mb-3">
              <label for="idNumbers" class="form-label">Paste ID Numbers (one per line)</label>
              <textarea
                id="idNumbers"
                class="form-control font-monospace"
                rows="6"
                [(ngModel)]="manualInput"
                placeholder="8501015009087&#10;9012125009088&#10;7803125009089"
              ></textarea>
              <div class="form-text">{{ 'verification.maxRecords' | translate }}</div>
            </div>

            <!-- Process Button -->
            <button
              type="button"
              class="btn btn-primary btn-lg w-100"
              [disabled]="(!selectedFile && !manualInput) || processing"
              (click)="processVerification()"
            >
              @if (processing) {
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                Processing {{ processedCount }}/{{ totalCount }}...
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                Process Batch
              }
            </button>
          </div>
        </div>
      </div>

      <!-- Results Section -->
      <div class="col-lg-7">
        @if (result) {
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="card-title mb-0">{{ 'verification.result' | translate }}</h5>
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
            <div class="card-body">
              <!-- Summary Stats -->
              <div class="row g-3 mb-4">
                <div class="col-6 col-md-3">
                  <div class="stat-box">
                    <span class="stat-value">{{ result.totalProcessed }}</span>
                    <span class="stat-label">{{ 'verification.totalProcessed' | translate }}</span>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="stat-box stat-green">
                    <span class="stat-value">{{ result.totalGreen }}</span>
                    <span class="stat-label">Green (Clear)</span>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="stat-box stat-amber">
                    <span class="stat-value">{{ result.totalAmber }}</span>
                    <span class="stat-label">Amber (Warning)</span>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="stat-box stat-red">
                    <span class="stat-value">{{ result.totalRed }}</span>
                    <span class="stat-label">Red (Blocked)</span>
                  </div>
                </div>
              </div>

              <!-- Filter Tabs -->
              <ul class="nav nav-tabs mb-3" role="tablist">
                <li class="nav-item" role="presentation">
                  <button
                    class="nav-link"
                    [class.active]="activeFilter === 'all'"
                    (click)="setFilter('all')"
                    type="button"
                  >
                    All ({{ result.results.length }})
                  </button>
                </li>
                <li class="nav-item" role="presentation">
                  <button
                    class="nav-link"
                    [class.active]="activeFilter === 'GREEN'"
                    (click)="setFilter('GREEN')"
                    type="button"
                  >
                    <span class="badge bg-success me-1">{{ result.totalGreen }}</span> Green
                  </button>
                </li>
                <li class="nav-item" role="presentation">
                  <button
                    class="nav-link"
                    [class.active]="activeFilter === 'AMBER'"
                    (click)="setFilter('AMBER')"
                    type="button"
                  >
                    <span class="badge bg-warning text-dark me-1">{{ result.totalAmber }}</span> Amber
                  </button>
                </li>
                <li class="nav-item" role="presentation">
                  <button
                    class="nav-link"
                    [class.active]="activeFilter === 'RED'"
                    (click)="setFilter('RED')"
                    type="button"
                  >
                    <span class="badge bg-danger me-1">{{ result.totalRed }}</span> Red
                  </button>
                </li>
              </ul>

              <!-- Results Table -->
              <div class="table-responsive">
                <table class="table table-hover">
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
                            class="badge"
                            [class.bg-success]="item.status === 'GREEN'"
                            [class.bg-warning]="item.status === 'AMBER'"
                            [class.text-dark]="item.status === 'AMBER'"
                            [class.bg-danger]="item.status === 'RED'"
                          >
                            {{ item.status }}
                          </span>
                          @if (item.isDuplicate) {
                            <span class="badge bg-secondary ms-1">Duplicate</span>
                          }
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

              <div class="text-muted small text-end mt-2">
                {{ 'verification.processedAt' | translate }}: {{ result.processedAt | date:'dd MMM yyyy, HH:mm' }}
              </div>
            </div>
          </div>
        } @else {
          <!-- Placeholder -->
          <div class="card h-100">
            <div class="card-body d-flex flex-column justify-content-center align-items-center text-center py-5">
              <div class="placeholder-icon mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              </div>
              <h5 class="text-muted">Upload a File or Paste IDs</h5>
              <p class="text-secondary mb-0">
                Batch verification results will appear here
              </p>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .drop-zone {
      border: 2px dashed var(--bs-border-color);
      border-radius: 0.5rem;
      padding: 2rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover, &.dragover {
        border-color: var(--seta-primary, var(--bs-primary));
        background: rgba(var(--bs-primary-rgb), 0.05);
      }

      &.has-file {
        border-style: solid;
        border-color: var(--bs-success);
        background: rgba(25, 135, 84, 0.05);
      }
    }

    .drop-zone__icon {
      color: var(--bs-secondary);
      margin-bottom: 0.5rem;
    }

    .drop-zone__text {
      font-weight: 500;
      color: var(--bs-dark);
    }

    .drop-zone__file {
      display: flex;
      align-items: center;
      gap: 1rem;
      text-align: left;
    }

    .file-info {
      flex: 1;
      min-width: 0;
    }

    .file-name {
      display: block;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .divider {
      display: flex;
      align-items: center;
      color: var(--bs-secondary);

      &::before, &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--bs-border-color);
      }

      span {
        padding: 0 1rem;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
    }

    textarea.font-monospace {
      font-size: 0.875rem;
      line-height: 1.6;
    }

    .stat-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem;
      background: var(--bs-light);
      border-radius: 0.5rem;
      text-align: center;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--bs-secondary);
    }

    .stat-green {
      background: rgba(25, 135, 84, 0.1);
      .stat-value { color: var(--bs-success); }
    }

    .stat-amber {
      background: rgba(255, 193, 7, 0.15);
      .stat-value { color: #856404; }
    }

    .stat-red {
      background: rgba(220, 53, 69, 0.1);
      .stat-value { color: var(--bs-danger); }
    }

    .nav-tabs .nav-link {
      font-size: 0.875rem;
    }

    table code {
      font-size: 0.8125rem;
      background: var(--bs-light);
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
    }

    .placeholder-icon {
      opacity: 0.3;
    }
  `]
})
export class BatchVerifyComponent implements OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private readonly verificationService = inject(VerificationService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  selectedFile: File | null = null;
  manualInput = '';
  isDragOver = false;
  processing = false;
  processedCount = 0;
  totalCount = 0;

  result: BatchVerificationResponse | null = null;
  activeFilter: 'all' | 'GREEN' | 'AMBER' | 'RED' = 'all';

  get filteredResults(): VerificationResult[] {
    if (!this.result) return [];
    if (this.activeFilter === 'all') return this.result.results;
    return this.result.results.filter(r => r.status === this.activeFilter);
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
    let idNumbers: string[] = [];

    if (this.selectedFile) {
      idNumbers = await this.parseFile(this.selectedFile);
    } else if (this.manualInput) {
      idNumbers = this.parseManualInput(this.manualInput);
    }

    if (idNumbers.length === 0) {
      this.notificationService.warning('No valid ID numbers found');
      return;
    }

    if (idNumbers.length > 500) {
      this.notificationService.error('Maximum 500 records per batch. Please split your file.');
      return;
    }

    this.processing = true;
    this.totalCount = idNumbers.length;
    this.processedCount = 0;
    this.result = null;

    // Simulate progress
    const progressInterval = setInterval(() => {
      if (this.processedCount < this.totalCount) {
        this.processedCount = Math.min(this.processedCount + Math.floor(Math.random() * 20) + 5, this.totalCount);
      }
    }, 200);

    this.verificationService
      .verifyBatch(idNumbers)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          clearInterval(progressInterval);
          this.processedCount = this.totalCount;
          this.result = response;
          this.processing = false;
          this.activeFilter = 'all';

          this.notificationService.success(
            `Batch verification complete: ${response.totalGreen} clear, ${response.totalAmber} warning, ${response.totalRed} blocked`
          );
        },
        error: (error) => {
          clearInterval(progressInterval);
          this.processing = false;
          this.notificationService.error(error.message || 'Batch verification failed');
        }
      });
  }

  private async parseFile(file: File): Promise<string[]> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result as string;
        const idNumbers = this.extractIdNumbers(content);
        resolve(idNumbers);
      };

      reader.onerror = () => {
        this.notificationService.error('Failed to read file');
        resolve([]);
      };

      reader.readAsText(file);
    });
  }

  private parseManualInput(input: string): string[] {
    return this.extractIdNumbers(input);
  }

  private extractIdNumbers(content: string): string[] {
    // Split by newlines, commas, semicolons, or tabs
    const lines = content.split(/[\n\r,;\t]+/);

    const idNumbers: string[] = [];
    for (const line of lines) {
      // Extract only digits
      const cleaned = line.replace(/\D/g, '');

      // Check if it's a valid 13-digit ID
      if (cleaned.length === 13 && this.verificationService.isValidIdNumber(cleaned)) {
        idNumbers.push(cleaned);
      }
    }

    // Remove duplicates
    return [...new Set(idNumbers)];
  }

  setFilter(filter: 'all' | 'GREEN' | 'AMBER' | 'RED'): void {
    this.activeFilter = filter;
  }

  maskIdNumber(idNumber: string): string {
    return this.verificationService.maskIdNumber(idNumber);
  }

  clearResults(): void {
    this.result = null;
    this.selectedFile = null;
    this.manualInput = '';
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  exportResults(): void {
    if (!this.result) return;

    const headers = ['ID Number', 'Status', 'Is Duplicate', 'Message'];
    const rows = this.result.results.map(r => [
      r.idNumber,
      r.status,
      r.isDuplicate ? 'Yes' : 'No',
      r.message
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `batch-verification-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.notificationService.success('Results exported to CSV');
  }
}
