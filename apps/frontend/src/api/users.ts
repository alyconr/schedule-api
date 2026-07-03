import { apiRequest } from "./client";
import { User, UserCreate, UserUpdate, Role } from "../types/auth";

export async function fetchUsers(): Promise<User[]> {
  return apiRequest<User[]>("/users");
}

export async function createUser(payload: UserCreate): Promise<User> {
  return apiRequest<User>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateUser(id: number, payload: UserUpdate): Promise<User> {
  return apiRequest<User>(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deactivateUser(id: number): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`/users/${id}`, {
    method: "DELETE",
  });
}

export async function fetchRoles(): Promise<Role[]> {
  return apiRequest<Role[]>("/roles");
}
