from celery import shared_task


@shared_task(name="app.tasks.messaging.send", queue="default")
def send(user_id: int, to: str, text: str) -> dict[str, str]:
    return {
        "to": to,
        "text": text,
        "provider": "whatsapp:stub",
        "status": "sent",
    }
