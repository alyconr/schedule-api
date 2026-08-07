export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("schedule_api_token");
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = `${API_URL}/${path.replace(/^\//, "")}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem("schedule_api_token");
      // Dispatch native custom event to notify App.tsx to reset auth state
      window.dispatchEvent(new CustomEvent("auth-unauthorized"));
      throw new ApiError("Sesión vencida o inválida. Inicia sesión nuevamente.", 401);
    }

    if (response.status === 403) {
      throw new ApiError("No tienes permisos para esta acción.", 403);
    }

    if (response.status === 409) {
      throw new ApiError("El registro ya existe o viola una restricción única.", 409);
    }

    if (response.status === 422) {
      let details;
      try {
        details = await response.json();
      } catch {
        // ignore
      }
      const detail = details?.detail;
      const message = typeof detail === "string"
        ? detail
        : Array.isArray(detail)
        ? detail.map((item) => item?.msg).filter(Boolean).join(" ")
        : "";
      throw new ApiError(message || "Revisa los campos enviados.", 422, details);
    }

    if (!response.ok) {
      let detailMsg = "Error en el servidor.";
      try {
        const errJson = await response.json();
        if (errJson.detail) detailMsg = errJson.detail;
      } catch {
        // ignore
      }
      throw new ApiError(detailMsg, response.status);
    }

    // Handle empty or non-JSON responses
    const contentType = response.headers.get("content-type");
    if (response.status === 204 || !contentType || !contentType.includes("application/json")) {
      return {} as T;
    }

    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network / connection errors
    throw new ApiError("No fue posible conectar con el servidor.", 0);
  }
}
