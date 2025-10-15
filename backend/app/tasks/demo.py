from time import sleep

from app.celery_app import celery


@celery.task(name="app.tasks.demo.ping")
def ping():
    return "pong"


@celery.task(name="app.tasks.demo.slow_add")
def slow_add(a: int, b: int, delay: int = 2):
    sleep(delay)
    return a + b
