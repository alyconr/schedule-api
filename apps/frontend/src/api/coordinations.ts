import { apiRequest } from "./client";
import { Coordination } from "../types/masterData";

export async function fetchCoordinations(): Promise<Coordination[]> {
  return apiRequest<Coordination[]>("/coordinations");
}

export async function createCoordination(data: { code: string; name: string; description?: string }): Promise<Coordination> {
  return apiRequest<Coordination>("/coordinations", { method: "POST", body: JSON.stringify(data) });
}

export async function updateCoordination(id: number, data: { code?: string; name?: string; description?: string }): Promise<Coordination> {
  return apiRequest<Coordination>(`/coordinations/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteCoordination(id: number): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`/coordinations/${id}`, { method: "DELETE" });
}
