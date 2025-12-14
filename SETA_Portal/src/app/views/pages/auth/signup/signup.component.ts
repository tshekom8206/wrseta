import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { AuthService } from '../../../../core/auth/auth.service';
import { ThemeService, SETA_THEMES, SETA_IDS } from '../../../../core/services/theme.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { IconService } from '../../../../core/services/icon.service';
import { SetaListItem } from '../../../../interfaces/seta.interface';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss'
})
export class SignupComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly iconService = inject(IconService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly http = inject(HttpClient);

  private destroy$ = new Subject<void>();
  private readonly apiUrl = environment.apiUrl;

  signupForm!: FormGroup;
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  errorMessage = '';

  // Available SETAs for dropdown
  setas: SetaListItem[] = [];
  selectedSeta: SetaListItem | null = null;
  currentYear = new Date().getFullYear();
  logoError = false;

  ngOnInit(): void {
    this.loadSetas();
    this.initializeForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.signupForm = this.fb.group({
      setaCode: ['WRSETA', Validators.required],
      name: ['', [Validators.required]],
      surname: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      idNumber: ['', [Validators.required, Validators.pattern(/^\d{13}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });

    // Watch for SETA selection changes
    this.signupForm.get('setaCode')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(code => this.onSetaChange(code));

    // Trigger initial SETA selection for WRSETA
    this.onSetaChange('WRSETA');
  }

  // Custom validator to check if passwords match
  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  private loadSetas(): void {
    // Convert theme data to list items
    this.setas = Object.values(SETA_THEMES).map(theme => ({
      id: 0,
      code: theme.code,
      name: theme.name,
      logo: theme.logo,
      primaryColor: theme.colors.primary
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  private onSetaChange(code: string): void {
    // Reset logo error state when SETA changes
    this.logoError = false;

    if (code) {
      const seta = this.setas.find(s => s.code === code);
      if (seta) {
        this.selectedSeta = seta;
        // Preview theme colors
        this.themeService.applyTheme(code);
      }
    } else {
      this.selectedSeta = null;
      this.themeService.clearTheme();
    }
  }

  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { setaCode, name, surname, email, username, idNumber, password } = this.signupForm.value;

    // Map setaCode to setaId
    const setaId = SETA_IDS[setaCode] || 1;

    // Prepare registration request body
    const registrationData = {
      username: username,
      password: password,
      name: name,
      surname: surname,
      email: email,
      setaId: setaId,
      userType: 'Learner',
      idNumber: idNumber,
      learnerId: null
    };

    // Prepare headers with API key
    const headers = new HttpHeaders({
      'accept': 'application/json',
      'Content-Type': 'application/json',
      'X-API-Key': 'wrseta-lms-key-2025'
    });

    // Make API call
    this.http.post<any>(`${this.apiUrl}/auth/register`, registrationData, { headers })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.notification.success(
              'Account created successfully!',
              response.data?.message || 'You can now login with your credentials.'
            );
            // Redirect to login page
            this.router.navigate(['/auth/login'], {
              queryParams: { email }
            });
          } else {
            this.errorMessage = response.message || 'Registration failed. Please try again.';
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Registration error:', error);
          this.errorMessage = error.error?.message || error.message || 'Registration failed. Please try again.';
          if (error.error?.errors && Array.isArray(error.error.errors)) {
            this.errorMessage = error.error.errors.join(', ');
          }
        }
      });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Form getters for template
  get f() {
    return this.signupForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.signupForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  getFieldError(fieldName: string): string {
    const field = this.signupForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) {
      return this.translate.instant('validation.required');
    }
    if (field.errors['email']) {
      return this.translate.instant('validation.email');
    }
    if (field.errors['minlength']) {
      return this.translate.instant('validation.minLength', {
        min: field.errors['minlength'].requiredLength
      });
    }
    if (field.errors['pattern']) {
      if (fieldName === 'idNumber') {
        return 'ID number must be exactly 13 digits';
      }
      return this.translate.instant('validation.pattern');
    }
    return '';
  }

  getPasswordMatchError(): string {
    if (this.signupForm.errors?.['passwordMismatch'] &&
      this.signupForm.get('confirmPassword')?.touched) {
      return 'Passwords do not match';
    }
    return '';
  }

  getSafeIcon(iconName: string): SafeHtml {
    const iconPath = this.iconService.getIconPath(iconName);
    return this.sanitizer.bypassSecurityTrustHtml(iconPath);
  }

  getLogoSrc(seta: SetaListItem): string {
    return seta.code === 'WRSETA'
      ? '/assets/images/logos/WRSETA_logo-2.png'
      : seta.logo;
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      this.logoError = true;
    }
  }
}

