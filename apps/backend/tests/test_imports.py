import unittest
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock

from app.main import app
from app.services.import_service import (
    normalize_header,
    parse_excel_date,
    get_stable_hash,
    find_col_idx,
    preview_workbook,
    commit_workbook
)


class ImportsRoutesAndServiceTest(unittest.TestCase):
    def _prefix_exists(self, method: str, prefix: str) -> bool:
        for route in app.routes:
            if hasattr(route, "methods") and hasattr(route, "path"):
                if route.path.startswith(prefix) and method in route.methods:
                    return True
        return False

    def test_routes_registered(self) -> None:
        self.assertTrue(self._prefix_exists("POST", "/api/v1/imports/preview"))
        self.assertTrue(self._prefix_exists("POST", "/api/v1/imports/commit"))
        self.assertTrue(self._prefix_exists("GET", "/api/v1/imports/template-info"))

    def test_normalize_header(self) -> None:
        self.assertEqual(normalize_header("INICIALES "), "iniciales")
        self.assertEqual(normalize_header("NOMBRE COMPLETO"), "nombre_completo")
        self.assertEqual(normalize_header("TIPO CONTRATO"), "tipo_contrato")
        self.assertEqual(normalize_header("ACTIVIDAD DE FORMACIÓN"), "actividad_de_formacion")
        self.assertEqual(normalize_header("No. FICHAS"), "no_fichas")
        self.assertEqual(normalize_header(None), "")

    def test_parse_excel_date_serial(self) -> None:
        # 45580 is 2024-10-15 in Excel (due to leap year bug logic)
        parsed_date = parse_excel_date(45580)
        self.assertEqual(parsed_date, date(2024, 10, 15))

    def test_parse_excel_date_string(self) -> None:
        self.assertEqual(parse_excel_date("2026-07-13"), date(2026, 7, 13))
        self.assertEqual(parse_excel_date("15/10/2024"), date(2024, 10, 15))

    def test_get_stable_hash(self) -> None:
        h1 = get_stable_hash("CRISTIAN BUITRAGO")
        h2 = get_stable_hash("CRISTIAN BUITRAGO")
        self.assertEqual(h1, h2)
        self.assertEqual(len(h1), 8)

    def test_find_col_idx(self) -> None:
        headers = ["no_fichas", "ficha", "horasfromacion", "horas"]
        self.assertEqual(find_col_idx(headers, "horas"), 3)
        self.assertEqual(find_col_idx(headers, "ficha"), 1)
        self.assertEqual(find_col_idx(headers, "no_fichas"), 0)

    def test_parser_fails_when_mandatory_sheets_missing(self) -> None:
        import io
        import openpyxl
        
        # Create small empty workbook
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Sheet1"
        
        f_bytes = io.BytesIO()
        wb.save(f_bytes)
        f_bytes.seek(0)
        
        res = preview_workbook(f_bytes.read(), "dummy.xlsx", "semaforos_sena")
        self.assertTrue(len(res.errors) > 0)
        self.assertTrue(any("LISTA_INSTRUCTORES_AMBIENTES" in e.message for e in res.errors))


if __name__ == "__main__":
    unittest.main()
