#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8000}"
HEALTH_ENDPOINT="$API_BASE/healthz"
CLIENTS_ENDPOINT="$API_BASE/v1/clients"
APPOINTMENTS_ENDPOINT="$API_BASE/v1/appointments"

jq_bin=""
if command -v jq >/dev/null 2>&1; then
  jq_bin="jq"
fi

pretty() {
  if [[ -n "$jq_bin" ]]; then
    "$jq_bin" '.'
  else
    cat
  fi
}

printf 'Waiting for backend at %s' "$HEALTH_ENDPOINT"
for _ in {1..30}; do
  if curl --silent --show-error --fail "$HEALTH_ENDPOINT" >/dev/null; then
    echo " - ready"
    break
  fi
  printf '.'
  sleep 2
done

if ! curl --silent --show-error --fail "$HEALTH_ENDPOINT" >/dev/null; then
  printf '\nBackend did not become ready in time\n' >&2
  exit 1
fi

printf '\n==> GET /v1/clients\n'
curl --silent --show-error "$CLIENTS_ENDPOINT" | pretty

payload_client=$(cat <<JSON
{
  "name": "Smoke Test Client",
  "phone": "+1234567890"
}
JSON
)

printf '\n==> POST /v1/clients\n'
client_response=$(curl --silent --show-error --header 'Content-Type: application/json' --data "$payload_client" "$CLIENTS_ENDPOINT")
print_client=$(printf '%s' "$client_response" | pretty)
echo "$print_client"
client_id=$(printf '%s' "$client_response" | {
  if [[ -n "$jq_bin" ]]; then
    jq -r '.id'
  else
    python3 - <<'PY'
import json,sys
print(json.loads(sys.stdin.read())['id'])
PY
  fi
})

printf '\n==> POST /v1/appointments\n'
now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
later=$(date -u -d "+1 hour" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v +1H +"%Y-%m-%dT%H:%M:%SZ")
payload_appt=$(cat <<JSON
{
  "client_id": $client_id,
  "starts_at": "$now",
  "ends_at": "$later",
  "notes": "Smoke test appointment"
}
JSON
)
appointment_response=$(curl --silent --show-error --header 'Content-Type: application/json' --data "$payload_appt" "$APPOINTMENTS_ENDPOINT")
printf '%s\n' "$appointment_response" | pretty

printf '\n==> GET /v1/appointments\n'
curl --silent --show-error "$APPOINTMENTS_ENDPOINT" | pretty
