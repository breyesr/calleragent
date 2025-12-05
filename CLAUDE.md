# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AgentCaller is a monorepo combining a Next.js frontend and FastAPI backend for managing clients, appointments, and calendar integrations. Infrastructure is managed via Docker Compose with PostgreSQL, Redis, and Celery workers.

## Development Commands

### Starting the Stack
```bash
make up              # Build and start all services
make down            # Stop and remove all containers
make restart         # Rebuild and restart everything
make ps              # Check running services
make logs            # Tail logs from all services
```

### Database Migrations
```bash
make migrate         # Run Alembic migrations (must be done after first `make up`)
```

### Backend Development
```bash
make backend-shell   # Access backend container shell
make smoke           # Run backend smoke tests (requires stack to be running)

# Inside backend container or locally:
alembic upgrade head          # Apply migrations
alembic revision -m "message" # Create new migration
```

### Frontend Development
```bash
make frontend-shell          # Access frontend container shell
npm --prefix frontend run dev         # Start Next.js dev server on port 3002
npm --prefix frontend run build       # Production build
npm --prefix frontend run lint        # Run ESLint
npm --prefix frontend run lint:fix    # Auto-fix linting issues
npm --prefix frontend run typecheck   # Run TypeScript type checking
npm --prefix frontend run test        # Run Vitest tests
npm --prefix frontend run gen:api     # Regenerate OpenAPI types (requires backend running)
```

## Architecture

### Backend Structure

**Core:** FastAPI app at `backend/app/main.py`
- API routes defined in `backend/app/api/v1/routes.py`
- All endpoints prefixed with `/v1`
- CORS configured for `localhost:3002` and `127.0.0.1:3002`

**Authentication:** JWT-based (HS256)
- `POST /v1/auth/register` - Create new user account
- `POST /v1/auth/login` - Login (returns JWT in `access_token` field)
- `GET /v1/auth/me` - Get current user info
- Token stored in localStorage under `token` key (frontend)
- Protected endpoints require `Authorization: Bearer <token>` header
- Implementation in `app/core/security.py` and `app/api/v1/deps.py`
- Uses bcrypt 4.0.1 with passlib for password hashing

**Database:** PostgreSQL with SQLAlchemy 2.0 (mapped_column style)
- Models in `backend/app/models/`: User, Client, Appointment, GoogleCredential
- Session management: `app/db/session.py`
- Base class: `app/db/base_class.py`
- Migrations: Alembic in `backend/alembic/versions/`
- Connection URL: `postgresql+psycopg://postgres:postgres@db:5432/agentcaller`

**Key Models:**
- **users**: id, email (unique), hashed_password, is_active, created_at, updated_at
- **clients**: id, name (indexed), phone (indexed)
- **appointments**: id, client_id (FK to clients), starts_at, ends_at, notes
- **google_credentials**: id, user_id (FK to users, unique), access_token, refresh_token, calendar_id, updated_at

**Background Tasks:** Celery with Redis broker
- Celery app: `app/celery_app.py`
- Tasks: `app/tasks/` (currently demo tasks)
- Worker/Beat configured in `docker-compose.yml`
- See `docs/celery_tasks.md` for details

**Calendar Integration:**
- Google Calendar OAuth flow with read/write scopes
- `POST /v1/calendar/connect` - Initiate OAuth
- `GET /v1/calendar/callback` - OAuth callback handler
- `GET /v1/calendar/settings` - Get current calendar settings
- `POST /v1/calendar/disconnect` - Disconnect Google account
- Credentials stored in `google_credentials` table (one per user)
- Two-way sync logic: local appointments ↔ Google Calendar events

### Frontend Structure

**Framework:** Next.js 14 with App Router
- Pages in `frontend/app/`
- Key routes: `/login`, `/clients`, `/appointments`, `/dashboard`, `/dashboard/settings/calendar`
- API client: `frontend/lib/api-client.ts` (type-safe wrapper around fetch)
- Auth utilities: `frontend/lib/auth.ts`, `frontend/lib/useToken.ts`

**API Communication:**
- Type-safe client generated from OpenAPI spec at `frontend/lib/types/openapi.ts`
- Automatically includes JWT token from localStorage in requests
- Base URL: `NEXT_PUBLIC_API_BASE_URL` env var (defaults to `http://localhost:8000`)

**State Management:**
- Zustand for global state (`zustand` dependency)
- React Hook Form for forms (`react-hook-form` + `zod` validation)

**Styling:** Tailwind CSS with custom globals in `frontend/styles/globals.css`

### Infrastructure

**Docker Compose Services:**
- `db` - PostgreSQL 15 on port 5432
- `redis` - Redis 7 on port 6379
- `backend` - FastAPI on port 8000
- `worker` - Celery worker
- `beat` - Celery beat scheduler
- `frontend` - Next.js on port 3002

**Environment Variables:**
- Root `.env` and `infra/.env` for compose
- Backend reads: `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `API_V1_PREFIX`, `ACCESS_TOKEN_EXPIRE_MINUTES`
- Frontend reads: `NEXT_PUBLIC_API_BASE_URL`

## Important Development Notes

### Type Safety
When backend API changes, regenerate frontend types:
```bash
# Ensure backend is running first
make up
npm --prefix frontend run gen:api
```

### Database Migrations
Always create migrations for schema changes:
```bash
# Inside backend container or with local alembic
alembic revision --autogenerate -m "description"
alembic upgrade head
```

Watch for multi-head scenarios (see `docs/backend_auth_rebuild.md` for recovery steps).

### Authentication Flow
1. Frontend calls `POST /v1/auth/login` with form-encoded credentials
2. Backend returns JWT in `access_token` field
3. Frontend stores token in localStorage under key `token`
4. Frontend automatically includes token in `Authorization: Bearer <token>` header via `api-client.ts`
5. Backend validates token in dependency `get_current_user` from `app/api/v1/deps.py`

### Google Calendar Integration
- OAuth credentials configured via `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Refresh tokens stored per-user in `google_credentials` table
- Calendar sync handles two-way updates between local appointments and Google events
- Disconnect flow properly removes credentials and cleans up calendar state

### Import Style
Backend uses absolute imports: `from app.module.submodule import Thing`
All backend packages have `__init__.py` files to support this pattern.

## Testing & Verification

### Backend Smoke Tests
```bash
# Full stack must be running first
make up
make smoke                           # Runs scripts/smoke.sh

# Manual verification
curl http://localhost:8000/healthz  # Should return {"status": "ok"}
```

### Celery Task Verification
```bash
# View logs
docker compose --env-file infra/.env -f infra/docker-compose.yml logs -f worker

# Test slow_add task
bash scripts/smoke_slow_add.sh
```

See `docs/celery_tasks.md` for detailed troubleshooting.

### Calendar Testing
```bash
bash scripts/smoke_calendar.sh      # Test calendar endpoints
```

## Common Issues

**"relation users does not exist"**
- Run migrations: `make migrate`

**Alembic multi-head conflicts**
- See `docs/backend_auth_rebuild.md` for resolution steps
- Use `alembic heads` to diagnose, `alembic merge` to resolve

**Frontend type errors referencing `paths`**
- Regenerate OpenAPI types: `npm --prefix frontend run gen:api`

**Worker cannot reach broker**
- Verify Redis is healthy: `docker compose ps`
- Check `REDIS_URL` in environment

**CORS errors from frontend**
- Verify frontend is on `localhost:3002` or `127.0.0.1:3002`
- Check `allowed_origins` in `backend/app/main.py`

**JWT 401 Unauthorized**
- Confirm token in localStorage under key `token`
- Verify `SECRET_KEY` matches between backend and any token generators
- Check token payload contains `sub` field with user email

## Reference Documentation

- `docs/backend_auth_rebuild.md` - Complete auth recovery timeline and troubleshooting
- `docs/celery_tasks.md` - Background task setup and verification
- `docs/frontend_openapi.md` - Type-safe API client regeneration
- `docs/calendar_stub.md` - Calendar API contract documentation
- `README.md` - Quick start guide and basic development workflow
