import unittest
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import MagicMock

from openpyxl import Workbook

from app.services.schedule_history_import import preview_schedule_history


def _workbook(schedule_date: str) -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(
        [
            "fecha",
            "documento_instructor",
            "ficha",
            "ambiente",
            "codigo_rap",
            "hora_inicio",
            "hora_fin",
            "duracion_horas",
            "tematica",
        ]
    )
    sheet.append(
        [schedule_date, "1001", "F-001", "A-101", "RAP-01", "08:00", "10:00", 2, "Tema histórico"]
    )
    output = BytesIO()
    workbook.save(output)
    workbook.close()
    return output.getvalue()


def _session() -> MagicMock:
    session = MagicMock()
    entities = [
        SimpleNamespace(id=1),
        SimpleNamespace(id=2, training_program_id=3),
        SimpleNamespace(id=4),
        SimpleNamespace(id=5, competency_id=6),
    ]
    results = []
    for entity in entities:
        result = MagicMock()
        result.first.return_value = entity
        results.append(result)
    topic_result = MagicMock()
    topic_result.all.return_value = []
    results.append(topic_result)
    session.exec.side_effect = results
    return session


class ScheduleHistoryImportTest(unittest.TestCase):
    def test_preview_accepts_rows_from_selected_quarter(self) -> None:
        preview = preview_schedule_history(
            _session(),
            _workbook("2026-07-15"),
            "historico.xlsx",
            2026,
            3,
        )

        self.assertEqual(preview.summary["schedules"].valid, 1)
        self.assertEqual(preview.summary["schedules"].rejected, 0)
        self.assertEqual(preview.items["schedules"][0]["schedule_quarter"], 3)

    def test_preview_rejects_rows_from_another_quarter(self) -> None:
        preview = preview_schedule_history(
            _session(),
            _workbook("2026-04-15"),
            "historico.xlsx",
            2026,
            3,
        )

        self.assertEqual(preview.summary["schedules"].valid, 0)
        self.assertEqual(preview.summary["schedules"].rejected, 1)
        self.assertIn("no pertenece", preview.errors[0].message)


if __name__ == "__main__":
    unittest.main()
