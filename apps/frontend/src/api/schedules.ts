import { apiRequest } from "./client";
import {
  Schedule,
  ScheduleCreate,
  ScheduleUpdate,
  SchedulePersistResponse,
  ScheduleFilters,
  ScheduleDetailed,
  ScheduleValidation,
} from "../types/schedules";

export async function fetchSchedules(filters?: ScheduleFilters): Promise<Schedule[]> {
  const params = new URLSearchParams();

  if (filters?.instructor_id) params.set("instructor_id", String(filters.instructor_id));
  if (filters?.group_id) params.set("group_id", String(filters.group_id));
  if (filters?.environment_id) params.set("environment_id", String(filters.environment_id));
  if (filters?.learning_result_id) params.set("learning_result_id", String(filters.learning_result_id));
  if (filters?.date) params.set("date", filters.date);
  if (filters?.date_from) params.set("date_from", filters.date_from);
  if (filters?.date_to) params.set("date_to", filters.date_to);
  if (filters?.include_inactive) params.set("include_inactive", "true");
  if (filters?.include_cancelled) params.set("include_cancelled", "true");
  if (filters?.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  return apiRequest<Schedule[]>(`/schedules${query ? `?${query}` : ""}`);
}

export async function fetchSchedulesDetailed(filters?: ScheduleFilters): Promise<ScheduleDetailed[]> {
  const params = new URLSearchParams();

  if (filters?.instructor_id) params.set("instructor_id", String(filters.instructor_id));
  if (filters?.group_id) params.set("group_id", String(filters.group_id));
  if (filters?.learning_result_id) params.set("learning_result_id", String(filters.learning_result_id));
  if (filters?.date_from) params.set("date_from", filters.date_from);
  if (filters?.date_to) params.set("date_to", filters.date_to);
  if (filters?.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  return apiRequest<ScheduleDetailed[]>(`/schedules/detailed${query ? `?${query}` : ""}`);
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
  return apiRequest<{ ok: boolean }>(`/schedules/${id}/cancel`, {
    method: "POST",
  });
}

export async function deleteSchedule(id: number): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`/schedules/${id}`, {
    method: "DELETE",
  });
}

export async function fetchScheduleValidations(scheduleId: number): Promise<ScheduleValidation[]> {
  return apiRequest<ScheduleValidation[]>(`/schedules/${scheduleId}/validations`);
}
