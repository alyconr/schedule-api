from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlmodel import Session, select

from app.api.deps import ROLE_READ, require_roles
from app.db import get_session
from app.models import LearningResult, LearningResultTopic, Topic
from app.schemas.topics import (
    LearningResultOption,
    ProgramScopeOption,
    TopicSelectionItem,
    TopicSelectionOptionsResponse,
)


router = APIRouter(prefix="/topics", tags=["topics"])
SessionDep = Annotated[Session, Depends(get_session)]


def _scope_values(program_scope: str | None) -> list[str] | None:
    if program_scope == "oferta_cerrada":
        return ["cadena", "oferta_cerrada"]
    if program_scope:
        return [program_scope]
    return None


def _scope_label(program_scope: str | None) -> str:
    labels = {
        "oferta_abierta": "Oferta abierta",
        "cadena": "Cadena de formación",
        "oferta_cerrada": "Cadena de formación",
    }
    return labels.get(program_scope or "", "Sin contexto")


def _selection_statement(
    program_scope: str | None = None,
    trimester_number: int | None = None,
    learning_result_id: int | None = None,
    search: str | None = None,
):
    stmt = (
        select(Topic, LearningResultTopic, LearningResult)
        .join(LearningResultTopic, LearningResultTopic.topic_id == Topic.id)
        .join(LearningResult, LearningResult.id == LearningResultTopic.learning_result_id)
    )
    scope_values = _scope_values(program_scope)
    if scope_values:
        stmt = stmt.where(LearningResultTopic.program_scope.in_(scope_values))
    if trimester_number is not None:
        stmt = stmt.where(LearningResultTopic.trimester_number == trimester_number)
    if learning_result_id is not None:
        stmt = stmt.where(LearningResult.id == learning_result_id)
    if search:
        like = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Topic.name.ilike(like),
                Topic.code.ilike(like),
                LearningResult.description.ilike(like),
                LearningResult.code.ilike(like),
            )
        )
    return stmt.order_by(
        LearningResultTopic.program_scope,
        LearningResultTopic.trimester_number,
        LearningResult.code,
        Topic.code,
    )


def _to_selection_item(
    topic: Topic,
    relation: LearningResultTopic,
    learning_result: LearningResult,
) -> TopicSelectionItem:
    return TopicSelectionItem(
        relation_id=relation.relation_id,
        learning_result_id=learning_result.id or 0,
        learning_result_code=learning_result.code,
        learning_result_description=learning_result.description,
        topic_id=topic.id or 0,
        topic_code=topic.code,
        topic_name=topic.name,
        topic_hours=topic.estimated_hours,
        program_scope=relation.program_scope,
        program_scope_label=_scope_label(relation.program_scope),
        trimester_number=relation.trimester_number,
        trimester_label=topic.trimester,
        color_hex=relation.color_hex or topic.color_hex,
        relation_status=relation.relation_status,
        confidence=relation.confidence,
        needs_manual_review=relation.needs_manual_review,
    )


@router.get(
    "/selection",
    response_model=list[TopicSelectionItem],
    dependencies=[Depends(require_roles(*ROLE_READ))],
)
def list_topic_selection(
    session: SessionDep,
    program_scope: Annotated[str | None, Query(max_length=50)] = None,
    trimester_number: Annotated[int | None, Query(ge=1)] = None,
    learning_result_id: Annotated[int | None, Query(ge=1)] = None,
    search: Annotated[str | None, Query(max_length=100)] = None,
) -> list[TopicSelectionItem]:
    rows = session.exec(
        _selection_statement(
            program_scope=program_scope,
            trimester_number=trimester_number,
            learning_result_id=learning_result_id,
            search=search,
        )
    ).all()
    return [_to_selection_item(topic, relation, learning_result) for topic, relation, learning_result in rows]


@router.get(
    "/selection-options",
    response_model=TopicSelectionOptionsResponse,
    dependencies=[Depends(require_roles(*ROLE_READ))],
)
def get_topic_selection_options(
    session: SessionDep,
    program_scope: Annotated[str | None, Query(max_length=50)] = None,
    trimester_number: Annotated[int | None, Query(ge=1)] = None,
) -> TopicSelectionOptionsResponse:
    rows = session.exec(
        _selection_statement(program_scope=program_scope, trimester_number=trimester_number)
    ).all()

    scope_counts: dict[str, int] = {}
    trimesters: set[int] = set()
    learning_results: dict[tuple[int, str | None, int | None], LearningResultOption] = {}

    for _topic, relation, learning_result in rows:
        scope = relation.program_scope
        if scope:
            scope_counts[scope] = scope_counts.get(scope, 0) + 1
        if relation.trimester_number is not None:
            trimesters.add(relation.trimester_number)
        key = (learning_result.id or 0, scope, relation.trimester_number)
        learning_results[key] = LearningResultOption(
            id=learning_result.id or 0,
            code=learning_result.code,
            description=learning_result.description,
            program_scope=scope,
            program_scope_label=_scope_label(scope),
            trimester_number=relation.trimester_number,
        )

    return TopicSelectionOptionsResponse(
        program_scopes=[
            ProgramScopeOption(value=value, label=_scope_label(value), count=count)
            for value, count in sorted(scope_counts.items())
        ],
        trimesters=sorted(trimesters),
        learning_results=sorted(
            learning_results.values(),
            key=lambda item: (item.trimester_number or 0, item.code),
        ),
    )
