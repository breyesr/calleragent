from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "agentcaller",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    imports=("app.tasks.demo", "app.tasks.messaging"),
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_default_queue="default",
)

celery_app.autodiscover_tasks(["app"], related_name="tasks")
