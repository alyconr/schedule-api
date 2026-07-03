import unittest

from app.main import app
from app.services.schedule_service import derive_contract_type, get_week_range
from datetime import date


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


if __name__ == "__main__":
    unittest.main()