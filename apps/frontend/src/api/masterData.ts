import { apiRequest } from "./client";

export async function fetchList<T>(endpoint: string): Promise<T[]> {
  return apiRequest<T[]>(`/${endpoint}`);
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
