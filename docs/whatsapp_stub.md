# WhatsApp Send Stub

## Overview
A placeholder integration that enqueues a Celery task instead of calling Meta's WhatsApp Cloud API. Safe for local testing—no external network requests are made.

## Endpoint
- **URL**: `POST /v1/messaging/whatsapp/send`
- **Auth**: Bearer token (JWT). Obtain via `/v1/auth/login`.
- **Body**:
  ```json
  {
    "to": "+15551234567",
    "text": "hello from stub"
  }
  ```
- **Response (202)**:
  ```json
  {
    "task_id": "<uuid>",
    "status": "queued"
  }
  ```

## Task Result
The Celery worker resolves the task to:
```json
{
  "state": "SUCCESS",
  "result": {
    "provider": "whatsapp:stub",
    "to": "+15551234567",
    "status": "sent",
    "echo": "hello from stub"
  }
}
```

## Smoke Test
1. Start the stack: `docker compose --env-file infra/.env -f infra/docker-compose.yml up -d backend worker redis`
2. Authenticate and export a token:
   ```bash
   export API_TOKEN=$(curl -s -X POST http://localhost:8000/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"secret123"}' | jq -r .access_token)
   ```
3. Run `bash scripts/smoke_whatsapp.sh`
4. Tail worker logs for visibility: `docker compose --env-file infra/.env -f infra/docker-compose.yml logs -f worker`

If the task never transitions to `SUCCESS`, restart the worker container and confirm `celery -A app.celery_app inspect registered` lists `app.tasks.messaging.whatsapp_send`.
