import { apiRequest } from "./client";
import { TokenResponse, CurrentUser } from "../types/auth";

export async function login(email: string, password: string): Promise<TokenResponse> {
  return apiRequest<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>("/auth/me", {
    method: "GET",
  });
}
