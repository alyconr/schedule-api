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

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
