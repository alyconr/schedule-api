import unittest

from app.main import app
from app.models import User, Role, UserRole
from app.services.auth_service import hash_password, verify_password, create_access_token, decode_access_token
from app.api.deps import ROLE_READ, ROLE_WRITE, ROLE_DELETE


class AuthServiceTest(unittest.TestCase):
    def test_hash_password_does_not_return_plaintext(self) -> None:
        pw = hash_password("secret123")
        self.assertNotEqual(pw, "secret123")
        self.assertTrue(pw.startswith("$argon2"))

    def test_verify_password_correct(self) -> None:
        pw = hash_password("secret123")
        self.assertTrue(verify_password("secret123", pw))

    def test_verify_password_incorrect(self) -> None:
        pw = hash_password("secret123")
        self.assertFalse(verify_password("wrong", pw))

    def test_create_and_decode_token(self) -> None:
        token = create_access_token("1", ["admin", "consulta"])
        payload = decode_access_token(token)
        self.assertEqual(payload["sub"], "1")
        self.assertIn("admin", payload["roles"])
        self.assertIn("exp", payload)

    def test_invalid_token_raises(self) -> None:
        with self.assertRaises(ValueError):
            decode_access_token("invalid.token.here")


class AuthRoutesTest(unittest.TestCase):
    def test_login_route_registered(self) -> None:
        found = any(
            hasattr(r, "methods") and hasattr(r, "path")
            and r.path == "/api/v1/auth/login" and "POST" in r.methods
            for r in app.routes
        )
        self.assertTrue(found)

    def test_me_route_registered(self) -> None:
        found = any(
            hasattr(r, "methods") and hasattr(r, "path")
            and r.path == "/api/v1/auth/me" and "GET" in r.methods
            for r in app.routes
        )
        self.assertTrue(found)

    def test_users_routes_registered(self) -> None:
        found_get = any(
            hasattr(r, "methods") and hasattr(r, "path")
            and r.path.startswith("/api/v1/users") and "GET" in r.methods
            for r in app.routes
        )
        found_post = any(
            hasattr(r, "methods") and hasattr(r, "path")
            and r.path == "/api/v1/users" and "POST" in r.methods
            for r in app.routes
        )
        self.assertTrue(found_get)
        self.assertTrue(found_post)

    def test_health_still_public(self) -> None:
        found = any(
            hasattr(r, "methods") and hasattr(r, "path")
            and r.path == "/api/v1/health" and "GET" in r.methods
            for r in app.routes
        )
        self.assertTrue(found)

    def test_models_import(self) -> None:
        self.assertIsNotNone(User)
        self.assertIsNotNone(Role)
        self.assertIsNotNone(UserRole)

    def test_role_constants_defined(self) -> None:
        self.assertIn("admin", ROLE_READ)
        self.assertIn("admin", ROLE_WRITE)
        self.assertIn("admin", ROLE_DELETE)
        self.assertNotIn("consulta", ROLE_WRITE)
        self.assertNotIn("programador", ROLE_DELETE)


class AuthDepsTest(unittest.TestCase):
    def test_get_current_user_rejects_missing_token(self) -> None:
        from fastapi import HTTPException
        from app.api.deps import get_current_user, Session
        from unittest.mock import MagicMock
        with self.assertRaises(HTTPException) as ctx:
            try:
                get_current_user(None, MagicMock())
            except HTTPException as exc:
                self.assertEqual(exc.status_code, 401)
                self.assertIn("Missing", exc.detail)
                raise
        self.assertEqual(ctx.exception.status_code, 401)

    def test_require_roles_returns_callable(self) -> None:
        from app.api.deps import require_roles
        checker = require_roles("admin")
        self.assertTrue(callable(checker))


class AuthConfigTest(unittest.TestCase):
    def test_insecure_dev_secret_allowed_in_local(self) -> None:
        from app.core.config import Settings
        s = Settings()
        self.assertFalse(s.is_production)

    def test_production_rejects_short_secret(self) -> None:
        import os
        from app.core.config import Settings
        s = Settings(
            app_env="production",
            jwt_secret_key="short",
        )
        self.assertTrue(s.is_production)
        self.assertLess(len(s.jwt_secret_key), 16)


class UserManagementSecurityTest(unittest.TestCase):
    def test_cannot_deactivate_self(self) -> None:
        from fastapi import HTTPException
        from app.api.routes.users import delete_user
        from app.models import User
        from unittest.mock import MagicMock
        
        current_user = User(id=1, email="admin@example.com", full_name="Admin", is_active=True)
        session = MagicMock()
        
        with self.assertRaises(HTTPException) as ctx:
            delete_user(user_id=1, session=session, current_user=current_user)
        
        self.assertEqual(ctx.exception.status_code, 422)
        self.assertIn("cannot deactivate your own user", ctx.exception.detail)

    def test_cannot_remove_own_admin_role(self) -> None:
        from fastapi import HTTPException
        from app.api.routes.users import update_user
        from app.models import User
        from app.schemas.auth import UserUpdate
        from unittest.mock import MagicMock
        
        current_user = User(id=1, email="admin@example.com", full_name="Admin", is_active=True)
        session = MagicMock()
        payload = UserUpdate(roles=["coordinador"]) # no admin role
        
        with self.assertRaises(HTTPException) as ctx:
            update_user(user_id=1, payload=payload, session=session, current_user=current_user)
            
        self.assertEqual(ctx.exception.status_code, 422)
        self.assertIn("cannot remove your own admin role", ctx.exception.detail)


if __name__ == "__main__":
    unittest.main()