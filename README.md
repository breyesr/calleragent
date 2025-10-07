# AgentCaller
Monorepo: frontend (Next.js) + backend (FastAPI). Infrastructure manifests live under `infra/`.

## Local Development

- `make up` – build and start the full stack via Docker Compose.
- `make migrate` – run Alembic migrations inside the backend container.
- `make logs` / `make ps` – tail or inspect running services.

## Backend Smoke Test

Run `backend/scripts/smoke.sh` (after the stack is up) to verify the health endpoint and the MVP clients/appointments flows. The script waits for `http://localhost:8000/healthz`, then exercises the CRUD endpoints using `curl` (pretty-printed with `jq` when available).
