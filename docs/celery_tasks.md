# Celery Background Tasks Runbook

## Services
- **redis** – broker + result backend (`redis://redis:6379/0`)
- **worker** – Celery worker (`celery -A app.celery_app.celery worker`)
- **beat** – Celery beat scheduler (`celery -A app.celery_app.celery beat`)

## Environment
Set `REDIS_URL` (default `redis://redis:6379/0`) in backend configuration or `.env`.

## Running locally
```bash
# build backend image with Celery deps
docker compose --env-file infra/.env -f infra/docker-compose.yml build backend

# start API, worker, and beat
docker compose --env-file infra/.env -f infra/docker-compose.yml up -d backend worker beat

# inspect containers
docker compose --env-file infra/.env -f infra/docker-compose.yml ps
```

## Enqueueing tasks
```bash
# ping task
curl -s -X POST http://localhost:8000/v1/tasks/ping | jq .

# slow addition
curl -s -X POST "http://localhost:8000/v1/tasks/slow-add?a=2&b=3&delay=1" | jq .

# fetch result (replace TASK_ID)
curl -s http://localhost:8000/v1/tasks/result/TASK_ID | jq .
```

## Checking results
```bash
# tail worker logs for progress
 docker compose --env-file infra/.env -f infra/docker-compose.yml logs --tail=80 worker
```

`SUCCESS` status with `"pong"` or numeric results indicates completion.
