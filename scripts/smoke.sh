#!/bin/sh
set -eu
export PATH="$PWD/.local-bin:$PATH"
HASH=$(node apps/server/dist/index.js hash-password smoke-password)
PORT=18080 NODE_ENV=production CROSSING_ADMIN_PASSWORD_HASH="$HASH" CROSSING_SESSION_SECRET=development-only-change-me-32chars node apps/server/dist/index.js >.tmp/smoke.log 2>&1 &
PID=$!
cleanup() { kill "$PID" 2>/dev/null || true; wait "$PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
i=0
until curl --fail --silent http://127.0.0.1:18080/healthz; do
  i=$((i + 1))
  if [ "$i" -ge 20 ]; then cat .tmp/smoke.log; exit 1; fi
  sleep 1
done
printf '\n'
if PORT=18081 NODE_ENV=production CROSSING_ADMIN_PASSWORD_HASH=not-an-argon-hash CROSSING_SESSION_SECRET=development-only-change-me-32chars node apps/server/dist/index.js >.tmp/invalid-hash.log 2>&1; then
  echo 'Invalid hash unexpectedly accepted' >&2
  exit 1
fi
printf 'Invalid production hash rejected\n'
