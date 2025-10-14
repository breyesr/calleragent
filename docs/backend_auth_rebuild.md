# AgentCaller Backend Auth Recovery – 2025-10-07

## Table of Contents
1. [Overview](#overview)  
2. [Final State](#final-state)  
3. [Schema](#schema)  
4. [Timeline of Fixes](#timeline-of-fixes)  
5. [Commands](#commands)  
6. [Verification](#verification)  
7. [Root Causes](#root-causes)  
8. [Troubleshooting](#troubleshooting)  
9. [Appendix](#appendix)

---

## Overview
- **Services:** FastAPI backend, PostgreSQL, Redis (infra managed via Docker Compose).  
- **Ports:** Backend `8000`, Frontend `3002`, PostgreSQL `5432`, Redis `6379`.  
- **Environment files:** `.env`, `infra/.env`, `backend/.env.example`, `frontend/.env.example`.  
- **Compose file:** `infra/docker-compose.yml`.  
- **API prefix:** `/v1`.

## Final State
- **Database URL:** `postgresql+psycopg://postgres:postgres@db:5432/agentcaller`.  
- **JWT:** Algorithm HS256, `sub` claim stores user email, `Authorization: Bearer <token>`, `tokenUrl=/v1/auth/login`.  
- **Auth helpers:** `app/core/security.py` (exports `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `get_password_hash`, `verify_password`, `create_access_token`, `decode_token`).  
- **Bcrypt stack:** `bcrypt==4.0.1`, `passlib[bcrypt]==1.7.4`.  
- **Working endpoints:**  
  - `POST /v1/auth/register`  
  - `POST /v1/auth/login`  
  - `GET /v1/auth/me`

## Schema
- **users**  
  - `id SERIAL PRIMARY KEY`  
  - `email VARCHAR(255) UNIQUE NOT NULL`  
  - `hashed_password VARCHAR(255) NOT NULL`  
  - `is_active BOOLEAN DEFAULT TRUE NOT NULL`  
  - `created_at TIMESTAMPTZ DEFAULT now() NOT NULL`  
- **clients**  
  - `id SERIAL PRIMARY KEY`  
  - `name VARCHAR(255) NOT NULL` (index)  
  - `phone VARCHAR(50) NOT NULL` (index)  
- **appointments**  
  - `id SERIAL PRIMARY KEY`  
  - `client_id INT NOT NULL REFERENCES clients(id) ON DELETE CASCADE` (index)  
  - `starts_at TIMESTAMPTZ NOT NULL`  
  - `ends_at TIMESTAMPTZ NOT NULL`  
  - `notes TEXT NULL`

## Timeline of Fixes
1. **Alembic heads conflict** – merged diverging heads, pruned duplicate user creation, ensured single migration adds `created_at`.  
2. **JWT algorithm mismatch** – hard-set HS256 in `security.py` and `deps.py`.  
3. **deps.py indentation error** – rewrote with clean `get_db` / `get_current_user`.  
4. **OAuth2 token URL** – corrected to `/v1/auth/login`.  
5. **Bcrypt backend error** – pinned `bcrypt==4.0.1`, confirmed hash/verify via Passlib.  
6. **Database name mismatch** – created `agentcaller` schema and reran migrations.  
7. **Import normalization** – added package `__init__.py`, switched to absolute `app.*` imports.

## Commands
```bash
docker compose --env-file infra/.env -f infra/docker-compose.yml build backend
docker compose --env-file infra/.env -f infra/docker-compose.yml up -d backend
docker compose --env-file infra/.env -f infra/docker-compose.yml restart backend
docker compose --env-file infra/.env -f infra/docker-compose.yml logs --tail=120 backend
```

```bash
docker compose --env-file infra/.env -f infra/docker-compose.yml exec db psql -U postgres -d agentcaller -c '\dt'
docker compose --env-file infra/.env -f infra/docker-compose.yml exec db psql -U postgres -d agentcaller -c '\d+ users'
```

```bash
curl -s -X POST http://localhost:8000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"secret123"}'

curl -s -X POST http://localhost:8000/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'username=admin@example.com&password=secret123'

curl -s http://localhost:8000/v1/auth/me \
  -H "Authorization: Bearer <PASTE_TOKEN_HERE>"
```

## Verification
- **Register response:** `{"id":1,"email":"admin@example.com"}`  
- **Login response:** `{"access_token":"<JWT_HEADER>.<JWT_PAYLOAD>.<JWT_SIGNATURE>","token_type":"bearer"}`  
  - (payload contains `{"sub":"admin@example.com","exp":...}`)  
- **Me response:** `{"id":1,"email":"admin@example.com"}`  
- **Backend logs (tail):**
  ```
  INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
  INFO:     Application startup complete.
  INFO:     127.0.0.1:54321 - "POST /v1/auth/register HTTP/1.1" 201 -
  INFO:     127.0.0.1:54324 - "POST /v1/auth/login HTTP/1.1" 200 -
  INFO:     127.0.0.1:54328 - "GET /v1/auth/me HTTP/1.1" 200 -
  ```

## Root Causes
- **Dual Alembic heads** → resolved by pruning migrations and reapplying.  
- **JWT decode importing `decode_token`** → replaced with inline jose decoding.  
- **OAuth2 misconfiguration** → corrected token URL and dependency path.  
- **bcrypt warnings** → pinned compatible version to avoid backend errors.  
- **Missing package initializers** → created `__init__.py` files to fix `ModuleNotFoundError`.

## Troubleshooting
- **`relation users does not exist`** → run migrations (`docker compose ... exec backend alembic upgrade head`).  
- **Alembic multi-heads** → `alembic heads`; merge or revert until single head remains.  
- **bcrypt backend error** → ensure `pip install bcrypt==4.0.1 passlib[bcrypt]==1.7.4`.  
- **JWT 401** → confirm `Authorization: Bearer <token>` header and token payload contains `sub` email; verify `SECRET_KEY` consistency.

## Appendix
- **Security hygiene:** never log or print actual JWT secrets; mask tokens in transcripts.  
- **Passwords:** Passlib/bcrypt enforce 72-byte limit; reject longer passwords to avoid truncation.
