export interface Seta {
  id: number;
  code: string;
  name: string;
  fullName: string;
  description: string;
  logo: string;
  website: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  createdAt: Date;
  theme: SetaTheme;
}

export interface SetaTheme {
  code: string;
  name: string;
  logo: string;
  colors: SetaColors;
  fonts?: SetaFonts;
}

export interface SetaColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  secondaryDark: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  textPrimary: string;
  textSecondary: string;
  background: string;
  surface: string;
}

export interface SetaFonts {
  heading: string;
  body: string;
}

export interface SetaStats {
  setaId: number;
  setaCode: string;
  totalLearners: number;
  activeLearners: number;
  verificationsToday: number;
  verificationsThisMonth: number;
  duplicatesBlocked: number;
  successRate: number;
}

export interface SetaListItem {
  id: number;
  code: string;
  name: string;
  logo: string;
  primaryColor: string;
}
