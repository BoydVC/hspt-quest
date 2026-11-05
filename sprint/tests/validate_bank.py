#!/usr/bin/env python3
"""Independent bank checks: answer keys, duplicates, counts, tags, and recomputed arithmetic keys."""
import json, os, re, sys
from fractions import Fraction
B = json.load(open(os.path.join(os.path.dirname(__file__), "..", "..", "web", "sprint", "bank.json")))
items, fails, n = B["items"], [], 0
def check(name, ok, why=""):
    global n; n += 1
    if not ok: fails.append(name + " " + why)
SECT = {"Verbal": 60, "Quantitative": 52, "Reading": 62, "Mathematics": 64, "Language": 60}
check("total>=300", len(items) >= 300, str(len(items)))
for s, k in SECT.items():
    c = sum(1 for i in items if i["section"] == s)
    check(f"{s} covers a full real section ({k})", c >= k, str(c))
    check(f"counts match {s}", B["counts"][s] == c)
check("unique ids", len({i["id"] for i in items}) == len(items))
stems = {}
for i in items:
    for f in ("id", "section", "skill", "stem", "choices", "answer", "explanation"):
        check(f"{i.get('id')} has {f}", f in i and i[f] not in ("", None))
    check(f"{i['id']} key in range", 0 <= i["answer"] < len(i["choices"]))
    check(f"{i['id']} 3-4 choices", len(i["choices"]) in (3, 4))
    check(f"{i['id']} distinct choices", len(set(i["choices"])) == len(i["choices"]))
    k = (i.get("passage", "")[:30], re.sub(r"\s+", " ", i["stem"]).lower(), tuple(sorted(i["choices"])))
    check(f"{i['id']} not duplicate", k not in stems, stems.get(k, "")); stems[k] = i["id"]
    key = i["choices"][i["answer"]]
    m = re.match(r"What is (\d+)% of (\d+)\?", i["stem"])
    if m: check(i["id"] + " percent key", Fraction(int(m[1]) * int(m[2]), 100) == Fraction(key))
    m = re.match(r"Solve for x: (\d+)x ([+−]) (\d+) = (-?\d+)", i["stem"])
    if m:
        b = int(m[3]) * (1 if m[2] == "+" else -1); check(i["id"] + " algebra key", Fraction(int(m[4]) - b, int(m[1])) == Fraction(key))
    m = re.match(r"(\d+)/(\d+) \+ (\d+)/(\d+) =", i["stem"])
    if m: check(i["id"] + " fraction key", Fraction(int(m[1]), int(m[2])) + Fraction(int(m[3]), int(m[4])) == Fraction(key))
    m = re.match(r"Look at this series: ([\d, -]+), …", i["stem"])
    if m:
        s = [int(x) for x in m[1].split(", ")]
        d = s[1] - s[0]
        if all(s[j + 1] - s[j] == d for j in range(4)): check(i["id"] + " arithmetic series", int(key) == s[4] + d)
        elif s[0] and all(s[j + 1] == s[j] * (s[1] // s[0]) for j in range(4)): check(i["id"] + " geometric series", int(key) == s[4] * (s[1] // s[0]))
        else: check(i["id"] + " alternating series", int(key) == s[3] + (s[3] - s[1]))
    if i["skill"] == "logic": check(i["id"] + " T/F/U", i["choices"] == ["True", "False", "Uncertain"])
    if i["skill"] == "spelling": good = i["explanation"].split("“")[1].split("”")[0]; check(i["id"] + " key is the misspelling", key != good and sorted(key.lower()) != [] and good not in i["choices"])
    m = re.match(r"What is the mean of ([\d, ]+)\?", i["stem"])
    if m: v = [int(x) for x in m[1].split(", ")]; check(i["id"] + " mean", Fraction(sum(v), len(v)) == Fraction(key))
    m = re.match(r"What is the median of ([\d, ]+)\?", i["stem"])
    if m: v = sorted(int(x) for x in m[1].split(", ")); check(i["id"] + " median", v[len(v) // 2] == int(key))
    m = re.match(r"Values: I = ([\d.]+), II = ([\d.]+), III = ([\d.]+)", i["explanation"]) or re.match(r"I = (\d+), II = (\d+), III = (\d+)", i["explanation"])
    if m:
        v = {"I": float(m[1]), "II": float(m[2]), "III": float(m[3])}
        t = key.split(); ok = all((v[t[j]] > v[t[j + 2]]) if t[j + 1] == ">" else (v[t[j]] == v[t[j + 2]]) for j in (0, 2))
        check(i["id"] + " comparison key true", ok)
        for w in i["choices"]:
            if w == key: continue
            t = w.split(); bad = all((v[t[j]] > v[t[j + 2]]) if t[j + 1] == ">" else (v[t[j]] == v[t[j + 2]]) for j in (0, 2))
            check(i["id"] + " distractor false: " + w, not bad)
print(f"{n - len(fails)}/{n} bank checks passed")
if fails: print("\n".join(fails[:30])); sys.exit(1)
