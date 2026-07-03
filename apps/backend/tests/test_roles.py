import unittest

from app.main import app
from app.models.auth import Role
from app.schemas.auth import RoleResponse


class RolesTest(unittest.TestCase):
    def test_roles_route_registered(self) -> None:
        found = any(
            hasattr(r, "methods") and hasattr(r, "path")
            and r.path == "/api/v1/roles" and "GET" in r.methods
            for r in app.routes
        )
        self.assertTrue(found)

    def test_role_imports(self) -> None:
        self.assertIsNotNone(Role)
        self.assertIsNotNone(RoleResponse)
