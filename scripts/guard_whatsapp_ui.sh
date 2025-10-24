#!/usr/bin/env bash
set -euo pipefail

PAGE="frontend/app/dashboard/whatsapp-test/page.tsx"
NAV="frontend/components/HeaderNav.tsx"

if [[ ! -s "$PAGE" ]]; then
  echo "[guard] WhatsApp test page missing or empty: $PAGE" >&2
  exit 1
fi

if ! grep -F 'href="/dashboard/whatsapp-test"' "$NAV" >/dev/null; then
  echo "[guard] HeaderNav is missing link to /dashboard/whatsapp-test" >&2
  exit 1
fi

echo "[guard] WhatsApp UI checks passed."
