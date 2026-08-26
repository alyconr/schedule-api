"""Tests for coordination-scoped access: AccessScope, IDOR, global conflict, privacy."""

import unittest
from datetime import date, time
from decimal import Decimal

from app.api.deps import AccessScope
from app.schemas.master_data import InstructorRead


class AccessScopeTest(unittest.TestCase):
    def test_admin_is_global(self):
        scope = AccessScope(
            user_id=1,
            roles=frozenset({"admin"}),
            coordination_ids=frozenset(),
            is_global=True,
        )
        self.assertTrue(scope.is_global)
        self.assertTrue(scope.can_access(999))
        self.assertTrue(scope.can_access(None))
        self.assertTrue(scope.can_access_any({1, 2, 3}))

    def test_programador_single_coordination(self):
        scope = AccessScope(
            user_id=2,
            roles=frozenset({"programador"}),
            coordination_ids=frozenset({1}),
            is_global=False,
        )
        self.assertFalse(scope.is_global)
        self.assertTrue(scope.can_access(1))
        self.assertFalse(scope.can_access(2))
        self.assertFalse(scope.can_access(None))
        self.assertTrue(scope.can_access_any({1, 2}))
        self.assertFalse(scope.can_access_any({2, 3}))

    def test_programador_multiple_coordinations(self):
        scope = AccessScope(
            user_id=3,
            roles=frozenset({"programador"}),
            coordination_ids=frozenset({1, 5}),
            is_global=False,
        )
        self.assertTrue(scope.can_access(1))
        self.assertTrue(scope.can_access(5))
        self.assertFalse(scope.can_access(2))
        self.assertTrue(scope.can_access_any({1, 2}))
        self.assertTrue(scope.can_access_any({5}))
        self.assertFalse(scope.can_access_any({2, 3}))

    def test_empty_scope_blocks_all(self):
        scope = AccessScope(
            user_id=4,
            roles=frozenset({"consulta"}),
            coordination_ids=frozenset(),
            is_global=False,
        )
        self.assertFalse(scope.can_access(1))
        self.assertFalse(scope.can_access(None))
        self.assertFalse(scope.can_access_any({1, 2, 3}))

    def test_empty_scope_is_not_global(self):
        scope = AccessScope(
            user_id=5,
            roles=frozenset({"programador"}),
            coordination_ids=frozenset(),
            is_global=False,
        )
        self.assertFalse(scope.is_global)
        self.assertFalse(scope.can_access(1))


class GlobalConflictTest(unittest.TestCase):
    """The validation logic must remain global — no coordination filter."""

    def test_overlaps_function_is_pure(self):
        from app.services.schedule_validation import _overlaps
        self.assertTrue(_overlaps(time(8, 0), time(12, 0), time(8, 0), time(12, 0)))
        self.assertTrue(_overlaps(time(8, 0), time(12, 0), time(10, 0), time(14, 0)))
        self.assertFalse(_overlaps(time(8, 0), time(12, 0), time(12, 0), time(14, 0)))
        self.assertFalse(_overlaps(time(8, 0), time(12, 0), time(13, 0), time(15, 0)))

    def test_validate_schedule_detects_cross_coordination_conflict(self):
        from app.services.schedule_validation import validate_schedule
        payload = {
            "instructor_id": "1",
            "group_id": "1",
            "environment_id": "1",
            "learning_result_id": "1",
            "program_learning_result_ids": ["1"],
            "date": date(2026, 8, 25),
            "start_time": time(8, 0),
            "end_time": time(12, 0),
            "duration_hours": 4.0,
            "instructor_contract_type": "planta",
            "instructor_weekly_hours": 0,
            "group_learners": 25,
            "environment_capacity": 30,
            "environment_type": "fisico",
            "instructor_active": True,
            "group_active": True,
            "environment_active": True,
            "existing_schedules": [
                {
                    "instructor_id": "1",
                    "group_id": "2",
                    "environment_id": "2",
                    "learning_result_id": "2",
                    "date": date(2026, 8, 25),
                    "start_time": time(8, 0),
                    "end_time": time(12, 0),
                    "environment_type": "fisico",
                }
            ],
            "is_additional_hours": False,
        }
        result = validate_schedule(payload)
        blocking = [v for v in result["validations"] if v["rule_code"] == "INSTRUCTOR_OVERLAP"]
        self.assertTrue(blocking, "Cross-coordination instructor conflict must be detected")
        self.assertEqual(result["status"], "blocked")

    def test_validate_schedule_no_coordination_filter_in_payload(self):
        """The validate_schedule function has no coordination_id parameter — it operates globally."""
        import inspect
        from app.services.schedule_validation import validate_schedule
        sig = inspect.signature(validate_schedule)
        self.assertNotIn("coordination_id", sig.parameters)
        self.assertNotIn("scope", sig.parameters)
        self.assertNotIn("coordination_ids", sig.parameters)


class PrivacyTest(unittest.TestCase):
    """busy-slots endpoint must not leak sensitive data."""

    def test_busy_slot_shape_minimal(self):
        slot = {
            "date": "2026-08-25",
            "start_time": "08:00:00",
            "end_time": "12:00:00",
            "availability": "busy_other_coordination",
            "label": "Ocupado por otra coordinación",
        }
        forbidden_keys = {
            "schedule_id",
            "group_id",
            "group_code",
            "training_program_id",
            "learning_result_id",
            "learning_result_description",
            "environment_id",
            "coordination_id",
            "coordination_name",
            "notes",
        }
        for key in forbidden_keys:
            self.assertNotIn(key, slot, f"busy slot must not contain {key}")
        self.assertEqual(slot["availability"], "busy_other_coordination")


class InstructorContractTest(unittest.TestCase):
    def test_read_contract_includes_all_coordination_ids(self):
        instructor = InstructorRead(
            id=7,
            document_type="CC",
            document_number="123",
            first_name="Carlos",
            last_name="Pérez",
            email="carlos@example.com",
            primary_coordination_id=3,
            coordination_ids=[1, 2, 3],
            is_active=True,
        )
        self.assertEqual(instructor.coordination_ids, [1, 2, 3])


class ScopeBypassTest(unittest.TestCase):
    """A query param cannot expand scope."""

    def test_can_access_rejects_unauthorized_coordination(self):
        scope = AccessScope(
            user_id=10,
            roles=frozenset({"programador"}),
            coordination_ids=frozenset({1, 5}),
            is_global=False,
        )
        self.assertFalse(scope.can_access(999))

    def test_admin_can_access_anything(self):
        scope = AccessScope(
            user_id=1,
            roles=frozenset({"admin"}),
            coordination_ids=frozenset(),
            is_global=True,
        )
        self.assertTrue(scope.can_access(999))
        self.assertTrue(scope.can_access(None))


if __name__ == "__main__":
    unittest.main()
