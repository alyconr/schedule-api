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

    def test_planta_blocks_over_32_weekly_hours(self) -> None:
        payload = base_payload()
        payload["instructor_contract_type"] = "planta"
        payload["instructor_weekly_hours"] = 31
        payload["duration_hours"] = 2
        result = validate_schedule(payload)
        self.assertEqual(result["status"], "blocked")
        self.assertIn("PLANT_INSTRUCTOR_MAX_HOURS", {item["rule_code"] for item in result["validations"]})

    def test_planta_warns_with_missing_weekly_hours(self) -> None:
        payload = base_payload()
        payload["instructor_contract_type"] = "planta"
        payload["instructor_weekly_hours"] = 20
        payload["duration_hours"] = 4
        result = validate_schedule(payload)
        warning = next(item for item in result["validations"] if item["rule_code"] == "PLANT_INSTRUCTOR_MISSING_HOURS")
        self.assertEqual(result["status"], "warning")
        self.assertIn("6 horas pendientes", warning["message"])

    def test_planta_blocks_weekend_schedule(self) -> None:
        payload = base_payload()
        payload["date"] = date(2026, 7, 11)
        result = validate_schedule(payload)
        self.assertEqual(result["status"], "blocked")
        self.assertIn("PLANT_INSTRUCTOR_WEEKEND", {item["rule_code"] for item in result["validations"]})

    def test_planta_blocks_night_schedule(self) -> None:
        payload = base_payload()
        payload["start_time"] = time(17, 0)
        payload["end_time"] = time(19, 0)
        result = validate_schedule(payload)
        self.assertEqual(result["status"], "blocked")
        self.assertIn("PLANT_INSTRUCTOR_NIGHT_SHIFT", {item["rule_code"] for item in result["validations"]})

    def test_contratista_rule_uses_40_weekly_hours(self) -> None:
        payload = base_payload()
        payload["instructor_contract_type"] = "contratista"
        payload["instructor_weekly_hours"] = 38
        payload["duration_hours"] = 2
        result = validate_schedule(payload)
        self.assertEqual(result["status"], "valid")
        self.assertNotIn("CONTRACTOR_MISSING_HOURS", {item["rule_code"] for item in result["validations"]})

    def test_additional_hours_skip_calendar_requirements(self) -> None:
        payload = base_payload()
        payload.update(
            {
                "is_additional_hours": True,
                "group_id": "None",
                "environment_id": "None",
                "learning_result_id": "None",
                "start_time": time(0, 0),
                "end_time": time(0, 0),
                "existing_schedules": [
                    {
                        "instructor_id": "inst-1",
                        "group_id": "ficha-1",
                        "environment_id": "amb-1",
                        "learning_result_id": "rap-1",
                        "date": date(2026, 7, 6),
                        "start_time": time(8, 0),
                        "end_time": time(10, 0),
                        "environment_type": "fisico",
                    }
                ],
            }
        )
        result = validate_schedule(payload)
        rules = {item["rule_code"] for item in result["validations"]}
        self.assertNotIn("INVALID_TIME_RANGE", rules)
        self.assertNotIn("INSTRUCTOR_OVERLAP", rules)
        self.assertNotIn("LEARNING_RESULT_NOT_IN_PROGRAM", rules)
        self.assertNotIn("PLANT_INSTRUCTOR_MISSING_HOURS", rules)


if __name__ == "__main__":
    unittest.main()
