# WhatsApp Stub Messaging

This stub endpoint lets us exercise the outbound messaging pipeline without calling a real provider. It lives at `POST /v1/messaging/whatsapp/send` and enqueues a Celery job that returns a deterministic payload.

## Prerequisites

- Backend + Redis + worker running via Docker Compose (`make up`).
- A valid JWT from the auth API (`POST /v1/auth/login`).
- `API_TOKEN` exported in your shell (the smoke script reads it).

> Tip: when restarting the Next.js dev server, clear `.next` to avoid stale bundles (`rm -rf frontend/.next`).

## Manual Flow

1. `curl -s -X POST http://localhost:8000/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"you@example.com","password":"secret"}'`
2. Export the `access_token` as `API_TOKEN`.
3. `API_TOKEN="$TOKEN" bash scripts/smoke_whatsapp.sh`
4. Watch the worker logs for `Task app.tasks.messaging.send[...] succeeded`.

Expected JSON payload on success:

```json
{
  "provider": "whatsapp:stub",
  "status": "sent",
  "to": "+15551234567",
  "message": "hello from stub"
}
```

## UI Test Page

- Visit [`/dashboard/whatsapp-test`](http://localhost:3002/dashboard/whatsapp-test) after signing into the frontend.
- Submit the stub form to queue a message and watch the live status chip + JSON payload.
- CI protects this UI via `scripts/guard_whatsapp_ui.sh`, so the page and nav link cannot disappear without failing the pull-request check.

## Extending to Real Providers

Implement a provider in `app/messaging/providers.py` and set `MESSAGING_PROVIDER` to your adapter name. The Celery task will resolve it automatically, so the smoke script continues to work for new integrations.
