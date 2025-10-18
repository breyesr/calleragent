from fastapi import APIRouter

from app.tasks.demo import ping, slow_add

router = APIRouter()


@router.post("/ping")
def enqueue_ping():
    result = ping.delay()
    return {"task_id": result.id}


@router.post("/slow-add")
def enqueue_slow_add(a: int, b: int, delay: int = 1):
    result = slow_add.delay(a, b, delay)
    return {"task_id": result.id}


@router.get("/result/{task_id}")
def get_result(task_id: str):
    from app.celery_app import celery_app

    async_result = celery_app.AsyncResult(task_id)
    return {"state": async_result.state, "result": async_result.result}
