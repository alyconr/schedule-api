import { apiRequest } from "./client";
import {
  Schedule,
  ScheduleCreate,
  ScheduleUpdate,
  SchedulePersistResponse,
  ScheduleFilters,
} from "../types/schedules";

export async function fetchSchedules(filters?: ScheduleFilters): Promise<Schedule[]> {
  const params = new URLSearchParams();

  if (filters?.instructor_id) params.set("instructor_id", String(filters.instructor_id));
  if (filters?.group_id) params.set("group_id", String(filters.group_id));
  if (filters?.environment_id) params.set("environment_id", String(filters.environment_id));
  if (filters?.date) params.set("date", filters.date);

  const query = params.toString();
  return apiRequest<Schedule[]>(`/schedules${query ? `?${query}` : ""}`);
}

export async function createSchedule(payload: ScheduleCreate): Promise<SchedulePersistResponse> {
  return apiRequest<SchedulePersistResponse>("/schedules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSchedule(id: number, payload: ScheduleUpdate): Promise<SchedulePersistResponse> {
  return apiRequest<SchedulePersistResponse>(`/schedules/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function cancelSchedule(id: number): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`/schedules/${id}`, {
    method: "DELETE",
  });
}
