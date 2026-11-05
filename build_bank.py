#!/usr/bin/env python3
"""Build the HSPT Quest question bank from Path's practice sheets (READ-ONLY).

Sources: /workspace/hspt/hspt-day*.html and /workspace/hspt/worksheets/hspt-day*.html
Output:  data/bank.json  (+ data/bank-report.json with counts, duplicates, and skipped questions)

Rules:
- A question is only kept if its correct answer is in the sheet's answer key.
  Multiple choice: the key's letter must exist among the parsed choices AND the key text must match that choice.
  Typed answers: numeric keys become auto-graded "type it" questions; text keys become "check yourself" questions.
- Anything that can't be matched to a key is listed in the report as skipped. Answers are never guessed.
"""
import datetime as dt
import glob
import hashlib
import html
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.environ.get("HQ_HSPT_ROOT", "/workspace/hspt")  # read-only
AREAS = ["Verbal", "Quantitative", "Reading", "Mathematics", "Language"]
ALLOWED = {"em", "strong", "sup", "sub", "b", "i"}


def clean_html(s):
    """Keep only a few inline tags; everything else becomes text. Output is safe to inject."""
    s = re.sub(r"<br\s*/?>", "\n", s)
    s = re.sub(r'<span class="write"></span>', "", s)
    out, pos = [], 0
    for m in re.finditer(r"<(/?)([a-zA-Z0-9]+)[^>]*>", s):
        out.append(esc_text(s[pos:m.start()]))
        tag = m.group(2).lower()
        if tag in ALLOWED:
            out.append(f"<{m.group(1)}{tag}>")
        pos = m.end()
    out.append(esc_text(s[pos:]))
    t = "".join(out).replace("\u00a0", " ")
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r" *\n *", "\n", t)
    return t.strip()


def esc_text(t):
    t = html.unescape(t)
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def plain(h):
    return html.unescape(re.sub(r"<[^>]+>", "", h)).replace("\n", " ").strip()


def norm(s):
    s = plain(s).lower()
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"').replace("—", "-").replace("–", "-")
    return re.sub(r"\s+", " ", s).strip(" .")


CHOICE_RE = re.compile(r"(?:(?<=\s)|^)([a-e])\)\s")


def split_choices(h):
    """Return (stem_html, [choice_html...]) or (h, []) when no clean a), b), c)... sequence exists."""
    marks = list(CHOICE_RE.finditer(h))
    # take the first run that starts at 'a' and continues b, c, d...
    for i, m in enumerate(marks):
        if m.group(1) != "a":
            continue
        run = [m]
        for n in marks[i + 1:]:
            if ord(n.group(1)) == ord(run[-1].group(1)) + 1:
                run.append(n)
        if len(run) >= 2:
            stem = h[:run[0].start()].strip()
            choices = []
            for j, r in enumerate(run):
                end = run[j + 1].start() if j + 1 < len(run) else len(h)
                choices.append(h[r.end():end].strip().strip("\n").strip())
            # stem may legitimately end with an em dash ("abundant —")
            stem = re.sub(r"\s*[—-]\s*$", "", stem).strip()
            return stem, [re.sub(r"\s*\n\s*", " ", c).strip() for c in choices]
    return h, []


TRAIL_PAREN = re.compile(r"^(.*?)\s*\(((?:[^()]|\([^()]*\))*)\)\s*$", re.S)


def split_expl(h):
    m = TRAIL_PAREN.match(h)
    if m and m.group(1).strip():
        return m.group(1).strip(), m.group(2).strip()
    return h.strip(), ""


UNIT_WORDS = r"(square inches|square feet|square units|sq\.? ?(?:in|ft|cm|m)|inches|inch|feet|foot|ft|cm²|cm2|cm|mm|m²|km|meters|meter|miles|mile|mph|minutes|minute|min|hours|hour|seconds|cups|cup|students|pencils|balls|degrees|°|in)"


def numeric_value(s):
    """Parse '48', '25%', '$2.50', '7/8', 'x = 6', '26 cm', '1 1/2', '-3'. Returns float or None."""
    t = plain(s).lower().replace(",", "").replace("−", "-").replace("–", "-")
    t = re.sub(r"^[a-z]\s*=\s*", "", t.strip())
    t = t.replace("$", "").replace("%", "").strip()
    t = re.sub(r"\s*" + UNIT_WORDS + r"\.?$", "", t).strip()
    m = re.fullmatch(r"(-?\d+)\s+(\d+)/(\d+)", t)
    if m:
        a, b, c = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return a + (b / c if a >= 0 else -b / c) if c else None
    m = re.fullmatch(r"(-?\d+)/(\d+)", t)
    if m:
        return int(m.group(1)) / int(m.group(2)) if int(m.group(2)) else None
    m = re.fullmatch(r"-?\d+(?:\.\d+)?|-?\.\d+", t)
    if m:
        return float(t)
    return None


def sheet_files():
    files = {}
    for p in sorted(glob.glob(os.path.join(SRC, "hspt-day*.html")) + glob.glob(os.path.join(SRC, "worksheets", "hspt-day*.html"))):
        m = re.search(r"hspt-day(\d+)\.html$", p)
        if m:
            files.setdefault(int(m.group(1)), p)
    return files


def parse_sheet(day, path, skipped):
    raw = open(path, encoding="utf-8").read()
    if 'class="page-break"' not in raw:
        skipped.append({"day": day, "num": None, "reason": "sheet has no answer-key page", "source": path})
        return [], None
    qpart, kpart = raw.split('class="page-break"', 1)
    meta = re.search(r'class="meta">([^<]*)', qpart)
    meta = html.unescape(meta.group(1)) if meta else ""
    dm = re.search(r"(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Sep|Oct|Nov|Dec) (\d{1,2}), (2026)", meta.split("·")[-1])
    date = dt.datetime.strptime(f"{dm.group(2)} {dm.group(3)} 2026", "%b %d %Y").date().isoformat() if dm else None
    keys = [k for k in re.findall(r"<li>(.*?)</li>", kpart.split("<ol", 1)[-1], re.S)]
    questions = []
    num = 0
    for sec in re.split(r"<h2>", qpart)[1:]:
        title = sec.split("</h2>")[0]
        diff = re.search(r'class="diff">([^<]*)', title)
        diff = html.unescape(diff.group(1)).strip() if diff else ""
        title_txt = plain(re.sub(r'<span class="diff">.*?</span>', "", title))
        area = title_txt.split("—")[0].strip().split(" ")[0]
        skill = title_txt.split("—", 1)[1].strip() if "—" in title_txt else ""
        body = sec.split("</h2>", 1)[1]
        instr = re.search(r"<p>(.*?)</p>", body.split("<ol", 1)[0], re.S)
        passage = re.search(r'<div class="passage">(.*?)</div>', body, re.S)
        ol = re.search(r"<ol[^>]*>(.*?)</ol>", body, re.S)
        start = re.search(r'<ol start="(\d+)"', body)
        if not ol:
            continue
        lis = re.findall(r"<li>(.*?)</li>", ol.group(1), re.S)
        for i, li in enumerate(lis):
            num = (int(start.group(1)) + i) if start else num + 1
            q = {"day": day, "num": num, "date": date, "area": area, "skill": skill, "difficulty": diff,
                 "instruction": clean_html(instr.group(1)) if instr else "",
                 "passage": clean_html(passage.group(1)) if passage else "",
                 "source": os.path.relpath(path, SRC)}
            body_h = re.sub(r"Answer:\s*$", "", clean_html(li)).strip()
            stem, choices = split_choices(body_h)
            q["stem"] = stem
            key_h = clean_html(keys[num - 1]) if num - 1 < len(keys) else None
            if area not in AREAS:
                skipped.append({**ref(q), "reason": f"unknown area '{area}'"})
                continue
            if not key_h:
                skipped.append({**ref(q), "reason": "no answer in the sheet's answer key"})
                continue
            km = re.match(r"^([a-e])\)\s*(.*)$", key_h, re.S)
            if choices:
                if not km:
                    skipped.append({**ref(q), "reason": "multiple choice but the key has no letter", "key": plain(key_h)})
                    continue
                idx = ord(km.group(1)) - ord("a")
                if idx >= len(choices):
                    skipped.append({**ref(q), "reason": f"key letter {km.group(1)}) is not one of the choices", "key": plain(key_h)})
                    continue
                rest = km.group(2).strip()
                ctext = norm(choices[idx])
                key_ans = norm(split_expl(rest)[0]).strip('"\'')
                partial = (not norm(rest).startswith(ctext) and len(key_ans) >= 4 and key_ans in ctext
                           and sum(1 for c in choices if key_ans in norm(c)) == 1)
                if not norm(rest).startswith(ctext) and not partial:
                    skipped.append({**ref(q), "reason": "key text doesn't match the lettered choice", "key": plain(key_h), "choice": plain(choices[idx])})
                    continue
                # explanation = whatever follows the choice text (usually in parentheses)
                ans_part, expl = split_expl(rest)
                if norm(ans_part) != ctext:
                    expl = ""  # no clean trailing explanation
                if partial:
                    expl = split_expl(rest)[1] or ""
                    q["key_match"] = "partial"  # key quoted a phrase that appears only in the lettered choice
                q.update({"type": "mc", "choices": choices, "answer": idx, "answer_text": choices[idx], "explanation": expl})
            else:
                if km:
                    skipped.append({**ref(q), "reason": "key is lettered but no choices were found in the question", "key": plain(key_h)})
                    continue
                ans, expl = split_expl(key_h)
                val = numeric_value(ans)
                if val is not None:
                    q.update({"type": "input", "answer_text": ans, "answer_value": val, "explanation": expl})
                else:
                    q.update({"type": "self", "answer_text": ans, "explanation": expl})
            q["id"] = "d%02dq%02d" % (day, num)
            questions.append(q)
    if len(keys) != num:
        skipped.append({"day": day, "num": None, "reason": f"answer key has {len(keys)} answers for {num} questions", "source": path})
    return questions, date


def ref(q):
    return {"day": q["day"], "num": q["num"], "area": q["area"], "stem": plain(q["stem"])[:120], "source": q["source"]}


def main():
    skipped, all_q, sheets = [], [], []
    files = sheet_files()
    for day in sorted(files):
        qs, date = parse_sheet(day, files[day], skipped)
        sheets.append({"day": day, "date": date, "source": os.path.relpath(files[day], SRC), "questions": len(qs)})
        all_q += qs
    # Day 1 has no printed date: infer from Day 2 (sheets are daily), and say so.
    by_day = {s["day"]: s for s in sheets}
    if 1 in by_day and not by_day[1]["date"] and 2 in by_day and by_day[2]["date"]:
        d1 = (dt.date.fromisoformat(by_day[2]["date"]) - dt.timedelta(days=1)).isoformat()
        by_day[1]["date"], by_day[1]["date_inferred"] = d1, True
        for q in all_q:
            if q["day"] == 1:
                q["date"], q["date_inferred"] = d1, True
    # De-duplicate repeats across days (same stem + choices + answer); keep first, list every source.
    uniq, seen, dups = [], {}, []
    for q in all_q:
        sig = hashlib.sha1(json.dumps([norm(q["stem"]), [norm(c) for c in q.get("choices", [])], norm(q["answer_text"]), norm(q["passage"])]).encode()).hexdigest()[:12]
        if sig in seen:
            seen[sig]["also_in"].append({"day": q["day"], "num": q["num"]})
            dups.append({"id": q["id"], "same_as": seen[sig]["id"]})
            continue
        q["also_in"] = []
        seen[sig] = q
        uniq.append(q)
    by_area = {a: sum(1 for q in uniq if q["area"] == a) for a in AREAS}
    by_type = {}
    for q in uniq:
        by_type[q["type"]] = by_type.get(q["type"], 0) + 1
    report = {"built_at": dt.datetime.now().astimezone().isoformat(timespec="seconds"), "source_root": SRC,
              "sheets": sheets, "parsed_total": len(all_q), "unique_total": len(uniq), "by_area": by_area,
              "by_type": by_type, "duplicates": dups, "skipped": skipped}
    bank = {"version": 1, "built_at": report["built_at"], "test_day": "2026-11-17", "areas": AREAS,
            "sheets": sheets, "questions": uniq, "stats": {k: report[k] for k in ("parsed_total", "unique_total", "by_area", "by_type")},
            "skipped": skipped, "duplicates": dups}
    out = os.environ.get("HQ_OUT", os.path.join(HERE, "data"))
    os.makedirs(out, exist_ok=True)
    for name, obj in (("bank.json", bank), ("bank-report.json", report)):
        tmp = os.path.join(out, name + ".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=1)
        os.replace(tmp, os.path.join(out, name))
    return bank, report


if __name__ == "__main__":
    bank, rep = main()
    if "-q" not in sys.argv:
        print(json.dumps({k: rep[k] for k in ("parsed_total", "unique_total", "by_area", "by_type")}, ensure_ascii=False))
        print("duplicates:", len(rep["duplicates"]), "skipped:", len(rep["skipped"]))
        for s in rep["skipped"]:
            print("  SKIP", s)
