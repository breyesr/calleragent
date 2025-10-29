#!/usr/bin/env bash
set -euo pipefail

API_BASE=${API_BASE:-http://localhost:8000}
TOKEN=${API_TOKEN:-${TOKEN:-""}}
REQUEST_BODY='{"to":"+15551234567","text":"hello from stub"}'

if [ -z "${TOKEN}" ]; then
  echo "Set API_TOKEN (or TOKEN) with a valid Bearer JWT" >&2
  exit 1
fi

response=$(curl -sS -X POST "${API_BASE}/v1/messaging/whatsapp/send" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${REQUEST_BODY}")

echo "${response}"

task_id=$(echo "${response}" | jq -r '.task_id')
if [ -z "${task_id}" ] || [ "${task_id}" = "null" ]; then
  echo "Failed to obtain task_id" >&2
  exit 1
fi

for _ in $(seq 1 30); do
  status_response=$(curl -sS "${API_BASE}/v1/tasks/result/${task_id}")
  echo "${status_response}"
  state=$(echo "${status_response}" | jq -r '.state')
  provider=$(echo "${status_response}" | jq -r '.result.provider // empty')
  status=$(echo "${status_response}" | jq -r '.result.status // empty')

  if [ "${state}" = "SUCCESS" ]; then
    if [ "${provider}" = "whatsapp:stub" ] && [ "${status}" = "sent" ]; then
      exit 0
    fi
    echo "Unexpected task result" >&2
    exit 1
  fi

  sleep 1
done

echo "Timed out waiting for whatsapp_send result" >&2
exit 1
