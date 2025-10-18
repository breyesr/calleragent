#!/usr/bin/env sh
set -e
curl -s "http://localhost:8000/openapi.json" | jq '.paths | has("/v1/calendar/events")'
curl -s "http://localhost:8000/v1/calendar/events?max_results=3" | jq .
