# Frontend env-driven API URL & JWT auth – setup, usage, and troubleshooting

## Summary
- Next.js frontend uses an axios client configured via `NEXT_PUBLIC_API_URL` to reach the FastAPI backend.
- JWT auth flow issues tokens from `/v1/auth/login` (HS256, `sub=email`) and stores them in `localStorage` under `access_token`.
- Guarded routes ensure only authenticated users reach dashboards; unauthenticated traffic redirects to `/login`.
- Backend, migrations, and auth helpers were rebuilt in [PR #1](https://github.com/breyesr/calleragent/pull/1); frontend env switch + guards landed in [PR #2](https://github.com/breyesr/calleragent/pull/2).

## Repo layout
```
backend/
  app/
    core/security.py         # JWT helpers, bcrypt hashing
    api/v1/deps.py           # get_current_user using OAuth2 + jose
    api/v1/endpoints/auth.py # register/login/me
frontend/
  lib/api.ts                 # axios client (env-driven base URL)
  lib/auth.ts                # token helpers
  components/RequireAuth.tsx # auth gate for protected pages
  app/login|register|dashboard
infra/
  docker-compose.yml         # backend/db/redis/frontend services
```

## Prereqs
- Docker Desktop ≥ 4.20 (Compose v2)
- Node.js ≥ 20 & npm ≥ 10
- Python ≥ 3.11 for Alembic/utility scripts
- jq (for curl examples)

## One-time setup
```bash
# clone + enter repo
git clone https://github.com/breyesr/calleragent.git
cd calleragent

# install frontend deps
cd frontend
npm install
cd ..

# create local env files (not committed)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```
Set `frontend/.env.local` to:
```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Run locally
```bash
# from repo root
make up
make migrate
npm --prefix frontend run dev
```
Open `http://localhost:3002`. Backend health lives at `http://localhost:8000/healthz`.

## Auth flows
```bash
# register
curl -s -X POST "$NEXT_PUBLIC_API_URL/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"secret123"}'

# login (returns {"access_token","token_type"})
TOKEN=$(curl -s -X POST "$NEXT_PUBLIC_API_URL/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"secret123"}' | jq -r .access_token)

echo "TOKEN=$TOKEN"

# me
curl -s "$NEXT_PUBLIC_API_URL/v1/auth/me" \
  -H "Authorization: Bearer $TOKEN"
```
Front-end actions:
- `/register` stores user then redirects to `/login`.
- `/login` writes `access_token`, hits `/dashboard`.
- `/dashboard` fetches `/v1/auth/me`, displays email, shows live API status, and offers logout.

## Environment switching
- Update `frontend/.env.local` with the desired backend URL:
  - Local: `http://localhost:8000`
  - Staging: `https://staging.agentcaller.example`
  - Production: `https://agentcaller.example`
- Restart `npm run dev` after changes.
- No code edits required; axios reads `NEXT_PUBLIC_API_URL` automatically.

## Common endpoints
| Method | Path               | Note                             |
|--------|--------------------|----------------------------------|
| GET    | /healthz           | Backend health badge ping        |
| POST   | /v1/auth/register  | Email/password registration      |
| POST   | /v1/auth/login     | Issues HS256 JWT                 |
| GET    | /v1/auth/me        | Requires `Authorization: Bearer` |
| GET    | /v1/clients        | Public list (searchable)         |
| POST   | /v1/clients        | Auth required                    |

## Troubleshooting
- **401 everywhere** → clear `localStorage.access_token`, re-login.
- **Health badge stays “down”** → ensure backend container is up and `NEXT_PUBLIC_API_URL` is reachable.
- **“relation users does not exist”** → rerun `make migrate` (Alembic up to head).
- **bcrypt warning** → confirm `pip install bcrypt==4.0.1 passlib[bcrypt]==1.7.4` in backend image build.
- **JWT decode errors** → confirm backend `SECRET_KEY` matches between env and code.

## Testing
- Lint and tests:
```bash
npm --prefix frontend run lint
npm --prefix frontend run lint:fix   # auto-fix
npm --prefix frontend run test       # vitest suite
```
- Optional: add Playwright/Cypress smoke under `frontend/tests/` (auth login/logout).

## Git workflow
```bash
git checkout -b feat/some-change
# edit files
npm --prefix frontend run lint
pytest   # if backend tests present
git commit -am "feat: describe change"
git push -u origin feat/some-change
# open PR referencing PR #1 (backend auth rebuild) or PR #2 (frontend env API URL) as needed
```

## Changelog
- **PR #1** – Backend JWT auth rebuild: Alembic fixes, HS256 tokens, bcrypt pinning.
- **PR #2** – Frontend env-driven axios client, guarded routes, `/login` + `/register` flows.
- **Runbook** – Consolidated documentation covering setup, usage, troubleshooting, and git workflow.
