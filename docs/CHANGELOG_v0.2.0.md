# CHANGELOG – v0.2.0-auth-ready

> Latest updates for the messaging stack are tracked in `CHANGELOG_v0.3.x.md` (v0.3.3 and newer).

## Overview
A coordinated release that finalizes JWT authentication across the FastAPI backend and introduces an environment-driven axios client with guarded routes in the Next.js frontend. This version stabilizes dependencies, trims legacy imports, and documents the full auth lifecycle for local and remote environments.

## Backend
- Rebuilt JWT pipeline with HS256 tokens (`sub=email`), centralizing helpers in `app/core/security.py`.
- Normalized `get_current_user` in `app/api/v1/deps.py` to decode tokens inline and enforce active users.
- Hardened `/v1/auth/register`, `/v1/auth/login`, and `/v1/auth/me`, plus absolute imports for all routers/endpoints.
- Added package `__init__.py` files to eliminate `ModuleNotFoundError`, updated Alembic template, and pinned bcrypt/passlib versions.
- Database schema now includes `users.created_at` with consistent indexes on `clients` and `appointments`.

## Frontend
- Introduced env-driven axios client (`NEXT_PUBLIC_API_URL`) with auto-token injection and 401 handling.
- Added reusable auth utilities (`lib/auth.ts`, `useToken`) and guarded components (`RequireAuth`, `ApiStatus`).
- Implemented `/login`, `/register`, and `/dashboard` pages with form validation, session management, and live health badge.
- Updated existing clients/appointments pages to respect auth state and leverage the new axios client.

## Documentation
- Added `docs/frontend_env_auth_runbook.md` detailing setup, usage, and troubleshooting for the combined auth stack.
- Updated README with environment variables, curl quickstart, and troubleshooting guidance.
- Created `docs/frontend_env.md` for quick environment switching instructions.

## Verification
- Backend: `docker compose --env-file infra/.env -f infra/docker-compose.yml up -d`, health check at `/healthz`, migrations applied.
- Frontend: `npm --prefix frontend run dev`, manual auth flow (register → login → dashboard) confirmed.
- Curl smoke tests for `/v1/auth/register`, `/v1/auth/login`, and `/v1/auth/me` validated expected responses.

- [x] 7) Redis + Celery tasks

- [x] 8) Google Calendar (read-only MVP – stub)
