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
