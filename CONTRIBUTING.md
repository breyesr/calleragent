# Contributing to AgentCaller

Thanks for your interest in improving AgentCaller! This guide explains how to set up your environment, run the stack locally, and contribute code safely.

## Prerequisites

- Docker and Docker Compose v2 (for the default workflow)
- Python 3.11+
- Node.js 20+
- npm 10+

> **Tip:** Most day-to-day tasks are wrapped in the project `Makefile`. Run `make help` to see available shortcuts.

## Repository Setup

1. Fork and clone the repository.
2. Install backend dependencies (optional outside Docker):
   ```bash
   make backend-install
   ```
3. Install frontend dependencies:
   ```bash
   make frontend-install
   ```
4. Copy environment templates if you plan to run services outside Compose:
   ```bash
   cp infra/.env .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

## Running the Stack

### Using Docker Compose (recommended)

1. Start services:
   ```bash
   make up
   ```
2. Apply database migrations:
   ```bash
   make migrate
   ```
3. Verify the backend and sample flows:
   ```bash
   make smoke
   ```
4. Visit:
   - Backend health: <http://localhost:8000/healthz>
   - Frontend UI: <http://localhost:3002/>

Stop everything with:
```bash
make down
```

### Running Outside Docker (optional)

Backend:
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm install
npm run dev -- --port 3002
```

Ensure the backend is reachable at `http://localhost:8000` or update `frontend/.env` accordingly.

## Code Quality and Tests

- Lint frontend:
  ```bash
  cd frontend && npm run lint
  ```
- Run frontend tests:
  ```bash
  make frontend-test
  ```
- Alembic migrations should be generated with `alembic revision --autogenerate -m "..."` from inside the backend container (`make backend-shell`).

Before opening a PR:

1. Verify formatting/linting.
2. Ensure new migrations are committed.
3. Run the smoke test to validate critical API flows.

## Deployment Notes

- Docker images build from `backend/Dockerfile` and `frontend/Dockerfile`. Confirm they succeed locally with `make up`.
- Environment variables:
  - Backend expects `DATABASE_URL`, `REDIS_URL`, and optional OAuth/secrets defined in `backend/.env.example`.
  - Frontend consumes `NEXT_PUBLIC_API_BASE_URL` (set to the backend URL).
  - CORS is restricted to the domains configured in `backend/app/main.py`; update as you promote to staging/production.
- Database migrations must run before switching traffic. Use `make migrate` (or `alembic upgrade head`) against the target environment.

## Pull Request Checklist

- [ ] Description explains the what/why.
- [ ] Tests or smoke checks cover new behavior.
- [ ] Documentation updated (README/CONTRIBUTING/in-code comments as needed).
- [ ] CI passes (lint/tests/migrations).

We welcome ideas, bug reports, and feature requests—thank you for helping build AgentCaller!
