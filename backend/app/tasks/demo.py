from time import sleep

from app.celery_app import celery_app


@celery_app.task(name="app.tasks.demo.ping", queue="default")
def ping():
    return "pong"


@celery_app.task(name="app.tasks.demo.slow_add", queue="default")
def slow_add(a: int, b: int, delay: int = 1):
    sleep(delay)
    return a + b
