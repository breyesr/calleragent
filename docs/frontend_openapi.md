# Frontend OpenAPI Client Guide

This guide explains how to regenerate the type-safe client when backend endpoints change.

## Prerequisites
- Backend running locally and serving OpenAPI at `http://localhost:8000/openapi.json`.
- `openapi-typescript`, `openapi-fetch`, and `zod` installed via `package.json` (already included).

## Regeneration Steps
```bash
# 1. Ensure backend is running
make up

# 2. Generate types into frontend/lib/types/openapi.ts
npm --prefix frontend run gen:api

# 3. Restart the frontend dev server if running
npm --prefix frontend run dev
```
The `gen:api` script downloads the OpenAPI document and writes type definitions to `frontend/lib/types/openapi.ts`. The axios/openapi client automatically imports these definitions.

## Troubleshooting
- **Connection refused**: Verify the backend is listening on `http://localhost:8000`.
- **Type errors referencing `paths`**: Regenerate the file after backend changes.
- **CLI missing**: Run `npm install` from the `frontend/` directory to ensure `openapi-typescript` is available.
