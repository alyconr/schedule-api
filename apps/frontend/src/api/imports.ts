import { apiRequest } from "./client";
import { ImportPreviewResponse, ImportCommitResponse, TemplateInfoResponse } from "../types/imports";

type SchedulePeriod = { scheduleYear: number; scheduleQuarter: number };

export async function previewImport(file: File, importType: string, period?: SchedulePeriod): Promise<ImportPreviewResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("import_type", importType);
  if (period) {
    formData.append("schedule_year", String(period.scheduleYear));
    formData.append("schedule_quarter", String(period.scheduleQuarter));
  }

  return apiRequest<ImportPreviewResponse>("imports/preview", {
    method: "POST",
    body: formData,
  });
}

export async function commitImport(
  file: File,
  importType: string,
  mode: string = "upsert",
  period?: SchedulePeriod,
): Promise<ImportCommitResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("import_type", importType);
  formData.append("mode", mode);
  if (period) {
    formData.append("schedule_year", String(period.scheduleYear));
    formData.append("schedule_quarter", String(period.scheduleQuarter));
  }

  return apiRequest<ImportCommitResponse>("imports/commit", {
    method: "POST",
    body: formData,
  });
}

export async function getTemplateInfo(): Promise<TemplateInfoResponse> {
  return apiRequest<TemplateInfoResponse>("imports/template-info", {
    method: "GET",
  });
}
