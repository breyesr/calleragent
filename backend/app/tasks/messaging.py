from __future__ import annotations

from typing import Any, Dict

from celery import shared_task

STUB_PROVIDER = "whatsapp:stub"


@shared_task(name="app.tasks.messaging.send", queue="default")
def send(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Stub task that mimics sending a WhatsApp message and returns a delivery receipt."""
    result = dict(payload or {})
    result.setdefault("provider", STUB_PROVIDER)
    result["status"] = "sent"
    return result
