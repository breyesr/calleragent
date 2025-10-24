# CHANGELOG – v0.3.x Series

## v0.3.3 – Messaging Stub + Celery Routing

- **fix(celery):** import `app.tasks.messaging.send` explicitly and bind the worker to both `default` and `celery` queues to keep WhatsApp jobs out of `PENDING`.
- **feat(api):** add `/v1/messaging/whatsapp/send` stub endpoint that enqueues the provider-agnostic Celery task.
- **chore(frontend):** expose the WhatsApp test page in header navigation and gate token-sensitive UI behind hydration-safe guards.
