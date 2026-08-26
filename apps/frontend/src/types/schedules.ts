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
  group_id?: number | null;
  training_program_id?: number | null;
  competency_id?: number | null;
  learning_result_id?: number | null;
  learning_result_topic_id?: number | null;
  manual_topic_name?: string | null;
  environment_id?: number | null;
  date: string;
  schedule_year: number;
  schedule_quarter: 1 | 2 | 3 | 4;
  weekday?: number | null;
  start_time: string;
  end_time: string;
  block_id?: number | null;
  subblock_id?: number | null;
  duration_hours: number;
  is_additional_hours?: boolean;
  additional_hours_type?: string | null;
  coordination_id?: number | null;
  status: ScheduleStatus;
  notes?: string | null;
};

export type ScheduleCreate = {
  instructor_id: number;
  group_id?: number | null;
  training_program_id?: number | null;
  competency_id?: number | null;
  learning_result_id?: number | null;
  learning_result_topic_id?: number | null;
  manual_topic_name?: string | null;
  environment_id?: number | null;
  date: string;
  schedule_year: number;
  schedule_quarter: 1 | 2 | 3 | 4;
  weekday?: number | null;
  start_time: string;
  end_time: string;
  block_id?: number | null;
  subblock_id?: number | null;
  duration_hours: number;
  is_additional_hours?: boolean;
  additional_hours_type?: string | null;
  coordination_id?: number | null;
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
  coordination_id?: number;
  schedule_year?: number;
  schedule_quarter?: 1 | 2 | 3 | 4;
  date?: string;
  date_from?: string;
  date_to?: string;
  include_inactive?: boolean;
  include_cancelled?: boolean;
  limit?: number;
};

export type SchedulePrefill = Pick<
  ScheduleFilters,
  "instructor_id" | "group_id" | "learning_result_id" | "schedule_year" | "schedule_quarter"
> & {
  date: string;
};

export type ScheduleDetailed = {
  id: number;
  date: string;
  schedule_year: number;
  schedule_quarter: 1 | 2 | 3 | 4;
  weekday_label: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  instructor_id: number;
  instructor_name: string;
  group_id?: number | null;
  group_code?: string | null;
  group_name?: string | null;
  group_trimester?: string | null;
  training_program_id?: number | null;
  training_program_name?: string | null;
  learning_result_id?: number | null;
  learning_result_code?: string | null;
  learning_result_description?: string | null;
  topic_name?: string | null;
  environment_id?: number | null;
  environment_name?: string | null;
  is_additional_hours?: boolean;
  additional_hours_type?: string | null;
  status: ScheduleStatus;
};

export type SchedulePeriodSummary = {
  schedule_year: number;
  schedule_quarter: 1 | 2 | 3 | 4;
  schedule_count: number;
  total_hours: number;
  date_from: string;
  date_to: string;
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

export type BusySlot = {
  date: string;
  start_time: string;
  end_time: string;
  availability: "busy_other_coordination";
  label: string;
};
