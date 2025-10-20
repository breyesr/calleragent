#!/usr/bin/env bash
set -euo pipefail

API_BASE=${API_BASE:-http://localhost:8000}

request_payload=$(curl -sS -X POST "${API_BASE}/v1/tasks/slow-add?a=2&b=3&delay=1")
echo "${request_payload}"

task_id=$(echo "${request_payload}" | jq -r '.task_id')
if [ -z "${task_id}" ] || [ "${task_id}" = "null" ]; then
  echo "Failed to obtain task_id from slow-add response" >&2
  exit 1
fi

for _ in $(seq 1 30); do
  response=$(curl -sS "${API_BASE}/v1/tasks/result/${task_id}")
  echo "${response}"
  state=$(echo "${response}" | jq -r '.state')
  result=$(echo "${response}" | jq -r '.result')

  if [ "${state}" = "SUCCESS" ]; then
    if [ "${result}" = "5" ]; then
      exit 0
    fi
    echo "Unexpected result: ${result}" >&2
    exit 1
  fi

  sleep 1
done

echo "Timed out waiting for slow_add result" >&2
exit 1
