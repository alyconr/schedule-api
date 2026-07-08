from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class TopicSelectionItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    relation_id: str
    learning_result_topic_id: int | None = None
    training_program_id: int | None = None
    training_program_code: str | None = None
    training_program_name: str | None = None
    learning_result_id: int
    learning_result_code: str
    learning_result_description: str
    topic_id: int
    topic_code: str
    topic_name: str
    topic_hours: Decimal | None = None
    program_scope: str | None = None
    program_scope_label: str
    trimester_number: int | None = None
    trimester_label: str | None = None
    color_hex: str | None = None
    relation_status: str | None = None
    confidence: str | None = None
    needs_manual_review: bool = False


class ProgramScopeOption(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: str
    label: str
    count: int


class LearningResultOption(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    code: str
    description: str
    program_scope: str | None = None
    program_scope_label: str
    trimester_number: int | None = None


class TopicSelectionOptionsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    program_scopes: list[ProgramScopeOption]
    trimesters: list[int]
    learning_results: list[LearningResultOption]
