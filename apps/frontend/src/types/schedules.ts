export type ValidationSeverity = "INFO" | "WARNING" | "BLOCKING";

export type ScheduleStatus =
  | "validated"
  | "warning"
  | "blocked"
  | "cancelled"
  | "deleted"
  | "draft"
  | string;

export type ValidationResult = {
  rule_code: string;
  severity: ValidationSeverity;
  message: string;
  is_blocking: boolean;
  field?: string | null;
};

export type Schedule = {
  id: number;
  instructor_id: number;
  group_id: number;
  training_program_id?: number | null;
  competency_id?: number | null;
  learning_result_id: number;
  learning_result_topic_id?: number | null;
  manual_topic_name?: string | null;
  environment_id: number;
  date: string;
  weekday?: number | null;
  start_time: string;
  end_time: string;
  block_id?: number | null;
  subblock_id?: number | null;
  duration_hours: number;
  status: ScheduleStatus;
  notes?: string | null;
};

export type ScheduleCreate = {
  instructor_id: number;
  group_id: number;
  training_program_id?: number | null;
  competency_id?: number | null;
  learning_result_id: number;
  learning_result_topic_id?: number | null;
  manual_topic_name?: string | null;
  environment_id: number;
  date: string;
  weekday?: number | null;
  start_time: string;
  end_time: string;
  block_id?: number | null;
  subblock_id?: number | null;
  duration_hours: number;
  notes?: string | null;
};

export type ScheduleUpdate = Partial<ScheduleCreate> & {
  status?: string;
};

export type SchedulePersistResponse = {
  status: string;
  schedule: Schedule | null;
  validations: ValidationResult[];
};

export type ScheduleFilters = {
  instructor_id?: number;
  group_id?: number;
  environment_id?: number;
  learning_result_id?: number;
  date?: string;
  date_from?: string;
  date_to?: string;
  include_inactive?: boolean;
  include_cancelled?: boolean;
  limit?: number;
};

export type ScheduleDetailed = {
  id: number;
  date: string;
  weekday_label: string;
  start_time: string;
  end_time: string;
  instructor_id: number;
  instructor_name: string;
  group_id: number;
  group_code: string;
  group_name?: string | null;
  group_trimester?: string | null;
  training_program_id?: number | null;
  training_program_name?: string | null;
  learning_result_id?: number | null;
  learning_result_code?: string | null;
  learning_result_description?: string | null;
  topic_name?: string | null;
  environment_id: number;
  environment_name: string;
  status: ScheduleStatus;
};

export type ScheduleValidation = {
  id: number;
  schedule_id: number;
  rule_code: string;
  severity: ValidationSeverity | string;
  message: string;
  is_blocking: boolean;
  created_at?: string;
};
