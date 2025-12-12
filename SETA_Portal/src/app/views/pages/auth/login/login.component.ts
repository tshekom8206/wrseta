import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { ThemeService, SETA_THEMES } from '../../../../core/services/theme.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SetaListItem } from '../../../../interfaces/seta.interface';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notification = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  private destroy$ = new Subject<void>();

  loginForm!: FormGroup;
  isLoading = false;
  showPassword = false;
  errorMessage = '';
  returnUrl = '/dashboard';

  // Available SETAs for dropdown
  setas: SetaListItem[] = [];
  selectedSeta: SetaListItem | null = null;
  currentYear = new Date().getFullYear();

  ngOnInit(): void {
    this.initializeForm();
    this.loadSetas();
    this.getReturnUrl();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.loginForm = this.fb.group({
      setaCode: ['', Validators.required],
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });

    // Watch for SETA selection changes
    this.loginForm.get('setaCode')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(code => this.onSetaChange(code));
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

  private getReturnUrl(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  private onSetaChange(code: string): void {
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
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { setaCode, username, password } = this.loginForm.value;

    this.authService.login({ setaCode, username, password, setaId: 0 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.notification.success(
              this.translate.instant('auth.welcomeBack'),
              response.user.fullName
            );
            this.router.navigateByUrl(this.returnUrl);
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.message || this.translate.instant('auth.invalidCredentials');
          this.notification.error(this.errorMessage);
        }
      });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  // Form getters for template
  get f() {
    return this.loginForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) {
      return this.translate.instant('validation.required');
    }
    if (field.errors['minlength']) {
      return this.translate.instant('validation.minLength', {
        min: field.errors['minlength'].requiredLength
      });
    }
    return '';
  }
}
