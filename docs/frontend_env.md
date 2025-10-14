# Frontend Environment Configuration

The Next.js app reads `NEXT_PUBLIC_API_URL` to determine which backend it should call. Update this value in `frontend/.env.local` and restart the dev server when switching environments.

```bash
# Local
NEXT_PUBLIC_API_URL=http://localhost:8000

# Staging
NEXT_PUBLIC_API_URL=https://staging.agentcaller.example

# Production
NEXT_PUBLIC_API_URL=https://agentcaller.example
```

No code changes are required—axios and all data fetching use this variable, so updating the `.env.local` file is sufficient.
