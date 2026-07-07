export type TopicSelectionItem = {
  relation_id: string;
  learning_result_id: number;
  learning_result_code: string;
  learning_result_description: string;
  topic_id: number;
  topic_code: string;
  topic_name: string;
  topic_hours?: number | string | null;
  program_scope?: string | null;
  program_scope_label: string;
  trimester_number?: number | null;
  trimester_label?: string | null;
  color_hex?: string | null;
  relation_status?: string | null;
  confidence?: string | null;
  needs_manual_review: boolean;
};

export type LearningResultOption = {
  id: number;
  code: string;
  description: string;
  program_scope?: string | null;
  program_scope_label: string;
  trimester_number?: number | null;
};

export type TopicSelectionOptionsResponse = {
  program_scopes: {
    value: string;
    label: string;
    count: number;
  }[];
  trimesters: number[];
  learning_results: LearningResultOption[];
};