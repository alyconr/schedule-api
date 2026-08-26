import { apiRequest } from "./client";

export async function fetchList<T>(
  endpoint: string,
  params?: { limit?: number; offset?: number; search?: string; coordination_id?: number }
): Promise<T[]> {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));
  if (params?.search) query.set("search", params.search);
  if (params?.coordination_id) query.set("coordination_id", String(params.coordination_id));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<T[]>(`/${endpoint}${suffix}`);
}

export async function fetchItem<T>(endpoint: string, id: number): Promise<T> {
  return apiRequest<T>(`/${endpoint}/${id}`);
}

export async function createItem<T>(endpoint: string, data: any): Promise<T> {
  return apiRequest<T>(`/${endpoint}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateItem<T>(endpoint: string, id: number, data: any): Promise<T> {
  return apiRequest<T>(`/${endpoint}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteItem(endpoint: string, id: number): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`/${endpoint}/${id}`, {
    method: "DELETE",
  });
}
