# Repository Guidelines

## Project Structure & Module Organization
- `backend/` — FastAPI app (`app/`), Alembic migrations (`alembic/`), and helper scripts under `scripts/`. Database models live in `app/models/`; reusable dependencies in `app/api/v1/deps.py`.
- `frontend/` — Next.js 14 App Router. UI routes live inside `app/`, shared components in `components/`, and generated OpenAPI types in `lib/types/`.
- `infra/` — Docker Compose stack plus shared `.env` for local containers. Use this alongside the root `Makefile`.
- `scripts/` — Shell utilities such as `smoke_calendar.sh` for quick API verification.
- `docs/` — Project-specific walkthroughs (e.g., `calendar_stub.md`). Extend this directory for new features.

## Build, Test, and Development Commands
- `make up` — Build and start the full stack (`backend`, `frontend`, Postgres, Redis).
- `make down` — Stop and remove running containers and volumes.
- `make migrate` — Apply the latest Alembic migration inside the backend container.
- `npm run dev` (inside `frontend/`) — Start the web app on http://localhost:3002.
- `make smoke` — Execute backend smoke tests (`scripts/smoke.sh`) against the running API.
- `npm run gen:api` — Refresh typed API client bindings from the FastAPI OpenAPI spec.

## Coding Style & Naming Conventions
- Respect `.editorconfig`: LF endings, UTF-8, two-space indentation.
- Python: use descriptive module names (`snake_case`), prefer Pydantic models in `schemas/`, and follow FastAPI dependency patterns.
- TypeScript/React: use PascalCase for components, camelCase for hooks and utilities, and Tailwind utility classes for styling. Run `npm run lint` before submitting changes.

## Testing Guidelines
- Frontend unit tests run with `npm test` (Vitest). Place specs beside components using the `.test.tsx` suffix.
- Backend currently relies on smoke scripts (`scripts/smoke.sh`, `scripts/smoke_calendar.sh`). When adding automated tests, co-locate them under `backend/tests/` and invoke them via `pytest`.
- Aim for meaningful coverage on new modules; document any intentional gaps in the PR description.

## Commit & Pull Request Guidelines
- Follow Conventional Commit syntax (e.g., `feat(frontend): add client table`, `fix(auth): guard JWT decode`). Scope names should mirror directory names when possible.
- Keep commits focused and reversible. Include generated artifacts (OpenAPI types, Alembic revisions) in the same commit that necessitates them.
- Pull requests must outline: purpose, testing performed (`make smoke`, `npm test`, etc.), screenshots for UI updates, and links to tracking tickets when available.
- Ensure branches are rebased on `main` before requesting review; resolve merge conflicts locally.
