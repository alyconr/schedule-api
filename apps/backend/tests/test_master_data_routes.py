import unittest

from app.main import app


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


if __name__ == "__main__":
    unittest.main()