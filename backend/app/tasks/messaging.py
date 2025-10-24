from __future__ import annotations

from typing import Any

from app.celery_app import celery_app
from app.messaging.providers import get_provider_factory


@celery_app.task(name="app.tasks.messaging.send", queue="default")
def send_message(provider_name: str | None, payload: dict[str, Any]) -> dict[str, str]:
    factory = get_provider_factory()
    provider = factory.get(provider_name)

    to_value = payload.get("to")
    text_value = payload.get("text")
    user_value = payload.get("user_id")

    if not isinstance(to_value, str) or not to_value:
        raise ValueError("Missing recipient 'to'")
    if not isinstance(text_value, str) or not text_value:
        raise ValueError("Missing message 'text'")

    user_id: int | None
    if isinstance(user_value, int):
        user_id = user_value
    else:
        try:
            user_id = int(user_value)
        except (TypeError, ValueError):
            user_id = None

    return provider.send_message(user_id=user_id, to=to_value, text=text_value)
