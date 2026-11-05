#!/usr/bin/env python3
"""HSPT Quest smoke test.
1. Bank: every question has an answer from Path's key; bank answers agree with an independent key reader.
2. Never-guess: injected key faults (missing / impossible / mismatched answers) get skipped, not guessed.
3. Server on 127.0.0.1:4444 serves the app and bank; no path traversal.
4. Offline snapshot is self-contained.
5. Headless browser plays a full Daily Quest (plus Replay, Drill, Sprint) and checks scoring against the key.
6. Screenshots exist at 1280x800 and 390x844.
7. Path's source files are byte-for-byte unchanged.
Run: python3 tests/smoke_test.py   (server must be running: ./run.sh)"""
import glob
import hashlib
import json
import os
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.environ.get("HQ_HSPT_ROOT", "/workspace/hspt")
BASE = os.environ.get("HQ_BASE", "http://127.0.0.1:4444")
results = []


def check(name, ok, detail=""):
    results.append(bool(ok))
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else "  " + str(detail)))


def fingerprint():
    out = {}
    for p in sorted(glob.glob(os.path.join(SRC, "**", "*"), recursive=True)):
        if os.path.isfile(p):
            st = os.stat(p)
            out[p] = (hashlib.sha256(open(p, "rb").read()).hexdigest(), st.st_mtime_ns, st.st_size)
    return out


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=20) as r:
        return r.status, r.headers, r.read()


before = fingerprint()

# ---------- 1. bank ----------
subprocess.run([sys.executable, os.path.join(HERE, "build_bank.py"), "-q"], check=True, capture_output=True)
bank = json.load(open(os.path.join(HERE, "data", "bank.json"), encoding="utf-8"))
Q = bank["questions"]
check("bank has questions from all 20 days", sorted({q["day"] for q in Q} | {r["day"] for q in Q for r in q["also_in"]}) == list(range(1, 21)))
check("ids unique", len({q["id"] for q in Q}) == len(Q))
check("five areas, all non-empty", set(bank["stats"]["by_area"]) == {"Verbal", "Quantitative", "Reading", "Mathematics", "Language"} and all(bank["stats"]["by_area"].values()))
check("every mc question has a valid answer index", all(q["type"] != "mc" or (0 <= q["answer"] < len(q["choices"]) and len(q["choices"]) >= 3) for q in Q))
check("every typed question has a numeric answer value", all(q["type"] != "input" or isinstance(q["answer_value"], (int, float)) for q in Q))
check("every question carries its source sheet + day", all(q["source"].endswith("hspt-day%d.html" % q["day"]) for q in Q))
check("stats add up (unique + duplicates = parsed)", bank["stats"]["unique_total"] + len(bank["duplicates"]) == bank["stats"]["parsed_total"] and len(Q) == bank["stats"]["unique_total"])

key = json.loads(subprocess.run([sys.executable, os.path.join(HERE, "tests", "independent_key.py"), SRC], check=True, capture_output=True, text=True).stdout)
check("independent key covers every parsed question", len(key) == bank["stats"]["parsed_total"] + len(bank["skipped"]), (len(key), bank["stats"]["parsed_total"]))
bad = []
for q in Q:
    for ref in [{"day": q["day"], "num": q["num"]}] + q["also_in"]:
        k = key.get("d%02dq%02d" % (ref["day"], ref["num"]))
        if q["type"] == "mc":
            ok = k and k["kind"] == "letter" and "abcde".index(k["letter"]) == q["answer"]
        else:
            ok = k and k["kind"] == "text"
        if not ok:
            bad.append((q["id"], ref, k))
check("bank answers agree with the independent key on all %d questions (incl. duplicates)" % len(Q), not bad, bad[:5])

# ---------- 2. never guess: fault injection on a temp copy ----------
tmp = tempfile.mkdtemp(prefix="hq-fault-")
try:
    os.makedirs(os.path.join(tmp, "src", "worksheets"))
    orig = open(os.path.join(SRC, "worksheets", "hspt-day5.html"), encoding="utf-8").read()
    q_part, k_part = orig.split('<div class="page-break"', 1)
    lis = re.findall(r"<li>.*?</li>", k_part, re.S)
    k2 = k_part.replace(lis[0], re.sub(r"<li>([a-e])\)", lambda m: "<li>" + ("d" if m.group(1) != "d" else "a") + ")", lis[0], count=1), 1)  # wrong letter, same text
    k2 = k2.replace(lis[1], re.sub(r"<li>[a-e]\)", "<li>e)", lis[1], count=1), 1)  # letter that isn't a choice
    k2 = k2.replace(lis[-1], "", 1)  # missing answer
    open(os.path.join(tmp, "src", "worksheets", "hspt-day5.html"), "w", encoding="utf-8").write(q_part + '<div class="page-break"' + k2)
    env = dict(os.environ, HQ_HSPT_ROOT=os.path.join(tmp, "src"), HQ_OUT=os.path.join(tmp, "out"))
    subprocess.run([sys.executable, os.path.join(HERE, "build_bank.py"), "-q"], check=True, capture_output=True, env=env)
    fb = json.load(open(os.path.join(tmp, "out", "bank.json")))
    nq = len(re.findall(r"<li>", q_part))
    skipped = {s["num"] for s in fb["skipped"] if s.get("num")}
    present = {q["num"] for q in fb["questions"]}
    check("fault: mismatched key letter is skipped, not guessed", 1 in skipped and 1 not in present)
    check("fault: key letter that isn't a choice is skipped", 2 in skipped and 2 not in present)
    check("fault: question with no key is skipped", nq in skipped and nq not in present)
    check("fault: the other questions still load", len(present) == nq - 3, (len(present), nq))
finally:
    shutil.rmtree(tmp, ignore_errors=True)
check("real bank still intact after fault test", len(json.load(open(os.path.join(HERE, "data", "bank.json")))["questions"]) == len(Q))

# ---------- 3. server ----------
try:
    st, h, body = get("/healthz")
    check("server /healthz", st == 200 and json.loads(body).get("ok"))
    st, h, body = get("/")
    check("server serves the app", st == 200 and b"HSPT Quest" in body and b"app.js" in body)
    st, h, body = get("/bank.json")
    check("server serves the bank (no-store)", st == 200 and len(json.loads(body)["questions"]) == len(Q) and "no-store" in h.get("Cache-Control", ""))
    try:
        get("/../build_bank.py")
        st2 = 200
    except urllib.error.HTTPError as e:
        st2 = e.code
    try:
        _, _, b2 = get("/%2e%2e/build_bank.py")
        leaked = b"def main" in b2
    except urllib.error.HTTPError:
        leaked = False
    check("no path traversal out of web/", st2 == 404 and not leaked)
    ss = subprocess.run(["ss", "-ltnp"], capture_output=True, text=True).stdout
    check("bound to localhost only", "127.0.0.1:4444" in ss and "0.0.0.0:4444" not in ss)
except Exception as e:  # noqa: BLE001
    check("server reachable at " + BASE, False, e)

# ---------- 4. snapshot ----------
subprocess.run([sys.executable, os.path.join(HERE, "build_snapshot.py")], check=True, capture_output=True)
snap = os.path.join(HERE, "dist", "hspt-quest-snapshot.html")
html = open(snap, encoding="utf-8").read()
m = re.search(r"window\.__BANK__ = (.*?);</script>", html, re.S)
check("snapshot has the bank baked in", m and len(json.loads(m.group(1).replace("<\\/", "</").replace("<\\!--", "<!--"))["questions"]) == len(Q))
check("snapshot is self-contained (no network, no external files)", not re.search(r"https?://|src=\"[^\"]+\"|href=\"[^\"#]+\"", html))

# ---------- 5. headless play ----------
kf = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False)
json.dump(key, kf)
kf.close()
try:
    r = subprocess.run(["node", "--experimental-websocket", os.path.join(HERE, "tests", "e2e.mjs"), kf.name, BASE, snap],
                       capture_output=True, text=True, timeout=300)
    lines = [l for l in r.stdout.splitlines() if l.startswith(("PASS", "FAIL"))]
    for l in lines:
        print("  e2e " + l)
    check("headless e2e: full Daily Quest scored against the key (%d checks)" % len(lines), r.returncode == 0 and lines and all(l.startswith("PASS") for l in lines), r.stderr[-800:])
finally:
    os.unlink(kf.name)

# ---------- 6. screenshots ----------
sizes = {}
for p in glob.glob(os.path.join(HERE, "screenshots", "*.png")):
    d = open(p, "rb").read(24)
    sizes[os.path.basename(p)] = struct.unpack(">II", d[16:24])
desk = [s for n, s in sizes.items() if n.startswith("desktop-")]
phone = [s for n, s in sizes.items() if n.startswith("phone-")]
check("desktop screenshots are 1280x800", desk and all(s == (1280, 800) for s in desk), sizes)
check("phone screenshots are 390x844", phone and all(s == (390, 844) for s in phone), sizes)

# ---------- 7. read-only ----------
after = fingerprint()
check("Path's source files unchanged (%d files, sha256 + mtime)" % len(before), before == after,
      [p for p in set(before) | set(after) if before.get(p) != after.get(p)][:5])

print("\n%d/%d checks passed" % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
