import { apiRequest } from "./client";
import { ImportPreviewResponse, ImportCommitResponse, TemplateInfoResponse } from "../types/imports";

export async function previewImport(file: File, importType: string): Promise<ImportPreviewResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("import_type", importType);

  return apiRequest<ImportPreviewResponse>("imports/preview", {
    method: "POST",
    body: formData,
  });
}

export async function commitImport(file: File, importType: string, mode: string = "upsert"): Promise<ImportCommitResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("import_type", importType);
  formData.append("mode", mode);

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
