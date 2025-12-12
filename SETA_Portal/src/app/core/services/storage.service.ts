import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly TOKEN_KEY = 'seta_token';
  private readonly REFRESH_TOKEN_KEY = 'seta_refresh_token';
  private readonly USER_KEY = 'seta_user';
  private readonly THEME_KEY = 'seta_theme';
  private readonly LANGUAGE_KEY = 'seta_language';
  private readonly SETA_KEY = 'seta_current';

  // Token Management
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  removeRefreshToken(): void {
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  // User Management
  getUser<T>(): T | null {
    const user = localStorage.getItem(this.USER_KEY);
    if (user) {
      try {
        return JSON.parse(user) as T;
      } catch {
        return null;
      }
    }
    return null;
  }

  setUser<T>(user: T): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  removeUser(): void {
    localStorage.removeItem(this.USER_KEY);
  }

  // Theme Management
  getTheme(): string | null {
    return localStorage.getItem(this.THEME_KEY);
  }

  setTheme(theme: string): void {
    localStorage.setItem(this.THEME_KEY, theme);
  }

  removeTheme(): void {
    localStorage.removeItem(this.THEME_KEY);
  }

  // Language Management
  getLanguage(): string {
    return localStorage.getItem(this.LANGUAGE_KEY) || 'en';
  }

  setLanguage(language: string): void {
    localStorage.setItem(this.LANGUAGE_KEY, language);
  }

  // Current SETA Management
  getCurrentSeta<T>(): T | null {
    const seta = localStorage.getItem(this.SETA_KEY);
    if (seta) {
      try {
        return JSON.parse(seta) as T;
      } catch {
        return null;
      }
    }
    return null;
  }

  setCurrentSeta<T>(seta: T): void {
    localStorage.setItem(this.SETA_KEY, JSON.stringify(seta));
  }

  removeCurrentSeta(): void {
    localStorage.removeItem(this.SETA_KEY);
  }

  // Generic Storage Operations
  get<T>(key: string): T | null {
    const item = localStorage.getItem(key);
    if (item) {
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as unknown as T;
      }
    }
    return null;
  }

  set<T>(key: string, value: T): void {
    if (typeof value === 'string') {
      localStorage.setItem(key, value);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  // Clear all SETA-related storage
  clearAll(): void {
    this.removeToken();
    this.removeRefreshToken();
    this.removeUser();
    this.removeTheme();
    this.removeCurrentSeta();
    // Keep language preference
  }

  // Session Storage (for temporary data)
  getSession<T>(key: string): T | null {
    const item = sessionStorage.getItem(key);
    if (item) {
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as unknown as T;
      }
    }
    return null;
  }

  setSession<T>(key: string, value: T): void {
    if (typeof value === 'string') {
      sessionStorage.setItem(key, value);
    } else {
      sessionStorage.setItem(key, JSON.stringify(value));
    }
  }

  removeSession(key: string): void {
    sessionStorage.removeItem(key);
  }

  clearSession(): void {
    sessionStorage.clear();
  }
}
