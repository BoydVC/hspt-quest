#!/usr/bin/env python3
"""HSPT Quest server: 127.0.0.1:4444 by default. Stdlib only.
GET /            the app
GET /bank.json   question bank (rebuilt from Path's sheets at startup and every HQ_MAX_AGE seconds)
GET /healthz     ok
Progress lives in the browser (localStorage). This server never receives or stores answers."""
import os
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_bank  # noqa: E402

HOST = os.environ.get("HQ_HOST", "127.0.0.1")
PORT = int(os.environ.get("HQ_PORT", "4444"))
MAX_AGE = int(os.environ.get("HQ_MAX_AGE", "1800"))
BANK = os.path.join(HERE, "data", "bank.json")
_lock = threading.Lock()


def bank_bytes():
    with _lock:
        if not os.path.exists(BANK) or time.time() - os.path.getmtime(BANK) > MAX_AGE:
            build_bank.main()
        return open(BANK, "rb").read()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=os.path.join(HERE, "web"), **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        super().end_headers()

    def do_GET(self):
        p = self.path.split("?")[0]
        if p in ("/bank.json", "/healthz"):
            body = bank_bytes() if p == "/bank.json" else b'{"ok":true}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if p in ("/", ""):
            self.path = "/index.html"
        return super().do_GET()

    def log_message(self, fmt, *args):
        sys.stderr.write("[hspt-quest] " + (fmt % args) + "\n")


if __name__ == "__main__":
    build_bank.main()
    srv = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"HSPT Quest on http://{HOST}:{PORT}", flush=True)
    srv.serve_forever()
