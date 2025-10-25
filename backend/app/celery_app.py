from celery import Celery

from app.core.config import settings

import app.tasks.messaging  # noqa: F401 ensures messaging tasks register

celery_app = Celery(
    "agentcaller",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
)
celery_app.conf.task_default_queue = "default"

celery_app.autodiscover_tasks(["app"], related_name="tasks")
