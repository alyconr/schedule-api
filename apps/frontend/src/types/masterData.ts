export interface ContractType {
  id: number;
  name: string;
  description?: string;
  category?: "planta" | "contratista" | "otro" | null;
  monthly_training_hours: number;
  monthly_additional_hours: number;
  weekly_base_hours: number;
  weekly_max_hours: number;
  source_label?: string | null;
  is_active?: boolean;
}

export interface Instructor {
  id: number;
  document_type: string;
  document_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  contract_type_id?: number;
  area?: string;
  specialty?: string;
  monthly_training_hours: number;
  monthly_additional_hours: number;
  weekly_base_hours: number;
  weekly_max_hours: number;
  is_active?: boolean;
  notes?: string;
}

export interface TrainingProgram {
  id: number;
  code: string;
  name: string;
  version?: string;
  level?: string;
  duration_hours?: number;
  is_active?: boolean;
}

export interface Competency {
  id: number;
  code: string;
  name: string;
  training_program_id?: number;
  hours?: number;
  is_active?: boolean;
}

export interface LearningResult {
  id: number;
  code: string;
  description: string;
  competency_id?: number;
  estimated_hours?: number;
  result_type?: string;
  is_active?: boolean;
}

export interface Group {
  id: number;
  code: string;
  name?: string;
  training_program_id?: number;
  jornada?: string;
  modality?: string;
  start_date?: string;
  end_date?: string;
  productive_stage_start_date?: string;
  productive_stage_end_date?: string;
  learners_count: number;
  is_active?: boolean;
  notes?: string;
}

export interface Environment {
  id: number;
  code: string;
  name: string;
  location?: string;
  capacity: number;
  environment_type: "fisico" | "virtual" | "externo";
  resources?: string;
  is_active?: boolean;
  notes?: string;
}

export interface TimeBlock {
  id: number;
  name: string;
  weekday: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  jornada?: string;
  is_active?: boolean;
}
