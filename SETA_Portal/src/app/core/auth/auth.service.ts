import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { StorageService } from '../services/storage.service';
import { ThemeService } from '../services/theme.service';
import { NotificationService } from '../services/notification.service';
import {
  User,
  UserRole,
  LoginRequest,
  LoginResponse,
  TokenRefreshRequest,
  TokenRefreshResponse,
  SetaBranding
} from '../../interfaces/user.interface';
import { SETA_IDS } from '../services/theme.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(StorageService);
  private readonly themeService = inject(ThemeService);
  private readonly notification = inject(NotificationService);

  private readonly baseUrl = environment.apiUrl;
  private readonly tokenRefreshMinutes = environment.tokenRefreshMinutes;

  private currentUser$ = new BehaviorSubject<User | null>(null);
  private isAuthenticated$ = new BehaviorSubject<boolean>(false);
  private isLoading$ = new BehaviorSubject<boolean>(false);
  private refreshTokenTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    this.initializeAuth();
  }

  // Public Observables
  get user$(): Observable<User | null> {
    return this.currentUser$.asObservable();
  }

  get authenticated$(): Observable<boolean> {
    return this.isAuthenticated$.asObservable();
  }

  get loading$(): Observable<boolean> {
    return this.isLoading$.asObservable();
  }

  // Current Values
  get currentUser(): User | null {
    return this.currentUser$.getValue();
  }

  get isAuthenticated(): boolean {
    return this.isAuthenticated$.getValue();
  }

  get token(): string | null {
    return this.storage.getToken();
  }

  // Initialize authentication state from storage
  private initializeAuth(): void {
    const token = this.storage.getToken();
    const user = this.storage.getUser<User>();

    if (token && user) {
      // Verify token is not expired
      if (this.isTokenValid(token)) {
        this.currentUser$.next(user);
        this.isAuthenticated$.next(true);
        this.startRefreshTokenTimer();

        // Restore theme
        const theme = this.storage.getTheme();
        if (theme) {
          this.themeService.applyTheme(theme);
        }
      } else {
        // Token expired, try to refresh
        this.refreshToken().subscribe({
          error: () => this.logout()
        });
      }
    }
  }

  // Mock users for development/demo (when API has no users in database)
  private readonly mockUsers: Record<string, { password: string; role: UserRole; fullName: string }> = {
    'admin.wrseta': { password: 'Admin@123', role: UserRole.Admin, fullName: 'Admin User' },
    'staff.wrseta': { password: 'Staff@123', role: UserRole.Staff, fullName: 'Staff Member' },
    'learner.wrseta': { password: 'Learn@123', role: UserRole.Learner, fullName: 'John Learner' }
  };

  // Login
  login(credentials: LoginRequest): Observable<LoginResponse> {
    this.isLoading$.next(true);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
      // Note: /auth/login endpoint does not require X-API-Key header
    });

    return this.http.post<any>(`${this.baseUrl}/auth/login`, {
      username: credentials.username,
      password: credentials.password
    }, { headers }).pipe(
      map(apiResponse => {
        // Transform API response to match LoginResponse interface
        // API returns: { success, data: { token, expiresAt, refreshToken, userId, username, name, surname, email, setaId, setaCode, setaName, userType } }
        const data = apiResponse.data || apiResponse;
        const setaCode = data.setaCode || credentials.setaCode || 'WRSETA';
        const setaName = data.setaName || 'Wholesale & Retail SETA';
        const theme = this.themeService.getTheme(setaCode);

        // Determine role from userType or username prefix
        const role = this.getRoleFromUserType(data.userType) || this.getRoleFromUsername(credentials.username);

        const loginResponse: LoginResponse = {
          success: apiResponse.success !== false,
          token: data.token,
          refreshToken: data.refreshToken,
          expiresAt: new Date(data.expiresAt),
          user: {
            id: data.userId || data.id || 0,
            username: data.username || credentials.username,
            email: data.email || `${credentials.username}@seta.gov.za`,
            fullName: data.name && data.surname
              ? `${data.name} ${data.surname}`
              : data.name || data.surname || credentials.username.split('.')[0].charAt(0).toUpperCase() +
              credentials.username.split('.')[0].slice(1) + ' User',
            role: role,
            setaId: data.setaId || 0,
            setaCode: setaCode,
            setaName: setaName,
            isActive: true,
            createdAt: new Date()
          },
          seta: {
            code: setaCode,
            name: setaName,
            logo: theme?.logo || `assets/images/setas/${setaCode.toLowerCase()}-logo.png`,
            colors: theme?.colors || {
              primary: '#008550',
              primaryDark: '#006640',
              secondary: '#666666',
              accent: '#00a651'
            }
          }
        };
        return loginResponse;
      }),
      tap(response => {
        if (response.success) {
          this.handleLoginSuccess(response, response.seta.code);
        }
      }),
      catchError(error => {
        this.isLoading$.next(false);

        // Extract error message from API response
        const errorMessage = error?.error?.error?.message ||
          error?.error?.message ||
          error?.message ||
          'Invalid username or password';

        // If API auth fails, try mock login for demo/development (only in development)
        if (!environment.production) {
          console.log('[Auth] API login failed, trying mock login...', error);
          return this.mockLogin(credentials);
        }

        // In production, return the error
        return throwError(() => ({
          error: {
            error: {
              code: error?.error?.error?.code || 'LOGIN_FAILED',
              message: errorMessage
            }
          }
        }));
      })
    );
  }

  // Mock login for development/demo when API has no users
  private mockLogin(credentials: LoginRequest): Observable<LoginResponse> {
    const mockUser = this.mockUsers[credentials.username.toLowerCase()];

    if (!mockUser || mockUser.password !== credentials.password) {
      this.isLoading$.next(false);
      return throwError(() => ({
        error: { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' } }
      }));
    }

    // Provide default SETA code if not specified
    const setaCode = credentials.setaCode || 'WRSETA';
    const setaId = SETA_IDS[setaCode.toUpperCase()] || 1;

    // Generate mock JWT token
    const mockToken = this.generateMockToken(credentials.username, setaCode, setaId);

    const theme = this.themeService.getTheme(setaCode);
    const setaName = theme?.name || setaCode;

    const response: LoginResponse = {
      success: true,
      token: mockToken,
      refreshToken: 'mock-refresh-' + Date.now(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      user: {
        id: 1,
        username: credentials.username,
        email: `${credentials.username}@seta.gov.za`,
        fullName: mockUser.fullName,
        role: mockUser.role,
        setaId: setaId,
        setaCode: setaCode.toUpperCase(),
        setaName: setaName,
        isActive: true,
        createdAt: new Date()
      },
      seta: {
        code: setaCode.toUpperCase(),
        name: setaName,
        logo: theme?.logo || `assets/images/setas/${setaCode.toLowerCase()}-logo.png`,
        colors: theme?.colors || {
          primary: '#008550',
          primaryDark: '#006640',
          secondary: '#666666',
          accent: '#00a651'
        }
      }
    };

    this.handleLoginSuccess(response, setaCode);
    return of(response);
  }

  // Generate a mock JWT token for development
  private generateMockToken(username: string, setaCode: string, setaId: number): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      sub: username,
      seta_id: setaId,
      seta_code: setaCode,
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    const base64Header = btoa(JSON.stringify(header));
    const base64Payload = btoa(JSON.stringify(payload));
    return `${base64Header}.${base64Payload}.mock-signature`;
  }

  private handleLoginSuccess(response: LoginResponse, setaCode: string): void {
    // Store tokens
    this.storage.setToken(response.token);
    this.storage.setRefreshToken(response.refreshToken);
    this.storage.setUser(response.user);

    // Store SETA info with API key
    const setaInfo = {
      ...response.seta,
      apiKey: this.getApiKeyForSeta(setaCode)
    };
    this.storage.setCurrentSeta(setaInfo);

    // Apply theme
    this.themeService.applyTheme(setaCode);

    // Update state
    this.currentUser$.next(response.user);
    this.isAuthenticated$.next(true);
    this.isLoading$.next(false);

    // Start token refresh timer
    this.startRefreshTokenTimer();
  }

  // Logout
  logout(): void {
    this.stopRefreshTokenTimer();
    this.storage.clearAll();
    this.themeService.clearTheme();
    this.currentUser$.next(null);
    this.isAuthenticated$.next(false);
    this.router.navigate(['/auth/login']);
  }

  // Refresh Token
  refreshToken(): Observable<TokenRefreshResponse> {
    const refreshToken = this.storage.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    const seta = this.storage.getCurrentSeta<{ apiKey: string }>();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-API-Key': seta?.apiKey || ''
    });

    return this.http.post<TokenRefreshResponse>(`${this.baseUrl}/auth/refresh`, {
      refreshToken
    } as TokenRefreshRequest, { headers }).pipe(
      tap(response => {
        if (response.success) {
          this.storage.setToken(response.token);
          this.startRefreshTokenTimer();
        }
      }),
      catchError(error => {
        this.logout();
        return throwError(() => error);
      })
    );
  }

  // Token Refresh Timer
  private startRefreshTokenTimer(): void {
    this.stopRefreshTokenTimer();

    const token = this.storage.getToken();
    if (!token) return;

    // Parse token expiration
    const expiry = this.getTokenExpiry(token);
    if (!expiry) return;

    // Refresh 5 minutes before expiry
    const refreshTime = expiry.getTime() - Date.now() - (this.tokenRefreshMinutes * 60 * 1000);

    if (refreshTime > 0) {
      this.refreshTokenTimeout = setTimeout(() => {
        this.refreshToken().subscribe();
      }, refreshTime);
    }
  }

  private stopRefreshTokenTimer(): void {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }
  }

  // Token Validation
  private isTokenValid(token: string): boolean {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) return false;
    return expiry.getTime() > Date.now();
  }

  private getTokenExpiry(token: string): Date | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp) {
        return new Date(payload.exp * 1000);
      }
      return null;
    } catch {
      return null;
    }
  }

  // Role Checking
  hasRole(role: UserRole | UserRole[]): boolean {
    const user = this.currentUser;
    if (!user) return false;

    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  }

  isAdmin(): boolean {
    return this.hasRole(UserRole.Admin);
  }

  isStaff(): boolean {
    return this.hasRole([UserRole.Admin, UserRole.Staff]);
  }

  isLearner(): boolean {
    return this.hasRole(UserRole.Learner);
  }

  // Determine user role from userType field
  private getRoleFromUserType(userType: string | null | undefined): UserRole | null {
    if (!userType) return null;
    const lowerType = userType.toLowerCase();
    if (lowerType.includes('admin') || lowerType === 'admin') {
      return UserRole.Admin;
    } else if (lowerType.includes('staff') || lowerType === 'staff' || lowerType === 'clerk') {
      return UserRole.Staff;
    } else if (lowerType.includes('learner') || lowerType === 'learner') {
      return UserRole.Learner;
    }
    return null;
  }

  // Determine user role from username pattern
  private getRoleFromUsername(username: string): UserRole {
    const lowerUsername = username.toLowerCase();
    if (lowerUsername.startsWith('admin')) {
      return UserRole.Admin;
    } else if (lowerUsername.startsWith('staff')) {
      return UserRole.Staff;
    } else if (lowerUsername.startsWith('learner')) {
      return UserRole.Learner;
    }
    // Default to Staff for unknown patterns
    return UserRole.Staff;
  }

  // API Key Management (In production, these would be fetched from a secure source)
  private getApiKeyForSeta(setaCode: string): string {
    // This is a simplified example - in production, API keys should be
    // securely managed and not hardcoded
    const apiKeys: Record<string, string> = {
      'WRSETA': 'wrseta-lms-key-2025',
      'MICT': 'mict-lms-key-2025',
      'AGRISETA': 'agriseta-lms-key-2025',
      'BANKSETA': 'bankseta-lms-key-2025',
      'CATHSSETA': 'cathsseta-lms-key-2025',
      'CETA': 'ceta-lms-key-2025',
      'CHIETA': 'chieta-lms-key-2025',
      'ETDPSETA': 'etdpseta-lms-key-2025',
      'EWSETA': 'ewseta-lms-key-2025',
      'FASSET': 'fasset-lms-key-2025',
      'FOODBEV': 'foodbev-lms-key-2025',
      'FPMSETA': 'fpmseta-lms-key-2025',
      'HWSETA': 'hwseta-lms-key-2025',
      'INSETA': 'inseta-lms-key-2025',
      'LGSETA': 'lgseta-lms-key-2025',
      'MERSETA': 'merseta-lms-key-2025',
      'MQA': 'mqa-lms-key-2025',
      'PSETA': 'pseta-lms-key-2025',
      'SASSETA': 'sasseta-lms-key-2025',
      'SERVICES': 'services-lms-key-2025',
      'TETA': 'teta-lms-key-2025'
    };
    return apiKeys[setaCode.toUpperCase()] || '';
  }
}
