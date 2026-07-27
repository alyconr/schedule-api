import unittest

from fastapi import HTTPException
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.api.routes.schedules import (
    cancel_schedule,
    create_schedule,
    delete_schedule,
    list_schedules,
    list_schedules_detailed,
    update_schedule,
)
from app.main import app
from app.models import (
    Competency,
    Environment,
    ExceptionRequest,
    Group,
    Instructor,
    LearningResult,
    LearningResultTopic,
    ScheduleValidation,
    Topic,
    TrainingProgram,
)
from app.schemas.schedules import ScheduleCreate, ScheduleUpdate
from datetime import date
from app.services.schedule_service import derive_contract_type, get_week_range


class SchedulesPersistenceRoutesTest(unittest.TestCase):
    def setUp(self) -> None:
        self.client = app

    def _prefix_exists(self, method: str, prefix: str) -> bool:
        for route in app.routes:
            if hasattr(route, "methods") and hasattr(route, "path"):
                if route.path.startswith(prefix) and method in route.methods:
                    return True
        return False

    def test_post_schedule_registered(self) -> None:
        self.assertTrue(self._prefix_exists("POST", "/api/v1/schedules"))

    def test_list_schedule_registered(self) -> None:
        self.assertTrue(self._prefix_exists("GET", "/api/v1/schedules"))

    def test_get_schedule_registered(self) -> None:
        self.assertTrue(self._prefix_exists("GET", "/api/v1/schedules/"))

    def test_update_schedule_registered(self) -> None:
        self.assertTrue(self._prefix_exists("PUT", "/api/v1/schedules/"))

    def test_delete_schedule_registered(self) -> None:
        self.assertTrue(self._prefix_exists("DELETE", "/api/v1/schedules/"))

    def test_validate_still_registered(self) -> None:
        self.assertTrue(self._prefix_exists("POST", "/api/v1/schedules/validate"))

    def test_detailed_schedule_registered(self) -> None:
        self.assertTrue(self._prefix_exists("GET", "/api/v1/schedules/detailed"))

    def test_schemas_import(self) -> None:
        from app.schemas.schedules import (
            ScheduleCreate,
            ScheduleUpdate,
            SchedulePersistResponse,
        )
        self.assertIsNotNone(ScheduleCreate)
        self.assertIsNotNone(ScheduleUpdate)
        self.assertIsNotNone(SchedulePersistResponse)

    def test_derive_contract_type_planta(self) -> None:
        self.assertEqual(derive_contract_type("Instructor de Planta"), "planta")
        self.assertEqual(derive_contract_type("planta"), "planta")
        self.assertEqual(derive_contract_type("Carrera Administrativa"), "planta")
        self.assertEqual(derive_contract_type("Nombramiento Provisional"), "planta")
        self.assertEqual(derive_contract_type("Nombramiento Ordinario"), "planta")

    def test_derive_contract_type_contratista(self) -> None:
        self.assertEqual(derive_contract_type("Instructor Contratista"), "contratista")
        self.assertEqual(derive_contract_type("contratista"), "contratista")

    def test_derive_contract_type_otro(self) -> None:
        self.assertEqual(derive_contract_type("Otro Tipo"), "otro")
        self.assertEqual(derive_contract_type(""), "otro")
        self.assertEqual(derive_contract_type("Catedra"), "otro")

    def test_get_week_range_midweek(self) -> None:
        m, s = get_week_range(date(2026, 7, 2))
        self.assertEqual(m, date(2026, 6, 29))
        self.assertEqual(s, date(2026, 7, 5))

    def test_get_week_range_monday(self) -> None:
        m, s = get_week_range(date(2026, 6, 29))
        self.assertEqual(m, date(2026, 6, 29))
        self.assertEqual(s, date(2026, 7, 5))

    def test_get_week_range_sunday(self) -> None:
        m, s = get_week_range(date(2026, 7, 5))
        self.assertEqual(m, date(2026, 6, 29))
        self.assertEqual(s, date(2026, 7, 5))


def _seed_topic_fixtures(session: Session) -> dict[str, int]:
    program = TrainingProgram(code="PROG-UNO", name="Programa uno")
    other_program = TrainingProgram(code="PROG-DOS", name="Programa dos")
    instructor = Instructor(
        document_type="CC",
        document_number="100",
        first_name="Ana",
        last_name="Perez",
        email="ana@example.com",
    )
    environment = Environment(code="A1", name="Aula 1", capacity=30)
    session.add(program)
    session.add(other_program)
    session.add(instructor)
    session.add(environment)
    session.commit()
    session.refresh(program)
    session.refresh(other_program)
    session.refresh(instructor)
    session.refresh(environment)

    group = Group(code="G1", training_program_id=program.id, learners_count=10, trimester="TRIMESTRE III")
    competency = Competency(code="C1", name="Competencia", training_program_id=program.id)
    session.add(group)
    session.add(competency)
    session.commit()
    session.refresh(group)
    session.refresh(competency)

    learning_result = LearningResult(code="RA1", description="Resultado", competency_id=competency.id)
    other_learning_result = LearningResult(code="RA2", description="Otro resultado", competency_id=competency.id)
    topic = Topic(code="T1", name="Tematica uno")
    other_topic = Topic(code="T2", name="Tematica dos")
    session.add(learning_result)
    session.add(other_learning_result)
    session.add(topic)
    session.add(other_topic)
    session.commit()
    session.refresh(learning_result)
    session.refresh(other_learning_result)
    session.refresh(topic)
    session.refresh(other_topic)

    relation = LearningResultTopic(
        relation_id="REL-UNO",
        training_program_id=program.id,
        training_program_code=program.code,
        training_program_name=program.name,
        learning_result_id=learning_result.id,
        topic_id=topic.id,
        group_id="G-REL-1",
    )
    other_lr_relation = LearningResultTopic(
        relation_id="REL-OTRO-RA",
        training_program_id=program.id,
        learning_result_id=other_learning_result.id,
        topic_id=other_topic.id,
        group_id="G-REL-2",
    )
    other_program_relation = LearningResultTopic(
        relation_id="REL-OTRO-PROG",
        training_program_id=other_program.id,
        learning_result_id=learning_result.id,
        topic_id=other_topic.id,
        group_id="G-REL-3",
    )
    session.add(relation)
    session.add(other_lr_relation)
    session.add(other_program_relation)
    session.commit()
    session.refresh(relation)
    session.refresh(other_lr_relation)
    session.refresh(other_program_relation)

    return {
        "program": program.id,
        "group": group.id,
        "instructor": instructor.id,
        "environment": environment.id,
        "learning_result": learning_result.id,
        "relation": relation.id,
        "other_lr_relation": other_lr_relation.id,
        "other_program_relation": other_program_relation.id,
    }


def _additional_payload(instructor_id: int, hours: int = 12) -> ScheduleCreate:
    return ScheduleCreate(
        instructor_id=instructor_id,
        date=date(2026, 7, 10),
        start_time="00:00",
        end_time="00:00",
        duration_hours=hours,
        is_additional_hours=True,
        additional_hours_type="Apoyo a alistamiento mensual",
    )


class ScheduleTopicAssignmentTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SQLModel.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            self.ids = _seed_topic_fixtures(session)

    def tearDown(self) -> None:
        self.engine.dispose()

    def _payload(self, **overrides) -> ScheduleCreate:
        data = {
            "instructor_id": self.ids["instructor"],
            "group_id": self.ids["group"],
            "learning_result_id": self.ids["learning_result"],
            "environment_id": self.ids["environment"],
            "date": date(2026, 7, 8),
            "start_time": "08:00",
            "end_time": "10:00",
            "duration_hours": 2,
        }
        data.update(overrides)
        return ScheduleCreate(**data)

    def test_create_accepts_valid_learning_result_topic(self) -> None:
        with Session(self.engine) as session:
            result = create_schedule(
                self._payload(learning_result_topic_id=self.ids["relation"]),
                session,
            )
        self.assertEqual(result.status, "validated")
        self.assertEqual(result.schedule["learning_result_topic_id"], self.ids["relation"])
        self.assertIsNone(result.schedule["manual_topic_name"])

    def test_create_accepts_manual_topic_when_no_relation(self) -> None:
        with Session(self.engine) as session:
            result = create_schedule(self._payload(manual_topic_name="Tema manual"), session)
        self.assertEqual(result.status, "validated")
        self.assertEqual(result.schedule["manual_topic_name"], "Tema manual")

    def test_create_rejects_topic_for_other_learning_result(self) -> None:
        with Session(self.engine) as session, self.assertRaises(HTTPException) as ctx:
            create_schedule(self._payload(learning_result_topic_id=self.ids["other_lr_relation"]), session)
        self.assertEqual(ctx.exception.status_code, 422)

    def test_create_rejects_topic_for_other_program(self) -> None:
        with Session(self.engine) as session, self.assertRaises(HTTPException) as ctx:
            create_schedule(self._payload(learning_result_topic_id=self.ids["other_program_relation"]), session)
        self.assertEqual(ctx.exception.status_code, 422)

    def test_create_rejects_missing_topic_assignment(self) -> None:
        with Session(self.engine) as session, self.assertRaises(HTTPException) as ctx:
            create_schedule(self._payload(), session)
        self.assertEqual(ctx.exception.status_code, 422)

    def test_create_rejects_ambiguous_topic_assignment(self) -> None:
        with Session(self.engine) as session, self.assertRaises(HTTPException) as ctx:
            create_schedule(
                self._payload(
                    learning_result_topic_id=self.ids["relation"],
                    manual_topic_name="Tema manual",
                ),
                session,
            )
        self.assertEqual(ctx.exception.status_code, 422)


class ScheduleListingTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SQLModel.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            self.ids = _seed_topic_fixtures(session)
            self._create_schedules(session)

    def tearDown(self) -> None:
        self.engine.dispose()

    def _create_schedules(self, session: Session) -> None:
        with_topic = ScheduleCreate(
            instructor_id=self.ids["instructor"],
            group_id=self.ids["group"],
            learning_result_id=self.ids["learning_result"],
            learning_result_topic_id=self.ids["relation"],
            environment_id=self.ids["environment"],
            date=date(2026, 7, 7),
            start_time="08:00",
            end_time="10:00",
            duration_hours=2,
        )
        create_schedule(with_topic, session)

        manual_topic = ScheduleCreate(
            instructor_id=self.ids["instructor"],
            group_id=self.ids["group"],
            learning_result_id=self.ids["learning_result"],
            manual_topic_name="Tema manual de prueba",
            environment_id=self.ids["environment"],
            date=date(2026, 7, 9),
            start_time="10:00",
            end_time="12:00",
            duration_hours=2,
        )
        create_schedule(manual_topic, session)

        additional_hours = ScheduleCreate(
            instructor_id=self.ids["instructor"],
            date=date(2026, 7, 10),
            start_time="00:00",
            end_time="00:00",
            duration_hours=12,
            is_additional_hours=True,
            additional_hours_type="Apoyo a alistamiento mensual",
        )
        create_schedule(additional_hours, session)

    def _list_schedules(self, session: Session, **overrides):
        params = dict(
            instructor_id=None,
            group_id=None,
            environment_id=None,
            learning_result_id=None,
            date=None,
            date_from=None,
            date_to=None,
            include_inactive=False,
            include_cancelled=False,
            limit=500,
        )
        params.update(overrides)
        return list_schedules(session, **params)

    def _list_schedules_detailed(self, session: Session, **overrides):
        params = dict(
            instructor_id=None,
            group_id=None,
            learning_result_id=None,
            date_from=None,
            date_to=None,
            include_inactive=False,
            include_cancelled=False,
            limit=500,
        )
        params.update(overrides)
        return list_schedules_detailed(session, **params)

    def test_list_schedules_filters_by_learning_result(self) -> None:
        with Session(self.engine) as session:
            rows = self._list_schedules(session, learning_result_id=self.ids["learning_result"])
        self.assertEqual(len(rows), 2)

        with Session(self.engine) as session:
            rows = self._list_schedules(session, learning_result_id=self.ids["learning_result"] + 999)
        self.assertEqual(len(rows), 0)

    def test_additional_hours_visible_by_instructor(self) -> None:
        with Session(self.engine) as session:
            rows = self._list_schedules(session, instructor_id=self.ids["instructor"])
        additional = [row for row in rows if row.is_additional_hours]
        self.assertEqual(len(additional), 1)
        self.assertIsNone(additional[0].group_id)
        self.assertIsNone(additional[0].environment_id)
        self.assertEqual(additional[0].date, date(2026, 7, 1))
        self.assertEqual(float(additional[0].duration_hours), 12)
        self.assertEqual(additional[0].additional_hours_type, "Apoyo a alistamiento mensual")

    def test_detailed_instructor_includes_monthly_additional_hours(self) -> None:
        with Session(self.engine) as session:
            rows = self._list_schedules_detailed(session, instructor_id=self.ids["instructor"])
        additional = [row for row in rows if row.is_additional_hours]
        self.assertEqual(len(additional), 1)
        self.assertEqual(additional[0].date, date(2026, 7, 1))
        self.assertEqual(additional[0].duration_hours, 12)
        self.assertEqual(additional[0].additional_hours_type, "Apoyo a alistamiento mensual")

    def test_list_schedules_detailed_enriches_names(self) -> None:
        with Session(self.engine) as session:
            rows = self._list_schedules_detailed(session, group_id=self.ids["group"])
        self.assertEqual(len(rows), 2)

        by_date = {row.date: row for row in rows}
        with_topic_row = by_date[date(2026, 7, 7)]
        self.assertEqual(with_topic_row.instructor_name, "Ana Perez")
        self.assertEqual(with_topic_row.group_code, "G1")
        self.assertEqual(with_topic_row.group_trimester, "TRIMESTRE III")
        self.assertEqual(with_topic_row.training_program_name, "Programa uno")
        self.assertEqual(with_topic_row.learning_result_code, "RA1")
        self.assertEqual(with_topic_row.topic_name, "Tematica uno")
        self.assertEqual(with_topic_row.weekday_label, "Martes")
        self.assertEqual(with_topic_row.status, "validated")

        manual_topic_row = by_date[date(2026, 7, 9)]
        self.assertEqual(manual_topic_row.topic_name, "Tema manual de prueba")
        self.assertEqual(manual_topic_row.weekday_label, "Jueves")

    def test_list_schedules_detailed_filters_by_instructor(self) -> None:
        with Session(self.engine) as session:
            rows = self._list_schedules_detailed(session, instructor_id=self.ids["instructor"] + 999)
        self.assertEqual(len(rows), 0)

    def test_list_schedules_detailed_requires_instructor_or_group(self) -> None:
        with Session(self.engine) as session:
            with self.assertRaises(HTTPException) as context:
                self._list_schedules_detailed(session)
        self.assertEqual(context.exception.status_code, 422)
        self.assertIn("instructor o ficha", context.exception.detail)


class ScheduleAdditionalHoursSyncTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SQLModel.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            self.ids = _seed_topic_fixtures(session)

    def tearDown(self) -> None:
        self.engine.dispose()

    def test_create_updates_instructor_monthly_additional_hours(self) -> None:
        with Session(self.engine) as session:
            create_schedule(_additional_payload(self.ids["instructor"], hours=8), session)
            instructor = session.get(Instructor, self.ids["instructor"])

        self.assertEqual(float(instructor.monthly_additional_hours), 8)

    def test_update_resyncs_previous_and_new_instructor(self) -> None:
        with Session(self.engine) as session:
            other = Instructor(
                document_type="CC",
                document_number="200",
                first_name="Luis",
                last_name="Gomez",
                email="luis@example.com",
            )
            session.add(other)
            session.commit()
            session.refresh(other)

            result = create_schedule(_additional_payload(self.ids["instructor"], hours=8), session)
            schedule_id = result.schedule["id"]
            update_schedule(schedule_id, ScheduleUpdate(instructor_id=other.id, duration_hours=5), session)

            original = session.get(Instructor, self.ids["instructor"])
            moved = session.get(Instructor, other.id)

        self.assertEqual(float(original.monthly_additional_hours), 0)
        self.assertEqual(float(moved.monthly_additional_hours), 5)

    def test_cancel_and_delete_remove_hours_from_instructor_total(self) -> None:
        with Session(self.engine) as session:
            first = create_schedule(_additional_payload(self.ids["instructor"], hours=8), session)
            cancel_schedule(first.schedule["id"], session)
            instructor = session.get(Instructor, self.ids["instructor"])
            self.assertEqual(float(instructor.monthly_additional_hours), 0)

            second = create_schedule(_additional_payload(self.ids["instructor"], hours=6), session)
            delete_schedule(second.schedule["id"], session)
            instructor = session.get(Instructor, self.ids["instructor"])

        self.assertEqual(float(instructor.monthly_additional_hours), 0)

    def test_delete_removes_validations_and_exceptions(self) -> None:
        with Session(self.engine) as session:
            result = create_schedule(_additional_payload(self.ids["instructor"], hours=4), session)
            schedule_id = result.schedule["id"]
            validation = ScheduleValidation(
                schedule_id=schedule_id,
                rule_code="TEST_RULE",
                severity="WARNING",
                message="Prueba",
            )
            exception = ExceptionRequest(
                schedule_id=schedule_id,
                rule_code="TEST_RULE",
                justification="Prueba",
            )
            session.add(validation)
            session.add(exception)
            session.commit()
            session.refresh(validation)
            session.refresh(exception)

            delete_schedule(schedule_id, session)

            self.assertIsNone(session.get(ScheduleValidation, validation.id))
            self.assertIsNone(session.get(ExceptionRequest, exception.id))


if __name__ == "__main__":
    unittest.main()
