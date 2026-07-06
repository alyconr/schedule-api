import unittest
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock

from app.main import app
from app.services.import_service import (
    normalize_header,
    normalize_contract_type,
    parse_excel_date,
    get_stable_hash,
    find_col_idx,
    preview_workbook,
    commit_workbook
)
from app.api.routes.imports import get_template_info


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

    def test_normalize_contract_type_aliases(self) -> None:
        self.assertEqual(normalize_contract_type("CONTRATO")["name"], "contratista")
        self.assertEqual(normalize_contract_type("CONTRATISTA")["name"], "contratista")
        self.assertEqual(normalize_contract_type("CONTRATO SENA")["name"], "contratista")
        self.assertEqual(normalize_contract_type("PLANTA")["name"], "planta")
        self.assertEqual(normalize_contract_type("SIN DATO")["name"], "otro")

    def test_preview_does_not_truncate_items(self) -> None:
        import io
        import openpyxl

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "LISTA_INSTRUCTORES_AMBIENTES"
        ws.append(["NOMBRE COMPLETO", "INICIALES", "TIPO CONTRATO"])
        for i in range(55):
            ws.append([f"INSTRUCTOR {i}", f"I{i}", "CONTRATO"])

        f_bytes = io.BytesIO()
        wb.save(f_bytes)
        f_bytes.seek(0)

        res = preview_workbook(f_bytes.read(), "instructores.xlsx", "instructors_environments")
        self.assertEqual(len(res.items["instructors"]), 55)
        self.assertEqual(res.items["instructors"][0]["contract_type_name"], "contratista")

    def test_relational_semaforo_links_by_trimester_and_fill_color(self) -> None:
        import io
        import openpyxl
        from openpyxl.styles import PatternFill

        fill = PatternFill(fill_type="solid", fgColor="FF92D050")
        wb = openpyxl.Workbook()
        ws_ra = wb.active
        ws_ra.title = "Semaforo RA - Oferta Abierta"
        ws_ra.append(["TRIMESTRE I", None])
        ws_ra.append(["01. RA UNO", 6])
        ws_ra["A2"].fill = fill

        ws_topic = wb.create_sheet("Semaforo Oferta Abierta tematic")
        ws_topic.append(["I TRIMESTRE", None])
        ws_topic.append(["TEMA UNO", 6])
        ws_topic["A2"].fill = fill

        f_bytes = io.BytesIO()
        wb.save(f_bytes)
        f_bytes.seek(0)

        res = preview_workbook(f_bytes.read(), "semaforo.xlsx", "semaforos_relacional")
        self.assertEqual(res.summary["learning_results"].valid, 1)
        self.assertEqual(res.summary["topics"].valid, 1)
        self.assertEqual(res.summary["color_groups"].valid, 1)
        self.assertEqual(res.summary["ra_topic_relations"].valid, 1)
        self.assertFalse(res.items["ra_topic_relations"][0]["needs_manual_review"])

    def test_template_info_includes_relational_import_type(self) -> None:
        self.assertIn("semaforos_relacional", get_template_info().supported_import_types)

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
