import unittest

from app.main import app
from app.models import User, Role, UserRole
from app.services.auth_service import hash_password, verify_password, create_access_token, decode_access_token


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


if __name__ == "__main__":
    unittest.main()