#!/usr/bin/env sh
set -e
curl -s http://localhost:8000/openapi.json | jq '.paths | keys[]' | grep '/v1/tasks'
PING_ID=$(curl -s -X POST http://localhost:8000/v1/tasks/ping | jq -r .task_id)
while true; do
  STATUS=$(curl -s http://localhost:8000/v1/tasks/result/$PING_ID | jq -r .state)
  [ "$STATUS" = "SUCCESS" ] && break
  sleep 1
done
ADD_ID=$(curl -s -X POST "http://localhost:8000/v1/tasks/slow-add?a=2&b=3&delay=1" | jq -r .task_id)
while true; do
  RESP=$(curl -s http://localhost:8000/v1/tasks/result/$ADD_ID)
  STATE=$(echo "$RESP" | jq -r .state)
  RESULT=$(echo "$RESP" | jq -r .result)
  [ "$STATE" = "SUCCESS" ] && break
  sleep 1
done
echo "$RESP"
