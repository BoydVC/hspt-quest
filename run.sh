#!/usr/bin/env bash
# Start HSPT Quest in the background on 127.0.0.1:4444 (log: data/server.log)
cd "$(dirname "$0")"
if curl -fsS -o /dev/null "http://127.0.0.1:${HQ_PORT:-4444}/healthz" 2>/dev/null; then echo "already running"; exit 0; fi
setsid nohup python3 server.py >> data/server.log 2>&1 &
echo $! > data/server.pid
for i in 1 2 3 4 5 6 7 8 9 10; do sleep 0.5; curl -fsS -o /dev/null "http://127.0.0.1:${HQ_PORT:-4444}/healthz" 2>/dev/null && break; done
curl -fsS "http://127.0.0.1:${HQ_PORT:-4444}/healthz" && echo " started (pid $(cat data/server.pid))"
