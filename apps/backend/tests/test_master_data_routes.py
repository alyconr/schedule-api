import unittest

from sqlmodel import Session, SQLModel, create_engine

from app.main import app
from app.models import ContractType


class MasterDataRoutesTest(unittest.TestCase):
    def _prefix_exists(self, method: str, prefix: str) -> bool:
        for route in app.routes:
            if hasattr(route, "methods") and hasattr(route, "path"):
                if route.path.startswith(prefix) and method in route.methods:
                    return True
        return False

    def _count_routes(self, prefix: str) -> int:
        return sum(
            1 for r in app.routes
            if hasattr(r, "path") and r.path.startswith(prefix)
        )

    def test_routes_registered(self) -> None:
        resources = [
            "contract-types",
            "instructors",
            "training-programs",
            "competencies",
            "learning-results",
            "groups",
            "environments",
            "time-blocks",
        ]
        for resource in resources:
            base = f"/api/v1/{resource}"
            self.assertTrue(self._prefix_exists("GET", base), f"GET {base} missing")
            self.assertTrue(self._prefix_exists("POST", base), f"POST {base} missing")
            self.assertGreaterEqual(self._count_routes(base), 3, f"Not enough routes for {resource}")

    def test_health_still_works(self) -> None:
        self.assertTrue(self._prefix_exists("GET", "/api/v1/health"))

    def test_validate_still_works(self) -> None:
        self.assertTrue(self._prefix_exists("POST", "/api/v1/schedules/validate"))

    def test_schemas_import(self) -> None:
        from app.schemas.master_data import (
            ContractTypeCreate,
            ContractTypeUpdate,
            InstructorCreate,
            InstructorUpdate,
            TrainingProgramCreate,
            TrainingProgramUpdate,
            CompetencyCreate,
            CompetencyUpdate,
            LearningResultCreate,
            LearningResultUpdate,
            GroupCreate,
            GroupUpdate,
            EnvironmentCreate,
            EnvironmentUpdate,
            TimeBlockCreate,
            TimeBlockUpdate,
        )
        self.assertIsNotNone(ContractTypeCreate)
        self.assertIsNotNone(InstructorCreate)
        self.assertIsNotNone(TrainingProgramCreate)
        self.assertIsNotNone(CompetencyCreate)
        self.assertIsNotNone(LearningResultCreate)
        self.assertIsNotNone(GroupCreate)
        self.assertIsNotNone(EnvironmentCreate)
        self.assertIsNotNone(TimeBlockCreate)
        self.assertIsNotNone(ContractTypeUpdate)
        self.assertIsNotNone(InstructorUpdate)
        self.assertIsNotNone(TrainingProgramUpdate)
        self.assertIsNotNone(CompetencyUpdate)
        self.assertIsNotNone(LearningResultUpdate)
        self.assertIsNotNone(GroupUpdate)
        self.assertIsNotNone(EnvironmentUpdate)
        self.assertIsNotNone(TimeBlockUpdate)

    def test_environment_type_rejects_invalid(self) -> None:
        from app.schemas.master_data import EnvironmentCreate
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            EnvironmentCreate(code="X", name="Test", environment_type="invalido")
        valid = EnvironmentCreate(code="X", name="Test", environment_type="virtual")
        self.assertEqual(valid.environment_type, "virtual")

    def test_time_block_requires_at_least_two_hours(self) -> None:
        from app.schemas.master_data import TimeBlockCreate
        from pydantic import ValidationError

        valid = TimeBlockCreate(
            name="Mañana",
            weekday=1,
            start_time="08:00",
            end_time="10:00",
            duration_minutes=120,
        )
        self.assertEqual(valid.duration_minutes, 120)

        with self.assertRaises(ValidationError):
            TimeBlockCreate(
                name="Muy corto",
                weekday=1,
                start_time="08:00",
                end_time="09:59",
                duration_minutes=120,
            )

    def test_time_block_update_recalculates_duration(self) -> None:
        from app.api.routes.time_blocks import create_time_block, update_time_block
        from app.schemas.master_data import TimeBlockCreate, TimeBlockUpdate
        from fastapi import HTTPException

        engine = create_engine("sqlite:///:memory:")
        SQLModel.metadata.create_all(engine)
        with Session(engine) as session:
            created = create_time_block(
                TimeBlockCreate(
                    name="Mañana",
                    weekday=1,
                    start_time="08:00",
                    end_time="10:00",
                    duration_minutes=120,
                ),
                session,
            )
            updated = update_time_block(
                created.id,
                TimeBlockUpdate(end_time="11:00"),
                session,
            )
            self.assertEqual(updated.duration_minutes, 180)

            with self.assertRaises(HTTPException) as ctx:
                update_time_block(
                    created.id,
                    TimeBlockUpdate(end_time="09:59"),
                    session,
                )
            self.assertEqual(ctx.exception.status_code, 422)

    def test_delete_contract_type_inactivates_and_hides_row_from_list(self) -> None:
        from app.api.routes.contract_types import delete_contract_type, list_contract_types

        engine = create_engine("sqlite:///:memory:")
        SQLModel.metadata.create_all(engine)
        with Session(engine) as session:
            obj = ContractType(name="TEST_DELETE")
            session.add(obj)
            session.commit()
            session.refresh(obj)

            delete_contract_type(obj.id, session)

            saved = session.get(ContractType, obj.id)
            self.assertIsNotNone(saved)
            self.assertFalse(saved.is_active)
            self.assertEqual(list_contract_types(session), [])

    def test_delete_contract_type_preserves_instructor_relationship(self) -> None:
        from app.api.routes.contract_types import delete_contract_type
        from app.models import Instructor

        engine = create_engine("sqlite:///:memory:")
        SQLModel.metadata.create_all(engine)
        with Session(engine) as session:
            obj = ContractType(name="TEST_DELETE_REFERENCED")
            session.add(obj)
            session.commit()
            session.refresh(obj)
            instructor = Instructor(
                document_type="CC",
                document_number="123",
                first_name="Ada",
                last_name="Lovelace",
                email="ada@example.com",
                contract_type_id=obj.id,
            )
            session.add(instructor)
            session.commit()

            delete_contract_type(obj.id, session)

            saved_instructor = session.get(Instructor, instructor.id)
            self.assertEqual(saved_instructor.contract_type_id, obj.id)

    def test_contract_type_list_hides_inactive_rows(self) -> None:
        from app.api.routes.contract_types import list_contract_types

        engine = create_engine("sqlite:///:memory:")
        SQLModel.metadata.create_all(engine)
        with Session(engine) as session:
            session.add(ContractType(name="ACTIVE", is_active=True))
            session.add(ContractType(name="INACTIVE", is_active=False))
            session.commit()

            rows = list_contract_types(session)

            self.assertEqual([row.name for row in rows], ["ACTIVE"])

    def test_group_schemas_validation(self) -> None:
        from app.schemas.master_data import GroupCreate, GroupUpdate
        from pydantic import ValidationError

        # Valid GroupCreate
        valid = GroupCreate(code="3068352", trimester="  TRIMESTRE I  ", learners_count=30)
        self.assertEqual(valid.trimester, "TRIMESTRE I")

        # Missing trimester
        with self.assertRaises(ValidationError):
            GroupCreate(code="3068352", learners_count=30)

        # Blank/whitespace trimester
        with self.assertRaises(ValidationError):
            GroupCreate(code="3068352", trimester="   ", learners_count=30)

        # Trimester too long (> 50 chars)
        with self.assertRaises(ValidationError):
            GroupCreate(code="3068352", trimester="T" * 51, learners_count=30)

        # Valid GroupUpdate (omitted)
        up_omitted = GroupUpdate(name="Nombre")
        self.assertNotIn("trimester", up_omitted.model_dump(exclude_unset=True))

        # Invalid GroupUpdate (explicit null)
        with self.assertRaises(ValidationError):
            GroupUpdate(trimester=None)

        # Invalid GroupUpdate (whitespace)
        with self.assertRaises(ValidationError):
            GroupUpdate(trimester="   ")

    def test_group_routes_crud(self) -> None:
        from app.api.routes.groups import create_group, get_group, list_groups, update_group
        from app.schemas.master_data import GroupCreate, GroupUpdate

        engine = create_engine("sqlite:///:memory:")
        SQLModel.metadata.create_all(engine)
        with Session(engine) as session:
            payload = GroupCreate(code="3068352", name="Ficha Test", trimester="TRIMESTRE I", learners_count=25)
            created = create_group(payload, session)
            self.assertEqual(created.trimester, "TRIMESTRE I")

            fetched = get_group(created.id, session)
            self.assertEqual(fetched.trimester, "TRIMESTRE I")

            # Partial update omitting trimester
            updated1 = update_group(created.id, GroupUpdate(name="Nuevo Nombre"), session)
            self.assertEqual(updated1.name, "Nuevo Nombre")
            self.assertEqual(updated1.trimester, "TRIMESTRE I")

            # Update trimester
            updated2 = update_group(created.id, GroupUpdate(trimester="TRIMESTRE II"), session)
            self.assertEqual(updated2.trimester, "TRIMESTRE II")


if __name__ == "__main__":
    unittest.main()
