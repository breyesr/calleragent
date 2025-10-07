from pydantic import BaseModel
import os

class Settings(BaseModel):
    APP_ENV: str = os.getenv("APP_ENV", "dev")
    APP_NAME: str = os.getenv("APP_NAME", "AgentCaller")
    API_V1_PREFIX: str = os.getenv("API_V1_PREFIX", "/v1")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me")

    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/agentcaller")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

settings = Settings()
