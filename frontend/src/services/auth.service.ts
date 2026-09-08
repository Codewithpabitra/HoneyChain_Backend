// src/services/auth.service.ts
import api from "@/lib/axios";
import type {
  LoginRequest,
  LoginResponse,
  MeResponse,
  CreateUserRequest,
  CreateUserResponse,
  WalletsResponse,
  AuthUser,
} from "@/types/auth";

export const authService = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>("/api/auth/login", payload);
    return data;
  },

  async logout(): Promise<void> {
    // Best-effort — clears the httpOnly cookies the backend also sets.
    // Client-side state/localStorage is cleared separately regardless of
    // whether this call succeeds.
    await api.post("/api/auth/logout");
  },

  async me(): Promise<AuthUser> {
    const { data } = await api.get<MeResponse>("/api/auth/me");
    return data.user;
  },

  // Admin-only. There is no public self-registration endpoint in the API —
  // see the README note about the (auth)/register page.
  async createUser(payload: CreateUserRequest): Promise<CreateUserResponse> {
    const { data } = await api.post<CreateUserResponse>(
      "/api/auth/users",
      payload,
    );

    return data;
  },

  async wallets(): Promise<WalletsResponse> {
    const { data } = await api.get<WalletsResponse>("/api/auth/wallets");

    return data;
  },
};
