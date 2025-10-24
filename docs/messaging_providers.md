# Messaging Providers

This backend exposes outbound messaging over a small provider abstraction so new integrations can be added without changing the API surface.

## Provider Interface

Providers implement `MessagingProvider` with the signature:

```python
send_message(*, user_id: int | None, to: str, text: str) -> dict
```

and return a payload consumed by the frontend. The current stub provider responds with:

```json
{
  "provider": "whatsapp:stub",
  "status": "sent",
  "to": "+15551234567",
  "message": "hello"
}
```

The factory lives in `app/messaging/providers.py` and is accessed via `get_provider_factory()`. It resolves providers by name (case-insensitive) and falls back to the default specified in `Settings.MESSAGING_PROVIDER`.

## Environment Configuration

```
MESSAGING_PROVIDER=stub_whatsapp  # default
```

Set this variable in `backend/.env` (or the Compose env) to switch providers. Unknown provider names raise a `ValueError` and surface as task failures.

## Celery Task Flow

1. `POST /v1/messaging/whatsapp/send` enqueues the `app.tasks.messaging.send` Celery task.
2. The task resolves the configured provider and calls `send_message` with the current user ID, recipient (`to`), and message body (`text`).
3. The provider’s response is returned to the caller and eventually surfaced in the UI.

## Extending with Real Providers

To add a new integration (e.g., Twilio or Meta Cloud):

1. Implement a class that satisfies `MessagingProvider` and handles provider-specific auth/API calls.
2. Register it inside `get_provider_factory()` with a unique name, e.g. `"twilio_whatsapp"`.
3. Set `MESSAGING_PROVIDER=twilio_whatsapp` in the environment.
4. (Optional) Update routing if you expose additional endpoints or capabilities.

Providers can raise exceptions—ensure they surface meaningful error messages so Celery results help with debugging.
