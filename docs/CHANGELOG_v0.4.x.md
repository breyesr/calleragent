# CHANGELOG – v0.4.x Series

## Added
- Middleware + cookie-backed auth guard for `/clients` and `/appointments`, with client-side fallbacks.
- In-app registration flow under `/register`, linked from the header and login page.
- Client edit experience at `/clients/[id]/edit`, wired to the backend update endpoint.
- Pytest coverage for registration and per-user scoping of clients/appointments.

## Changed
- Header navigation now renders client-side only to eliminate hydration mismatches.
- Clients and appointments APIs scope all CRUD operations to the authenticated user (new `owner_id` columns + Alembic migration).

## Fixed
- Hydration warnings on authenticated dashboards by deferring renders until after mount.
- Confirmed the WhatsApp stub page and navigation entry remain available when logged in.
