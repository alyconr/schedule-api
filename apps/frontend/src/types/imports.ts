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
  created?: number;
  updated?: number;
  unchanged?: number;
  conflicts?: number;
};

export type ImportConflictItem = {
  entity: string;
  natural_key: string;
  sheet?: string | null;
  row?: number | null;
  message: string;
};

export type ImportChangeItem = {
  entity: string;
  natural_key: string;
  changes: Record<string, { before: any; after: any }>;
};

export type ImportPreviewResponse = {
  import_type: string;
  filename: string;
  sheets_detected: string[];
  summary: Record<string, ImportEntitySummary>;
  items?: Record<string, any[]>;
  warnings: ImportIssue[];
  errors: ImportIssue[];
  file_sha256?: string;
  coordination_id?: number | null;
  mode?: string;
  is_reimport?: boolean;
  conflicts_detail?: ImportConflictItem[];
  changes_detail?: ImportChangeItem[];
};

export type ImportCommitResponse = {
  status: string;
  batch_id?: number | null;
  created: Record<string, number>;
  updated: Record<string, number>;
  unchanged?: Record<string, number>;
  conflicts?: Record<string, number>;
  rejected: number;
  warnings: ImportIssue[];
  errors: ImportIssue[];
  file_sha256?: string | null;
};

export type ImportBatchItem = {
  id: number;
  import_type: string;
  coordination_id?: number | null;
  uploaded_by_user_id: number;
  filename: string;
  file_sha256: string;
  mode: string;
  status: string;
  created_count: number;
  updated_count: number;
  unchanged_count: number;
  conflict_count: number;
  rejected_count: number;
  warning_count: number;
  error_count: number;
  created_at: string;
  committed_at?: string | null;
};

export type TemplateInfoResponse = {
  supported_formats: string[];
  supported_import_types: string[];
  required_sheets: string[];
  optional_sheets: string[];
};
