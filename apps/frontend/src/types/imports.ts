export type ImportType = "schedule_normalized" | "schedule_history";

export type ImportIssue = {
  sheet: string;
  row?: number | null;
  entity?: string | null;
  severity: "warning" | "error";
  message: string;
  raw_value?: string | null;
};

export type ImportEntitySummary = {
  valid: number;
  warnings: number;
  rejected: number;
};

export type ImportPreviewResponse = {
  import_type: string;
  filename: string;
  sheets_detected: string[];
  summary: Record<string, ImportEntitySummary>;
  items?: Record<string, any[]>;
  warnings: ImportIssue[];
  errors: ImportIssue[];
};

export type ImportCommitResponse = {
  status: string;
  created: Record<string, number>;
  updated: Record<string, number>;
  rejected: number;
  warnings: ImportIssue[];
  errors: ImportIssue[];
};

export type TemplateInfoResponse = {
  supported_formats: string[];
  supported_import_types: string[];
  required_sheets: string[];
  optional_sheets: string[];
};
