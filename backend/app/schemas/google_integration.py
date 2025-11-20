from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class GoogleIntegrationStatus(BaseModel):
    connected: bool
    account_email: str | None
    last_synced_at: datetime | None
    provider: Literal["google", "stub"]


class GoogleAuthStartResponse(BaseModel):
    authorization_url: str
    state: str
