import logging
import time

from app.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.messaging.whatsapp_send", queue="default")
def whatsapp_send(user_id: int, to: str, text: str):
    logger.info(
        "WhatsApp stub send enqueued",
        extra={"user_id": user_id, "to": to, "text": text[:200]},
    )
    time.sleep(0.5)
    return {
        "provider": "whatsapp:stub",
        "to": to,
        "status": "sent",
        "echo": text,
    }
