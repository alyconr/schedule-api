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
    admin_password = os.environ.get("ADMIN_PASSWORD", "ChangeMe123!")
    admin_full_name = os.environ.get("ADMIN_FULL_NAME", "Administrador")

    if not admin_password or len(admin_password) < 8:
        print("ERROR: ADMIN_PASSWORD must be at least 8 characters")
        sys.exit(1)

    role_names = ["admin", "coordinador", "programador", "consulta"]

    with Session(engine) as session:
        for name in role_names:
            existing = session.exec(select(Role).where(Role.name == name)).first()
            if not existing:
                session.add(Role(name=name, description=f"Rol {name}"))
                print(f"Created role: {name}")

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