# Calendar Stub API

## Overview
A deterministic, read-only calendar endpoint that mocks Google Calendar data for authenticated users. It allows the frontend to develop against a stable contract before OAuth and Google API integration.

## Contract
- Base path: `/v1/calendar`
- Endpoint: `GET /events`
  - Query: `max_results` (int, default 10)
  - Requires authentication (`Authorization: Bearer <token>`)
  - Response shape:
    ```json
    {
      "items": [
        {
          "id": "evt_1_user@example.com",
          "summary": "Sample event #1 for user@example.com",
          "start": "2025-10-20T09:00:00Z",
          "end": "2025-10-20T10:00:00Z",
          "location": "Online"
        }
      ]
    }
    ```

Events are derived from the current user’s email to keep responses deterministic and traceable.

## Future Integration
When migrating to Google Calendar:
1. Replace `_mock_events` with calls to the Google API client.
2. Externalize credentials and scopes for read-only access.
3. Preserve response shape to avoid frontend breaking changes.

## Local Smoke Test
```bash
bash scripts/smoke_calendar.sh
```
