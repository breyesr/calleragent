# Celery Background Tasks

## Services
- **backend**: FastAPI API exposing task endpoints
- **redis**: message broker + result backend (`REDIS_URL`)
- **worker**: Celery worker processing queued jobs
- **beat**: Celery beat scheduler (optional)

## Environment
Set `REDIS_URL` (default `redis://redis:6379/0`) in `.env` or backend config; frontend/env can reuse the same value.

## Local run sequence
```bash
docker compose --env-file infra/.env -f infra/docker-compose.yml build backend
docker compose --env-file infra/.env -f infra/docker-compose.yml up -d backend redis worker beat
docker compose --env-file infra/.env -f infra/docker-compose.yml logs --tail=120 worker
bash scripts/smoke_tasks.sh
```

## Quick verify (slow_add)
**Terminal 1**
```bash
docker compose --env-file infra/.env -f infra/docker-compose.yml logs -f worker
```

**Terminal 2**
```bash
bash scripts/smoke_slow_add.sh
```

Expected output: the final JSON payload includes `"result": 5`.

If the worker log never shows `Task app.tasks.demo.slow_add[...] received`, restart the worker container and confirm `celery -A app.celery_app inspect registered` lists the demo tasks.

## Troubleshooting
- **Worker cannot reach broker**: verify `REDIS_URL` and that the redis container is healthy.
- **No results**: ensure `CELERY_RESULT_BACKEND` matches redis and worker logs show task completion.
- **OpenAPI missing /v1/tasks**: rerun migrations and confirm routes include the tasks router.
