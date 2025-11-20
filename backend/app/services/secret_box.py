import base64
import hashlib
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


def _derive_key(secret: str) -> bytes:
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


class SecretBox:
    """Utility to symmetric encrypt/decrypt short secrets (tokens, refresh keys, etc.)."""

    def __init__(self, secret: str) -> None:
        self._fernet = Fernet(_derive_key(secret))

    def encrypt(self, value: str | bytes) -> str:
        payload = value if isinstance(value, bytes) else value.encode("utf-8")
        return self._fernet.encrypt(payload).decode("utf-8")

    def decrypt(self, token: Optional[str]) -> Optional[str]:
        if not token:
            return None
        try:
            return self._fernet.decrypt(token.encode("utf-8")).decode("utf-8")
        except InvalidToken:
            return None


secret_box = SecretBox(settings.SECRET_KEY)
