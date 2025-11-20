# AgentCaller
Monorepo: frontend (Next.js) + backend (FastAPI). Infrastructure manifests live under `infra/`.

## Local Development

- `make up` – build and start the full stack via Docker Compose.
- `make migrate` – run Alembic migrations inside the backend container.
- `make logs` / `make ps` – tail or inspect running services.

## Backend Smoke Test

Run `backend/scripts/smoke.sh` (after the stack is up) to verify the health endpoint and the MVP clients/appointments flows. The script waits for `http://localhost:8000/healthz`, then exercises the CRUD endpoints using `curl` (pretty-printed with `jq` when available).

## Frontend UI

1. `docker compose --env-file infra/.env -f infra/docker-compose.yml up -d --build`
2. Open `http://localhost:3002/clients` and `http://localhost:3002/appointments` to exercise the dashboards.

## Frontend ↔ Backend Wiring

- The frontend reads `NEXT_PUBLIC_API_BASE_URL` (set to `http://localhost:8000`) to call the FastAPI service from the browser.
- Docker Compose injects that environment variable into the frontend container and publishes the app on `3002:3000`, so your local browser connects at `http://localhost:3002`.
- FastAPI CORS allows `http://localhost:3002` and `http://127.0.0.1:3002`, aligning with the UI origins during development.

## Authentication Workflow

- Register an operator once via `POST /v1/auth/register` (e.g. `curl -X POST http://localhost:8000/v1/auth/register -H 'Content-Type: application/json' -d '{"email":"you@example.com","password":"secretpass"}'`).
- Sign in at <http://localhost:3002/login>; the frontend stores the returned JWT in `localStorage` under the `token` key.
- Protected actions (creating/editing/deleting clients or appointments) require the token; log out from the UI or by clearing the token manually.

## Background tasks

See [`docs/celery_tasks.md`](docs/celery_tasks.md) for running Celery worker/beat with Redis and verifying task endpoints.

## Google Calendar integration

- Fill the backend `.env` (or `infra/.env`) with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` (defaults to `http://localhost:8000/v1/integrations/google/callback`).
- Start the stack and visit `/settings`; clicking **Connect with Google** initiates the OAuth consent flow. Once connected, tokens are encrypted at rest.
- `GET /v1/calendar/events` now attempts to fetch from Google Calendar and gracefully falls back to the deterministic stub in `docs/calendar_stub.md` whenever the OAuth flow is not complete or Google returns an error.
