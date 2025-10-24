from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Protocol, TypedDict

from app.core.config import settings


class MessageResult(TypedDict):
    provider: str
    status: str
    to: str
    message: str


class MessagingProvider(Protocol):
    name: str

    def send_message(self, *, user_id: int | None, to: str, text: str) -> MessageResult:
        """Send a message and return a payload consumed by the API."""


@dataclass
class ProviderFactory:
    providers: dict[str, MessagingProvider]
    default_provider: str

    def get(self, name: str | None = None) -> MessagingProvider:
        key = (name or self.default_provider).lower()
        provider = self.providers.get(key)
        if not provider:
            raise ValueError(f"Unknown messaging provider '{key}'")
        return provider


class StubWhatsAppProvider:
    name = "stub_whatsapp"

    def send_message(self, *, user_id: int | None, to: str, text: str) -> MessageResult:
        return {
            "provider": "whatsapp:stub",
            "status": "sent",
            "to": to,
            "message": text,
        }


@lru_cache(maxsize=1)
def get_provider_factory() -> ProviderFactory:
    stub_provider = StubWhatsAppProvider()
    providers: dict[str, MessagingProvider] = {
        stub_provider.name: stub_provider,
    }
    default_provider = (settings.MESSAGING_PROVIDER or stub_provider.name).lower()
    return ProviderFactory(providers=providers, default_provider=default_provider)
