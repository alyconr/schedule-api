import { apiRequest } from "./client";
import {
  TopicSelectionItem,
  TopicSelectionOptionsResponse,
} from "../types/topics";

type TopicSelectionParams = {
  program_scope?: string;
  training_program_id?: number;
  trimester_number?: number;
  learning_result_id?: number;
  search?: string;
};

function toQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : "";
}

export async function getTopicSelectionOptions(params: {
  program_scope?: string;
  trimester_number?: number;
} = {}): Promise<TopicSelectionOptionsResponse> {
  return apiRequest<TopicSelectionOptionsResponse>(`/topics/selection-options${toQuery(params)}`);
}

export async function getTopicSelection(params: TopicSelectionParams = {}): Promise<TopicSelectionItem[]> {
  return apiRequest<TopicSelectionItem[]>(`/topics/selection${toQuery(params)}`);
}
