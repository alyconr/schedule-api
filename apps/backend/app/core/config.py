from dataclasses import dataclass
from functools import lru_cache
import os


def _csv(value: str) -> tuple[str, ...]:
    return tuple(item.strip() for item in value.split(",") if item.strip())


@dataclass(frozen=True)
class Settings:
    app_env: str = os.getenv("APP_ENV", "local")
    app_name: str = os.getenv("APP_NAME", "Schedule Stack API")
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://sena_user:replace_with_strong_password@localhost:5432/sena_horarios",
    )
    cors_origins: tuple[str, ...] = _csv(os.getenv("CORS_ORIGINS", "http://localhost:5173"))
    trusted_hosts: tuple[str, ...] = _csv(os.getenv("TRUSTED_HOSTS", "localhost,127.0.0.1,testserver"))
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "insecure-dev-secret-do-not-use-in-production")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_access_token_expire_minutes: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.is_production:
        if s.jwt_secret_key == "insecure-dev-secret-do-not-use-in-production" or len(s.jwt_secret_key) < 16:
            raise RuntimeError("JWT_SECRET_KEY must be at least 16 characters and not the default in production")
    return s
