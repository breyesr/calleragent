import os
from pydantic import BaseModel

class Settings(BaseModel):
    APP_ENV: str = os.getenv("APP_ENV", "dev")
    APP_NAME: str = os.getenv("APP_NAME", "AgentCaller")
    API_V1_PREFIX: str = os.getenv("API_V1_PREFIX", "/v1")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "devsecret")

    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/agentcaller")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")

    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_OAUTH_REDIRECT_URL: str = os.getenv(
        "GOOGLE_OAUTH_REDIRECT_URL",
        "http://localhost:8000/v1/integrations/google/calendar/oauth/callback",
    )
    GOOGLE_API_SCOPES: str = os.getenv(
        "GOOGLE_API_SCOPES", "https://www.googleapis.com/auth/calendar.readonly"
    )

    @property
    def CELERY_BROKER_URL(self) -> str:
        return self.REDIS_URL

    @property
    def CELERY_RESULT_BACKEND(self) -> str:
        return self.REDIS_URL

settings = Settings()
