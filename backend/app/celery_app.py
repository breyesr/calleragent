from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "agentcaller",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    imports=("app.tasks.demo", "app.tasks.messaging"),
    task_default_queue="default",
    accept_content=["json"],
    task_serializer="json",
    result_serializer="json",
)

celery_app.autodiscover_tasks(["app"])
