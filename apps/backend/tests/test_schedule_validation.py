from datetime import date, time
import unittest

from app.services.schedule_validation import validate_schedule


def base_payload() -> dict:
    return {
        "instructor_id": "inst-1",
        "group_id": "ficha-1",
        "environment_id": "amb-1",
        "learning_result_id": "rap-1",
        "program_learning_result_ids": ["rap-1"],
        "date": date(2026, 7, 6),
        "start_time": time(8, 0),
        "end_time": time(10, 0),
        "duration_hours": 2,
        "instructor_contract_type": "planta",
        "instructor_weekly_hours": 28,
        "group_learners": 25,
        "environment_capacity": 30,
        "environment_type": "fisico",
        "instructor_active": True,
        "group_active": True,
        "environment_active": True,
        "existing_schedules": [],
    }


class ScheduleValidationTest(unittest.TestCase):
    def test_valid_schedule_has_no_alerts(self) -> None:
        result = validate_schedule(base_payload())
        self.assertEqual(result["status"], "valid")
        self.assertEqual(result["validations"], [])

    def test_blocks_instructor_overlap(self) -> None:
        payload = base_payload()
        payload["existing_schedules"] = [
            {
                "instructor_id": "inst-1",
                "group_id": "ficha-2",
                "environment_id": "amb-2",
                "learning_result_id": "rap-2",
                "date": date(2026, 7, 6),
                "start_time": time(9, 0),
                "end_time": time(11, 0),
                "environment_type": "fisico",
            }
        ]
        result = validate_schedule(payload)
        self.assertEqual(result["status"], "blocked")
        self.assertIn("INSTRUCTOR_OVERLAP", {item["rule_code"] for item in result["validations"]})

    def test_warns_but_does_not_block_low_capacity(self) -> None:
        payload = base_payload()
        payload["group_learners"] = 35
        payload["environment_capacity"] = 20
        result = validate_schedule(payload)
        self.assertEqual(result["status"], "warning")
        self.assertFalse(any(item["is_blocking"] for item in result["validations"]))


if __name__ == "__main__":
    unittest.main()
