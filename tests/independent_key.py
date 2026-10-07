#!/usr/bin/env python3
"""Independent answer-key reader for the smoke test. Deliberately does NOT reuse build_bank.py.
Reads each sheet's answer-key page and maps dNNqMM -> {"kind":"letter","letter":"b"} or {"kind":"text","text":"..."}."""
import glob
import html
import json
import os
import re
import sys

root = sys.argv[1] if len(sys.argv) > 1 else "/workspace/hspt"
files = {}
for p in sorted(glob.glob(os.path.join(root, "hspt-day*.html")) + glob.glob(os.path.join(root, "worksheets", "hspt-day*.html"))):
    files.setdefault(int(re.search(r"day(\d+)\.html", p).group(1)), p)
out = {}
for day, p in files.items():
    raw = open(p, encoding="utf-8").read()
    q, k = raw.split('<div class="page-break"', 1)
    nq = len(re.findall(r"<li>", q))
    keys = re.findall(r"<li>(.*?)</li>", k, re.S)
    for i, key in enumerate(keys[:nq], start=1):
        t = html.unescape(re.sub(r"<[^>]+>", "", key)).strip()
        m = re.match(r"^([a-e])\)", t)
        if m:
            out["d%02dq%02d" % (day, i)] = {"kind": "letter", "letter": m.group(1)}
        else:
            t = re.sub(r"\s*\((?:[^()]|\([^()]*\))*\)\s*$", "", t).strip()
            out["d%02dq%02d" % (day, i)] = {"kind": "text", "text": t}
print(json.dumps(out, ensure_ascii=False))
