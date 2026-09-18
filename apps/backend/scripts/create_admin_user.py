"""Create initial admin user and roles.

Usage:
    PYTHONPATH=apps/backend ADMIN_EMAIL=admin@example.com \\
        ADMIN_PASSWORD=ChangeMe123! ADMIN_FULL_NAME=Administrador \\
        python apps/backend/scripts/create_admin_user.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.core.config import get_settings
from app.models import Role, User, UserRole
from app.services.auth_service import hash_password
from sqlmodel import Session, create_engine, select


def main() -> None:
    settings = get_settings()
    engine = create_engine(settings.database_url, pool_pre_ping=True)

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Sena1234")
    admin_full_name = os.environ.get("ADMIN_FULL_NAME", "Administrador")

    if not admin_password or len(admin_password) < 8:
        print("ERROR: ADMIN_PASSWORD must be at least 8 characters")
        sys.exit(1)

    role_names = [
        "superadmin",
        "admin",
        "lider_equipo",
        "usuario_adicional",
        "coordinador",
        "programador",
        "consulta",
    ]

    from app.models import Coordination, Specialty

    with Session(engine) as session:
        for name in role_names:
            existing = session.exec(select(Role).where(Role.name == name)).first()
            if not existing:
                session.add(Role(name=name, description=f"Rol {name.replace('_', ' ').title()}"))
                print(f"Created role: {name}")

        # Seed initial coordinations if missing
        initial_coords = [
            ("TELEINFORMATICA", "Teleinformática", "Coordinación de Teleinformática"),
            ("INDUSTRIAS_CREATIVAS", "Industrias Creativas", "Coordinación de Industrias Creativas"),
            ("LOGISTICA", "Logística", "Coordinación de Logística"),
            ("MERCADEO", "Mercadeo", "Coordinación de Mercadeo"),
            ("TRANSVERSALES", "Transversales", "Coordinación de Transversales"),
        ]
        for code, name, desc in initial_coords:
            coord = session.exec(select(Coordination).where(Coordination.code == code)).first()
            if not coord:
                coord = Coordination(code=code, name=name, description=desc)
                session.add(coord)
                session.flush()
                print(f"Created coordination: {name}")

        # Seed initial specialties for Teleinformatica
        teleinfo = session.exec(select(Coordination).where(Coordination.code == "TELEINFORMATICA")).first()
        if teleinfo:
            sample_specs = [
                ("REDES_DATOS", "Redes de Datos"),
                ("ADSO", "Análisis y Desarrollo de Software"),
            ]
            for scode, sname in sample_specs:
                spec = session.exec(select(Specialty).where(Specialty.code == scode)).first()
                if not spec:
                    session.add(Specialty(coordination_id=teleinfo.id, code=scode, name=sname))
                    print(f"Created specialty for {teleinfo.name}: {sname}")

        admin_role = session.exec(select(Role).where(Role.name == "admin")).first()
        if not admin_role:
            print("ERROR: admin role not found after creation")
            sys.exit(1)

        existing_user = session.exec(select(User).where(User.email == admin_email)).first()
        if existing_user:
            print(f"Admin user already exists: {admin_email}")
        else:
            user = User(
                email=admin_email,
                full_name=admin_full_name,
                hashed_password=hash_password(admin_password),
            )
            session.add(user)
            session.flush()
            session.add(UserRole(user_id=user.id, role_id=admin_role.id))
            print(f"Created admin user: {admin_email}")

        session.commit()

    print("Done.")



if __name__ == "__main__":
    main()