from typing import Any, Dict

from app.celery_app import celery_app


@celery_app.task(name="app.tasks.messaging.send", queue="default")
def send(payload: Dict[str, Any]) -> Dict[str, Any]:
    data: Dict[str, Any] = dict(payload or {})
    data.setdefault("provider", "whatsapp:stub")
    data["status"] = "sent"
    return data
