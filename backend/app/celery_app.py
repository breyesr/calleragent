from celery import Celery

from app.core.config import settings

celery = Celery("agentcaller", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
celery.conf.task_routes = {"app.tasks.*": {"queue": "default"}}
celery.autodiscover_tasks(["app.tasks"])
