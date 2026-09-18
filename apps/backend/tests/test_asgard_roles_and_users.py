import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.api.deps import get_session
from app.core.config import get_settings
from app.main import app
from app.models import Coordination, Role, Specialty, User, UserCoordination, UserRole
from app.models.pedagogical import PedagogicalPlanning, PlanningMatrix
from app.services.auth_service import create_access_token, hash_password


@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(name="setup_data")
def setup_data_fixture(session: Session):
    # Roles
    roles = {}
    for r_name in ["superadmin", "admin", "lider_equipo", "usuario_adicional", "consulta"]:
        role = Role(name=r_name, description=f"Rol {r_name}")
        session.add(role)
        roles[r_name] = role
    session.flush()

    # Coordinations
    coord_tele = Coordination(code="TELEINFORMATICA", name="Teleinformática", description="Área TI")
    coord_crea = Coordination(code="INDUSTRIAS_CREATIVAS", name="Industrias Creativas", description="Área Creativa")
    session.add(coord_tele)
    session.add(coord_crea)
    session.flush()

    # Specialties
    spec_redes = Specialty(coordination_id=coord_tele.id, code="REDES_DATOS", name="Redes de Datos")
    spec_adso = Specialty(coordination_id=coord_tele.id, code="ADSO", name="Análisis y Desarrollo de Software")
    spec_anim = Specialty(coordination_id=coord_crea.id, code="ANIMACION", name="Animación Digital")
    session.add(spec_redes)
    session.add(spec_adso)
    session.add(spec_anim)
    session.flush()

    # Admin User (Pedagógico)
    admin_user = User(
        email="admin.pedagogico@sena.edu.co",
        full_name="Administrador Pedagógico",
        first_name="Admin",
        last_name="Pedagógico",
        phone="3001112233",
        hashed_password=hash_password("AdminPass123!"),
    )
    session.add(admin_user)
    session.flush()
    session.add(UserRole(user_id=admin_user.id, role_id=roles["admin"].id))

    # Leader User (Teleinformática - Redes)
    leader_user = User(
        email="lider.redes@sena.edu.co",
        full_name="Carlos Líder Redes",
        first_name="Carlos",
        last_name="Líder",
        phone="3102223344",
        coordination_id=coord_tele.id,
        specialty_id=spec_redes.id,
        hashed_password=hash_password("LeaderPass123!"),
    )
    session.add(leader_user)
    session.flush()
    session.add(UserRole(user_id=leader_user.id, role_id=roles["lider_equipo"].id))
    session.add(UserCoordination(user_id=leader_user.id, coordination_id=coord_tele.id))

    session.commit()

    return {
        "roles": roles,
        "coord_tele": coord_tele,
        "coord_crea": coord_crea,
        "spec_redes": spec_redes,
        "spec_adso": spec_adso,
        "spec_anim": spec_anim,
        "admin_user": admin_user,
        "leader_user": leader_user,
    }


def _auth_header(user: User, roles: list[str]) -> dict:
    token = create_access_token(str(user.id), roles)
    return {"Authorization": f"Bearer {token}"}


def test_create_leader_without_coordination_or_specialty_fails(client: TestClient, setup_data: dict):
    admin = setup_data["admin_user"]
    headers = _auth_header(admin, ["admin"])

    # Missing coordination_id and specialty_id
    payload = {
        "email": "nuevo.lider@sena.edu.co",
        "first_name": "Pedro",
        "last_name": "Pérez",
        "phone": "3001234567",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "roles": ["lider_equipo"],
    }
    response = client.post("/api/v1/users", json=payload, headers=headers)
    assert response.status_code == 422


def test_create_leader_with_mismatched_specialty_fails(client: TestClient, setup_data: dict):
    admin = setup_data["admin_user"]
    coord_tele = setup_data["coord_tele"]
    spec_anim = setup_data["spec_anim"]  # Belongs to INDUSTRIAS_CREATIVAS
    headers = _auth_header(admin, ["admin"])

    payload = {
        "email": "nuevo.lider.invalido@sena.edu.co",
        "first_name": "Pedro",
        "last_name": "Pérez",
        "phone": "3001234567",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "roles": ["lider_equipo"],
        "coordination_id": coord_tele.id,
        "specialty_id": spec_anim.id,  # mismatch!
    }
    response = client.post("/api/v1/users", json=payload, headers=headers)
    assert response.status_code == 422
    assert "no pertenece a la coordinación" in response.json()["detail"]


def test_create_leader_password_mismatch_fails(client: TestClient, setup_data: dict):
    admin = setup_data["admin_user"]
    coord_tele = setup_data["coord_tele"]
    spec_redes = setup_data["spec_redes"]
    headers = _auth_header(admin, ["admin"])

    payload = {
        "email": "mismatch@sena.edu.co",
        "first_name": "Pedro",
        "last_name": "Pérez",
        "phone": "3001234567",
        "password": "Password123!",
        "confirm_password": "WrongPassword123!",
        "roles": ["lider_equipo"],
        "coordination_id": coord_tele.id,
        "specialty_id": spec_redes.id,
    }
    response = client.post("/api/v1/users", json=payload, headers=headers)
    assert response.status_code == 422


def test_create_leader_success(client: TestClient, setup_data: dict):
    admin = setup_data["admin_user"]
    coord_tele = setup_data["coord_tele"]
    spec_adso = setup_data["spec_adso"]
    headers = _auth_header(admin, ["admin"])

    payload = {
        "email": "lider.adso@sena.edu.co",
        "first_name": "Laura",
        "last_name": "Gómez",
        "phone": "3159998877",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "roles": ["lider_equipo"],
        "coordination_id": coord_tele.id,
        "specialty_id": spec_adso.id,
    }
    response = client.post("/api/v1/users", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "lider.adso@sena.edu.co"
    assert data["first_name"] == "Laura"
    assert data["last_name"] == "Gómez"
    assert data["phone"] == "3159998877"
    assert data["coordination_id"] == coord_tele.id
    assert data["specialty_id"] == spec_adso.id
    assert data["coordination_name"] == "Teleinformática"
    assert data["specialty_name"] == "Análisis y Desarrollo de Software"
    assert "lider_equipo" in data["roles"]


def test_create_additional_user_success(client: TestClient, setup_data: dict):
    admin = setup_data["admin_user"]
    coord_tele = setup_data["coord_tele"]
    spec_redes = setup_data["spec_redes"]
    headers = _auth_header(admin, ["admin"])

    payload = {
        "email": "apoyo.redes@sena.edu.co",
        "first_name": "Andrés",
        "last_name": "Martínez",
        "phone": "3201114455",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "roles": ["usuario_adicional"],
        "coordination_id": coord_tele.id,
        "specialty_id": spec_redes.id,
    }
    response = client.post("/api/v1/users", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "apoyo.redes@sena.edu.co"
    assert "usuario_adicional" in data["roles"]


def test_pedagogical_planning_and_dashboard_scoping(client: TestClient, setup_data: dict, session: Session):
    admin = setup_data["admin_user"]
    leader = setup_data["leader_user"]
    coord_tele = setup_data["coord_tele"]
    coord_crea = setup_data["coord_crea"]
    spec_redes = setup_data["spec_redes"]
    spec_anim = setup_data["spec_anim"]

    leader_headers = _auth_header(leader, ["lider_equipo"])
    admin_headers = _auth_header(admin, ["admin"])

    # 1. Leader creates planning for their specialty (Redes de datos)
    plan_payload = {
        "coordination_id": coord_tele.id,
        "specialty_id": spec_redes.id,
        "program_code": "228101",
        "program_name": "Gestión de Redes de Datos",
        "program_version": "2",
        "project_code": "PRJ-REDES-01",
        "project_name": "Implementación de Infraestructura Segura",
        "project_version": "1",
        "executing_team": "Equipo Redes Central",
        "observations": "Planeación inicial 2026",
    }
    resp = client.post("/api/v1/pedagogical-plannings", json=plan_payload, headers=leader_headers)
    assert resp.status_code == 201
    redes_plan_id = resp.json()["id"]

    # 2. Leader attempts to create planning for another specialty (Animación) -> Forbidden 403
    forbidden_payload = dict(plan_payload)
    forbidden_payload["coordination_id"] = coord_crea.id
    forbidden_payload["specialty_id"] = spec_anim.id
    resp_forbid = client.post("/api/v1/pedagogical-plannings", json=forbidden_payload, headers=leader_headers)
    assert resp_forbid.status_code == 403

    # 3. Create another planning in Animación directly by Admin
    admin_plan_payload = {
        "coordination_id": coord_crea.id,
        "specialty_id": spec_anim.id,
        "program_code": "524101",
        "program_name": "Animación Digital 3D",
        "program_version": "1",
        "project_code": "PRJ-ANIM-01",
        "project_name": "Producción Cortometraje Animado",
        "project_version": "1",
        "executing_team": "Equipo Animación Creativa",
    }
    resp_admin = client.post("/api/v1/pedagogical-plannings", json=admin_plan_payload, headers=admin_headers)
    assert resp_admin.status_code == 201
    anim_plan_id = resp_admin.json()["id"]

    # 4. Upload matrix to Redes planning
    matrix_payload = {
        "matrix_type": "program",
        "original_filename": "Matriz_Programa_Redes_228101.xlsx",
        "file_url": "/files/matrices/Matriz_Programa_Redes_228101.xlsx",
    }
    resp_mat = client.post(
        f"/api/v1/pedagogical-plannings/{redes_plan_id}/matrices",
        json=matrix_payload,
        headers=leader_headers,
    )
    assert resp_mat.status_code == 201
    assert resp_mat.json()["matrix_type"] == "program"

    # 5. DASHBOARD SCOPING TEST
    # Leader dashboard must ONLY contain their own plannings (Redes de datos, total: 1)
    dash_leader = client.get("/api/v1/pedagogical-plannings/dashboard", headers=leader_headers)
    assert dash_leader.status_code == 200
    leader_data = dash_leader.json()
    assert leader_data["total_plannings"] == 1
    assert leader_data["items"][0]["id"] == redes_plan_id
    assert leader_data["items"][0]["specialty_id"] == spec_redes.id
    # Ensure matrices are returned
    assert len(leader_data["items"][0]["matrices"]) == 1

    # Admin dashboard sees ALL plannings (total: 2)
    dash_admin = client.get("/api/v1/pedagogical-plannings/dashboard", headers=admin_headers)
    assert dash_admin.status_code == 200
    admin_data = dash_admin.json()
    assert admin_data["total_plannings"] == 2

    # Admin filters by Teleinformática -> Redes de datos
    dash_filtered = client.get(
        f"/api/v1/pedagogical-plannings/dashboard?coordination_id={coord_tele.id}&specialty_id={spec_redes.id}",
        headers=admin_headers,
    )
    assert dash_filtered.status_code == 200
    filtered_data = dash_filtered.json()
    assert filtered_data["total_plannings"] == 1
    assert filtered_data["items"][0]["program_name"] == "Gestión de Redes de Datos"

    # 6. Status flow: Leader changes draft -> in_review
    resp_status = client.put(
        f"/api/v1/pedagogical-plannings/{redes_plan_id}/status",
        json={"status": "in_review", "observations": "Listo para revisión pedagógica"},
        headers=leader_headers,
    )
    assert resp_status.status_code == 200
    assert resp_status.json()["status"] == "in_review"

    # Leader cannot approve directly -> 403
    resp_illegal_approve = client.put(
        f"/api/v1/pedagogical-plannings/{redes_plan_id}/status",
        json={"status": "approved"},
        headers=leader_headers,
    )
    assert resp_illegal_approve.status_code == 403

    # Admin approves
    resp_admin_approve = client.put(
        f"/api/v1/pedagogical-plannings/{redes_plan_id}/status",
        json={"status": "approved", "observations": "Aprobado por Equipo Pedagógico"},
        headers=admin_headers,
    )
    assert resp_admin_approve.status_code == 200
    assert resp_admin_approve.json()["status"] == "approved"
