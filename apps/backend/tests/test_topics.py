import unittest
from decimal import Decimal

from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.api.routes.topics import get_topic_selection_options, list_topic_selection
from app.main import app
from app.models import LearningResult, LearningResultTopic, Topic, TrainingProgram


class TopicSelectionTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SQLModel.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            self._seed(session)

    def tearDown(self) -> None:
        self.engine.dispose()

    def _seed(self, session: Session) -> None:
        ra_open = LearningResult(code="OA_T01_RA_001", description="Aplicar fundamentos de Python")
        ra_chain = LearningResult(code="CAD_T01_RA_001", description="Gestionar bases de datos")
        program_open = TrainingProgram(code="PROG-OPEN", name="Analisis de software")
        program_chain = TrainingProgram(code="PROG-CHAIN", name="Gestion de redes")
        topic_open = Topic(
            code="OA_T01_TEM_001",
            name="Variables y tipos de datos",
            program_scope="oferta_abierta",
            trimester_number=1,
            estimated_hours=Decimal("6"),
            color_hex="92D050",
        )
        topic_chain = Topic(
            code="CAD_T01_TEM_001",
            name="Normalizacion relacional",
            program_scope="cadena",
            trimester_number=1,
            estimated_hours=Decimal("4"),
            color_hex="FFC000",
        )
        session.add(program_open)
        session.add(program_chain)
        session.add(ra_open)
        session.add(ra_chain)
        session.add(topic_open)
        session.add(topic_chain)
        session.commit()
        session.refresh(program_open)
        session.refresh(program_chain)
        session.refresh(ra_open)
        session.refresh(ra_chain)
        session.refresh(topic_open)
        session.refresh(topic_chain)
        session.add(
            LearningResultTopic(
                relation_id="OA_T01_COLOR_001_OA_T01_RA_001_OA_T01_TEM_001",
                training_program_id=program_open.id,
                training_program_code=program_open.code,
                training_program_name=program_open.name,
                learning_result_id=ra_open.id,
                topic_id=topic_open.id,
                group_id="OA_T01_COLOR_001",
                program_scope="oferta_abierta",
                trimester_number=1,
                color_hex="92D050",
            )
        )
        session.add(
            LearningResultTopic(
                relation_id="CAD_T01_COLOR_001_CAD_T01_RA_001_CAD_T01_TEM_001",
                training_program_id=program_chain.id,
                training_program_code=program_chain.code,
                training_program_name=program_chain.name,
                learning_result_id=ra_chain.id,
                topic_id=topic_chain.id,
                group_id="CAD_T01_COLOR_001",
                program_scope="cadena",
                trimester_number=1,
                color_hex="FFC000",
                relation_status="BLOQUE_MUCHOS_A_MUCHOS",
                confidence="media",
                needs_manual_review=True,
            )
        )
        session.commit()

    def _prefix_exists(self, method: str, prefix: str) -> bool:
        return any(
            hasattr(route, "methods")
            and hasattr(route, "path")
            and route.path.startswith(prefix)
            and method in route.methods
            for route in app.routes
        )

    def test_routes_registered(self) -> None:
        self.assertTrue(self._prefix_exists("GET", "/api/v1/topics/selection"))
        self.assertTrue(self._prefix_exists("GET", "/api/v1/topics/selection-options"))

    def test_selection_returns_related_topics(self) -> None:
        with Session(self.engine) as session:
            result = list_topic_selection(session)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0].learning_result_code, "CAD_T01_RA_001")
        self.assertEqual(result[1].topic_code, "OA_T01_TEM_001")

    def test_selection_filters_open_scope(self) -> None:
        with Session(self.engine) as session:
            result = list_topic_selection(session, program_scope="oferta_abierta")
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].program_scope, "oferta_abierta")

    def test_selection_closed_scope_includes_cadena(self) -> None:
        with Session(self.engine) as session:
            result = list_topic_selection(session, program_scope="oferta_cerrada")
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].program_scope, "cadena")
        self.assertTrue(result[0].needs_manual_review)

    def test_selection_filters_trimester(self) -> None:
        with Session(self.engine) as session:
            result = list_topic_selection(session, trimester_number=1)
            empty = list_topic_selection(session, trimester_number=2)
        self.assertEqual(len(result), 2)
        self.assertEqual(empty, [])

    def test_selection_filters_learning_result_id(self) -> None:
        with Session(self.engine) as session:
            first = list_topic_selection(session, program_scope="oferta_abierta")[0]
            result = list_topic_selection(session, learning_result_id=first.learning_result_id)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].topic_name, "Variables y tipos de datos")

    def test_selection_filters_training_program_id(self) -> None:
        with Session(self.engine) as session:
            first = list_topic_selection(session, program_scope="oferta_abierta")[0]
            result = list_topic_selection(session, training_program_id=first.training_program_id)
            empty = list_topic_selection(session, training_program_id=999)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].training_program_code, "PROG-OPEN")
        self.assertEqual(empty, [])

    def test_selection_searches_text(self) -> None:
        with Session(self.engine) as session:
            result = list_topic_selection(session, search="python")
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].learning_result_code, "OA_T01_RA_001")

    def test_selection_options_returns_available_filters(self) -> None:
        with Session(self.engine) as session:
            result = get_topic_selection_options(session)
        self.assertEqual(result.trimesters, [1])
        self.assertEqual({scope.value for scope in result.program_scopes}, {"cadena", "oferta_abierta"})
        self.assertEqual(len(result.learning_results), 2)


if __name__ == "__main__":
    unittest.main()
