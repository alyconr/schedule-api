from pydantic import BaseModel, ConfigDict


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
    app: str
    environment: str
    database_configured: bool


class DatabaseHealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
