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

- The frontend reads `NEXT_PUBLIC_API_URL` to reach the FastAPI service. Update `frontend/.env.local` when switching environments.
- Docker Compose publishes the frontend on `3002:3000`, so your browser hits `http://localhost:3002`.
- FastAPI CORS allows `http://localhost:3002` and `http://127.0.0.1:3002`.

## Environment Variables

- `NEXT_PUBLIC_API_URL`: Base URL for frontend API calls (local default `http://localhost:8000`).
- Backend loads `DATABASE_URL`, `SECRET_KEY`, and other values from `.env` / `infra/.env`.


## Authentication Workflow

### cURL quickstart

```bash
export NEXT_PUBLIC_API_URL=http://localhost:8000

curl -s -X POST "$NEXT_PUBLIC_API_URL/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"secret123"}'

TOKEN=$(curl -s -X POST "$NEXT_PUBLIC_API_URL/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"secret123"}' | jq -r .access_token)

echo "TOKEN=$TOKEN"

curl -s "$NEXT_PUBLIC_API_URL/v1/auth/me" \
  -H "Authorization: Bearer $TOKEN"
```

- Register an operator once via `POST /v1/auth/register` (e.g. `curl -X POST http://localhost:8000/v1/auth/register -H 'Content-Type: application/json' -d '{"email":"you@example.com","password":"secretpass"}'`).
- Sign in at <http://localhost:3002/login>; the frontend stores the returned JWT in `localStorage` under the `access_token` key.
- Protected actions (creating/editing/deleting clients or appointments) require the token; log out from the UI or by clearing the token manually.

## Troubleshooting

- **401 after login:** Clear the `access_token` from local storage and sign in again.
- **Health badge shows “down”:** Ensure the backend container is running and `NEXT_PUBLIC_API_URL` points to it.
- **Switching environments:** Update `frontend/.env.local` with the new `NEXT_PUBLIC_API_URL` and restart the dev server.
