from time import sleep

from celery import shared_task


@shared_task(name="app.tasks.demo.ping", queue="default")
def ping():
    return "pong"


@shared_task(name="app.tasks.demo.slow_add", queue="default")
def slow_add(a: int, b: int, delay: int = 1):
    sleep(delay)
    return a + b
