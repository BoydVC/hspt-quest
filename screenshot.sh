#!/usr/bin/env bash
# Re-take screenshots (1280x800 + 390x844) in a throwaway headless-Chrome profile.
# Demo progress is created by actually playing sessions in that temp profile; Char's real progress is never touched.
set -euo pipefail
cd "$(dirname "$0")"
./run.sh >/dev/null
key=$(mktemp --suffix=.json); trap 'rm -f "$key"' EXIT
python3 tests/independent_key.py > "$key"
rm -f screenshots/*.png
node --experimental-websocket tests/screens.mjs "$key" "${HQ_BASE:-http://127.0.0.1:4444}" 2>&1 | grep -vi experimental
ls -1 screenshots
