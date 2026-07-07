import unittest
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock

from sqlmodel import Session, SQLModel, create_engine, select

from app.main import app
from app.models import ContractType, Environment, Group, Instructor, LearningResult, LearningResultTopic, Topic, TrainingProgram
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


def build_schedule_normalized_workbook_bytes() -> bytes:
    import io
    import openpyxl

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "LISTA INSTRUCTORES"
    ws.append(["NOMBRE COMPLETO", "TIPO CONTRATO", "HORAS FORMACION", "HORAS ADICIONALES", "COORDINACION"])
    ws.append(["ANA MARIA PEREZ", "PLANTA", 30, 2, "Teleinformatica"])

    ws = wb.create_sheet("AMBIENTES")
    ws.append(["NUMERO", "AMBIENTE O UBICACION"])
    ws.append(["301", "Aula 301"])

    ws = wb.create_sheet("FICHAS")
    ws.append([
        "No. FICHA",
        "FICHA",
        "NIVEL",
        "COORDINACION",
        "TRIMESTRE",
        "FECHA INICIO",
        "FECHA FIN LECTIVA",
        "FECHA INICIO PRODUCTIVA",
        "FECHA FIN PRODUCTIVA",
        "JORNADA",
    ])
    ws.append([
        "3068352",
        "7_TRM_3068352_(MM)_DESARROLLO DE PROCESOS DE MERCADEO",
        "Tecnologo",
        "Mercadeo",
        "TRIMESTRE I - II",
        "2026-07-13",
        "2026-12-13",
        "2027-01-01",
        "2027-06-01",
        "Diurna",
    ])

    headers = [
        "TRIMESTRE",
        "ORDEN_RA",
        "CODIGO_RA",
        "RESULTADO_APRENDIZAJE",
        "TIPO_RESULTADO_RA",
        "HORAS_SEMANA_RA",
        "HORAS_TRIMESTRE_RA",
        "TEMATICA",
        "TIPO_RESULTADO_TEMATICA",
        "HORAS_SEMANA_TEMATICA",
        "COLOR_RELACION",
    ]
    for sheet_name, code, topic, color in (
        ("Semaforo con RA cadena", "RA1", "Investigacion de mercados", "VERDE"),
        ("Semaforo con RA Oferta Abierta", "RA2", "Segmentacion de clientes", "AZUL"),
    ):
        ws = wb.create_sheet(sheet_name)
        ws.append(headers)
        ws.append(["TRIMESTRE I", 1, code, f"Resultado {code}", "especifico", 4, 48, topic, "tematica", 4, color])

    data = io.BytesIO()
    wb.save(data)
    return data.getvalue()


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

    def test_rejects_old_import_types(self) -> None:
        from app.api.routes.imports import ALLOWED_IMPORT_TYPES
        self.assertEqual(ALLOWED_IMPORT_TYPES, ["schedule_normalized"])
        self.assertNotIn("semaforos_relacional", ALLOWED_IMPORT_TYPES)
        self.assertNotIn("semaforos_sena", ALLOWED_IMPORT_TYPES)

    def test_preview_schedule_normalized_workbook(self) -> None:
        res = preview_workbook(
            build_schedule_normalized_workbook_bytes(),
            "SEMAFOROS_NORMALIZADO_SCHEDULE_API.xlsx",
            "schedule_normalized",
        )

        self.assertEqual(res.errors, [])
        self.assertGreater(res.summary["instructors"].valid, 0)
        self.assertGreater(res.summary["environments"].valid, 0)
        self.assertGreater(res.summary["groups"].valid, 0)
        self.assertGreater(res.summary["programs"].valid, 0)
        self.assertGreater(res.summary["learning_results"].valid, 0)
        self.assertGreater(res.summary["topics"].valid, 0)
        self.assertGreater(res.summary["ra_topic_relations"].valid, 0)

    def test_commit_schedule_normalized_workbook(self) -> None:
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
        SQLModel.metadata.create_all(engine)

        with Session(engine) as session:
            result = commit_workbook(
                session,
                build_schedule_normalized_workbook_bytes(),
                "schedule_normalized",
                filename="SEMAFOROS_NORMALIZADO_SCHEDULE_API.xlsx",
            )

            self.assertEqual(result.errors, [])
            self.assertGreaterEqual(session.exec(select(ContractType)).first().id, 1)
            self.assertIsNotNone(session.exec(select(Instructor)).first())
            self.assertIsNotNone(session.exec(select(Environment)).first())
            self.assertIsNotNone(session.exec(select(TrainingProgram)).first())
            self.assertIsNotNone(session.exec(select(Group)).first())
            self.assertIsNotNone(session.exec(select(LearningResult)).first())
            self.assertIsNotNone(session.exec(select(Topic)).first())
            relation = session.exec(select(LearningResultTopic)).first()
            self.assertIsNotNone(relation)
            self.assertIn(relation.program_scope, ("cadena", "oferta_abierta"))
            self.assertEqual(relation.relation_method, "normalized_excel_explicit_relation")
            self.assertEqual(relation.relation_status, "OK")
            self.assertEqual(relation.confidence, "alta")
            self.assertFalse(relation.needs_manual_review)

    def test_template_info_includes_only_schedule_normalized(self) -> None:
        info = get_template_info()
        self.assertEqual(info.supported_import_types, ["schedule_normalized"])
        self.assertEqual(info.supported_formats, [".xlsx"])
        self.assertNotIn("semaforos_relacional", info.supported_import_types)

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
