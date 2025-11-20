from pydantic import BaseModel
import os

class Settings(BaseModel):
    APP_ENV: str = os.getenv("APP_ENV", "dev")
    APP_NAME: str = os.getenv("APP_NAME", "AgentCaller")
    API_V1_PREFIX: str = os.getenv("API_V1_PREFIX", "/v1")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "devsecret")

    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/agentcaller")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")

    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    GOOGLE_CLIENT_ID: str | None = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: str | None = os.getenv("GOOGLE_CLIENT_SECRET")
    GOOGLE_REDIRECT_URI: str | None = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/v1/integrations/google/callback")
    GOOGLE_OAUTH_SCOPES: str = os.getenv(
        "GOOGLE_OAUTH_SCOPES",
        "https://www.googleapis.com/auth/calendar.readonly openid email profile",
    )
    GOOGLE_CALENDAR_ID: str = os.getenv("GOOGLE_CALENDAR_ID", "primary")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3002")

    @property
    def CELERY_BROKER_URL(self) -> str:
        return self.REDIS_URL

    @property
    def CELERY_RESULT_BACKEND(self) -> str:
        return self.REDIS_URL

    @property
    def google_scopes(self) -> list[str]:
        return [scope for scope in self.GOOGLE_OAUTH_SCOPES.split() if scope]

settings = Settings()
