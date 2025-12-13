import { Injectable, inject, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { StorageService } from './storage.service';
import { SetaTheme, SetaColors } from '../../interfaces/seta.interface';

// SETA ID to Code mapping (from API)
export const SETA_IDS: Record<string, number> = {
  'WRSETA': 1,
  'MICT': 2,
  'SERVICES': 3,
  'CETA': 4,
  'CHIETA': 5,
  'ETDPSETA': 6,
  'EWSETA': 7,
  'FASSET': 8,
  'FOODBEV': 9,
  'FPMSETA': 10,
  'HWSETA': 11,
  'INSETA': 12,
  'LGSETA': 13,
  'MERSETA': 14,
  'MQA': 15,
  'PSETA': 16,
  'SASSETA': 17,
  'AGRISETA': 18,
  'CATHSSETA': 19,
  'TETA': 20,
  'BANKSETA': 21
};

// SETA Theme Configurations
export const SETA_THEMES: Record<string, SetaTheme> = {
  'WRSETA': {
    code: 'WRSETA',
    name: 'Wholesale & Retail SETA',
    logo: '/assets/images/logos/WRSETA_logo-2.png',
    colors: {
      primary: '#008550',
      primaryDark: '#006640',
      primaryLight: '#00a866',
      secondary: '#666666',
      secondaryDark: '#444444',
      accent: '#00a651',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
      textPrimary: '#212529',
      textSecondary: '#6c757d',
      background: '#f8f9fa',
      surface: '#ffffff'
    }
  },
  'MICT': {
    code: 'MICT',
    name: 'Media, ICT and Electronics SETA',
    logo: 'assets/images/setas/mict-logo.png',
    colors: {
      primary: '#2ea3f2',
      primaryDark: '#1a8ad4',
      primaryLight: '#5bb8f5',
      secondary: '#1e3a5f',
      secondaryDark: '#0f1e32',
      accent: '#ff6b00',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
      textPrimary: '#212529',
      textSecondary: '#6c757d',
      background: '#f8f9fa',
      surface: '#ffffff'
    }
  },
  'AGRISETA': {
    code: 'AGRISETA',
    name: 'Agriculture Sector Education & Training Authority',
    logo: 'assets/images/setas/agriseta-logo.png',
    colors: {
      primary: '#4a7c23',
      primaryDark: '#385e1a',
      primaryLight: '#5c9a2c',
      secondary: '#8b4513',
      secondaryDark: '#6b350f',
      accent: '#ffd700',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
      textPrimary: '#212529',
      textSecondary: '#6c757d',
      background: '#f8f9fa',
      surface: '#ffffff'
    }
  },
  'BANKSETA': {
    code: 'BANKSETA',
    name: 'Banking Sector Education & Training Authority',
    logo: 'assets/images/setas/bankseta-logo.png',
    colors: {
      primary: '#003087',
      primaryDark: '#002266',
      primaryLight: '#0044aa',
      secondary: '#c4a000',
      secondaryDark: '#998000',
      accent: '#00a651',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
      textPrimary: '#212529',
      textSecondary: '#6c757d',
      background: '#f8f9fa',
      surface: '#ffffff'
    }
  },
  'CATHSSETA': {
    code: 'CATHSSETA',
    name: 'Culture, Arts, Tourism, Hospitality & Sport SETA',
    logo: 'assets/images/setas/cathsseta-logo.png',
    colors: {
      primary: '#8b2332',
      primaryDark: '#6e1c28',
      primaryLight: '#a82a3d',
      secondary: '#d4af37',
      secondaryDark: '#b8960f',
      accent: '#4a90d9',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
      textPrimary: '#212529',
      textSecondary: '#6c757d',
      background: '#f8f9fa',
      surface: '#ffffff'
    }
  },
  'CETA': {
    code: 'CETA',
    name: 'Construction Education & Training Authority',
    logo: 'assets/images/setas/ceta-logo.png',
    colors: {
      primary: '#e65100',
      primaryDark: '#bf4400',
      primaryLight: '#ff6d00',
      secondary: '#37474f',
      secondaryDark: '#263238',
      accent: '#ffc107',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
      textPrimary: '#212529',
      textSecondary: '#6c757d',
      background: '#f8f9fa',
      surface: '#ffffff'
    }
  },
  'CHIETA': {
    code: 'CHIETA',
    name: 'Chemical Industries Education & Training Authority',
    logo: 'assets/images/setas/chieta-logo.png',
    colors: {
      primary: '#1565c0',
      primaryDark: '#0d47a1',
      primaryLight: '#1976d2',
      secondary: '#00897b',
      secondaryDark: '#00695c',
      accent: '#ff5722',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
      textPrimary: '#212529',
      textSecondary: '#6c757d',
      background: '#f8f9fa',
      surface: '#ffffff'
    }
  },
  'ETDPSETA': {
    code: 'ETDPSETA',
    name: 'Education, Training & Development Practices SETA',
    logo: 'assets/images/setas/etdpseta-logo.png',
    colors: {
      primary: '#6a1b9a',
      primaryDark: '#4a148c',
      primaryLight: '#7b1fa2',
      secondary: '#00897b',
      secondaryDark: '#00695c',
      accent: '#ffc107',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
      textPrimary: '#212529',
      textSecondary: '#6c757d',
      background: '#f8f9fa',
      surface: '#ffffff'
    }
  },
  'EWSETA': {
    code: 'EWSETA',
    name: 'Energy & Water Sector Education & Training Authority',
    logo: 'assets/images/setas/ewseta-logo.png',
    colors: {
      primary: '#0277bd',
      primaryDark: '#01579b',
      primaryLight: '#0288d1',
      secondary: '#558b2f',
      secondaryDark: '#33691e',
      accent: '#ffb300',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
      textPrimary: '#212529',
      textSecondary: '#6c757d',
      background: '#f8f9fa',
      surface: '#ffffff'
    }
  },
  'FASSET': {
    code: 'FASSET',
    name: 'Finance, Accounting, Management Consulting & Other Financial Services SETA',
    logo: 'assets/images/setas/fasset-logo.png',
    colors: {
      primary: '#1a237e',
      primaryDark: '#0d1642',
      primaryLight: '#283593',
      secondary: '#c62828',
      secondaryDark: '#b71c1c',
      accent: '#ffd600',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
      textPrimary: '#212529',
      textSecondary: '#6c757d',
      background: '#f8f9fa',
      surface: '#ffffff'
    }
  },
  'FOODBEV': {
    code: 'FOODBEV',
    name: 'Food & Beverages Manufacturing SETA',
    logo: 'assets/images/setas/foodbev-logo.png',
    colors: {
      primary: '#bf360c',
      primaryDark: '#8f2a09',
      primaryLight: '#e64a19',
      secondary: '#2e7d32',
      secondaryDark: '#1b5e20',
      accent: '#ffc107',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
      textPrimary: '#212529',
      textSecondary: '#6c757d',
      background: '#f8f9fa',
      surface: '#ffffff'
    }
  },
  'FPMSETA': {
    code: 'FPMSETA',
    name: 'Fibre Processing & Manufacturing SETA',
    logo: 'assets/images/setas/fpmseta-logo.png',
    colors: {
      primary: '#5d4037',
      primaryDark: '#4e342e',
      primaryLight: '#6d4c41',
      secondary: '#00695c',
      secondaryDark: '#004d40',
      accent: '#ffb300',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
      textPrimary: '#212529',
      textSecondary: '#6c757d',
      background: '#f8f9fa',
      surface: '#ffffff'
    }
  },
  'HWSETA': {
    code: 'HWSETA',
    name: 'Health & Welfare SETA',
    logo: 'assets/images/setas/hwseta-logo.png',
    colors: {
      primary: '#00838f',
      primaryDark: '#006064',
      primaryLight: '#0097a7',
      secondary: '#c62828',
      secondaryDark: '#b71c1c',
      accent: '#7cb342',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
      textPrimary: '#212529',
      textSecondary: '#6c757d',
      background: '#f8f9fa',
      surface: '#ffffff'
    }
  },
  'INSETA': {
    code: 'INSETA',
    name: 'Insurance Sector Education & Training Authority',
    logo: 'assets/images/setas/inseta-logo.png',
    colors: {
      primary: '#004d40',
      primaryDark: '#00332a',
      primaryLight: '#00695c',
      secondary: '#bf360c',
      secondaryDark: '#8f2a09',
      accent: '#ffd600',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
      textPrimary: '#212529',
      textSecondary: '#6c757d',
      background: '#f8f9fa',
      surface: '#ffffff'
    }
  },
  'LGSETA': {
    code: 'LGSETA',
    name: 'Local Government SETA',
    logo: 'assets/images/setas/lgseta-logo.png',
    colors: {
      primary: '#1565c0',
      primaryDark: '#0d47a1',
      primaryLight: '#1976d2',
      secondary: '#00838f',
      secondaryDark: '#006064',
      accent: '#ffab00',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
      textPrimary: '#212529',
      textSecondary: '#6c757d',
      background: '#f8f9fa',
      surface: '#ffffff'
    }
  },
  'MERSETA': {
    code: 'MERSETA',
    name: 'Manufacturing, Engineering & Related Services SETA',
    logo: 'assets/images/setas/merseta-logo.png',
    colors: {
      primary: '#263238',
      primaryDark: '#1a2327',
      primaryLight: '#37474f',
      secondary: '#e65100',
      secondaryDark: '#bf4400',
      accent: '#ffc107',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
      textPrimary: '#212529',
      textSecondary: '#6c757d',
      background: '#f8f9fa',
      surface: '#ffffff'
    }
  },
  'MQA': {
    code: 'MQA',
    name: 'Mining Qualifications Authority',
    logo: 'assets/images/setas/mqa-logo.png',
    colors: {
      primary: '#37474f',
      primaryDark: '#263238',
      primaryLight: '#455a64',
      secondary: '#ffc107',
      secondaryDark: '#ffa000',
      accent: '#2196f3',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
      textPrimary: '#212529',
      textSecondary: '#6c757d',
      background: '#f8f9fa',
      surface: '#ffffff'
    }
  },
  'PSETA': {
    code: 'PSETA',
    name: 'Public Service Sector Education & Training Authority',
    logo: 'assets/images/setas/pseta-logo.png',
    colors: {
      primary: '#1a237e',
      primaryDark: '#0d1642',
      primaryLight: '#283593',
      secondary: '#00695c',
      secondaryDark: '#004d40',
      accent: '#ffc107',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
      textPrimary: '#212529',
      textSecondary: '#6c757d',
      background: '#f8f9fa',
      surface: '#ffffff'
    }
  },
  'SASSETA': {
    code: 'SASSETA',
    name: 'Safety & Security SETA',
    logo: 'assets/images/setas/sasseta-logo.png',
    colors: {
      primary: '#1b5e20',
      primaryDark: '#124116',
      primaryLight: '#2e7d32',
      secondary: '#37474f',
      secondaryDark: '#263238',
      accent: '#ffc107',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
      textPrimary: '#212529',
      textSecondary: '#6c757d',
      background: '#f8f9fa',
      surface: '#ffffff'
    }
  },
  'SERVICES': {
    code: 'SERVICES',
    name: 'Services SETA',
    logo: 'assets/images/setas/services-logo.png',
    colors: {
      primary: '#4527a0',
      primaryDark: '#311b92',
      primaryLight: '#512da8',
      secondary: '#00897b',
      secondaryDark: '#00695c',
      accent: '#ff6f00',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
      textPrimary: '#212529',
      textSecondary: '#6c757d',
      background: '#f8f9fa',
      surface: '#ffffff'
    }
  },
  'TETA': {
    code: 'TETA',
    name: 'Transport Education & Training Authority',
    logo: 'assets/images/setas/teta-logo.png',
    colors: {
      primary: '#0d47a1',
      primaryDark: '#082f6a',
      primaryLight: '#1565c0',
      secondary: '#e65100',
      secondaryDark: '#bf4400',
      accent: '#ffc107',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
      textPrimary: '#212529',
      textSecondary: '#6c757d',
      background: '#f8f9fa',
      surface: '#ffffff'
    }
  }
};

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly storage = inject(StorageService);
  private renderer: Renderer2;

  private currentTheme$ = new BehaviorSubject<SetaTheme | null>(null);

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.initializeTheme();
  }

  get theme$(): Observable<SetaTheme | null> {
    return this.currentTheme$.asObservable();
  }

  get currentTheme(): SetaTheme | null {
    return this.currentTheme$.getValue();
  }

  private initializeTheme(): void {
    const savedTheme = this.storage.getTheme();
    if (savedTheme && SETA_THEMES[savedTheme]) {
      this.applyTheme(savedTheme);
    }
  }

  applyTheme(setaCode: string): void {
    const theme = SETA_THEMES[setaCode.toUpperCase()];
    if (!theme) {
      console.warn(`Theme not found for SETA: ${setaCode}`);
      return;
    }

    // Remove existing theme class
    const body = document.body;
    const existingThemeClass = Array.from(body.classList).find(c => c.startsWith('theme-'));
    if (existingThemeClass) {
      this.renderer.removeClass(body, existingThemeClass);
    }

    // Add new theme class
    this.renderer.addClass(body, `theme-${setaCode.toLowerCase()}`);

    // Apply CSS custom properties
    this.applyCssVariables(theme.colors);

    // Update document title
    document.title = `${theme.name} Portal`;

    // Save theme
    this.storage.setTheme(setaCode);
    this.currentTheme$.next(theme);
  }

  private applyCssVariables(colors: SetaColors): void {
    const root = document.documentElement;

    root.style.setProperty('--seta-primary', colors.primary);
    root.style.setProperty('--seta-primary-dark', colors.primaryDark);
    root.style.setProperty('--seta-primary-light', colors.primaryLight);
    root.style.setProperty('--seta-secondary', colors.secondary);
    root.style.setProperty('--seta-secondary-dark', colors.secondaryDark);
    root.style.setProperty('--seta-accent', colors.accent);
    root.style.setProperty('--seta-success', colors.success);
    root.style.setProperty('--seta-warning', colors.warning);
    root.style.setProperty('--seta-danger', colors.danger);
    root.style.setProperty('--seta-info', colors.info);
    root.style.setProperty('--seta-text-primary', colors.textPrimary);
    root.style.setProperty('--seta-text-secondary', colors.textSecondary);
    root.style.setProperty('--seta-bg-primary', colors.surface);
    root.style.setProperty('--seta-bg-secondary', colors.background);
  }

  clearTheme(): void {
    const body = document.body;
    const existingThemeClass = Array.from(body.classList).find(c => c.startsWith('theme-'));
    if (existingThemeClass) {
      this.renderer.removeClass(body, existingThemeClass);
    }

    this.storage.removeTheme();
    this.currentTheme$.next(null);
    document.title = 'SETA Portal';
  }

  getAvailableThemes(): SetaTheme[] {
    return Object.values(SETA_THEMES);
  }

  getTheme(setaCode: string): SetaTheme | undefined {
    return SETA_THEMES[setaCode.toUpperCase()];
  }
}
