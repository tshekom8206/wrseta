export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  setaId: number;
  setaCode: string;
  setaName: string;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

export enum UserRole {
  Admin = 'Admin',
  Staff = 'Staff',
  Learner = 'Learner'
}

export interface LoginRequest {
  username: string;
  password: string;
  setaCode: string;
  setaId: number;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  user: User;
  seta: SetaBranding;
}

export interface SetaBranding {
  code: string;
  name: string;
  logo: string;
  colors: {
    primary: string;
    primaryDark: string;
    secondary: string;
    accent: string;
  };
}

export interface TokenRefreshRequest {
  refreshToken: string;
}

export interface TokenRefreshResponse {
  success: boolean;
  token: string;
  expiresAt: Date;
}
