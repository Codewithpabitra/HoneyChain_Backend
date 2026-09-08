// src/types/auth.ts
// Types mirror docs/api.md section 4 (Authentication & Authorization Endpoints)

export type Role =
  | "admin"
  | "beekeeper"
  | "processor"
  | "lab"
  | "transporter"
  | "auditor";

export const ROLES: Role[] = [
  "admin",
  "beekeeper",
  "processor",
  "lab",
  "transporter",
  "auditor",
];

export interface Organization {
  _id?: string;
  id?: string;
  name: string;
  role?: Role;
  walletAddress: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  organization?: Organization;
  walletAddress: string;
  createdAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: AuthUser;
}

export interface MeResponse {
  success: boolean;
  user: AuthUser;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: Role;
  organizationId?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    stack?: string;
  };
}

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export interface CreateUserResponse {
  success: boolean;
  message: string;
  user: AuthUser;
}

export interface WalletsResponse {
  success: boolean;
  data: {
    wallets: Array<{
      role: Role;
      walletAddress: string;
    }>;
  };
}