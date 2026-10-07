# HSPT Quest 🧭

A game-style practice app for Charlotte's HSPT (Nov 17, 2026, at SJE). It is built **only** from Path's 20 practice sheets.
Everything runs on this machine. Progress lives in the browser's `localStorage`, and nothing is sent anywhere.

- **Live app:** http://127.0.0.1:4444 (start with `./run.sh`, stop with `./stop.sh`; log at `data/server.log`)
- **Offline single file:** `dist/hspt-quest-snapshot.html`. The whole bank is baked in, with no network and no other files needed. Open it from disk, AirDrop it, etc.
- **Tests:** `python3 tests/smoke_test.py` (the server must be running)

## The question bank

`build_bank.py` reads Path's sheets **read-only** and writes `data/bank.json` plus `data/bank-report.json`. The sheets are `/workspace/hspt/hspt-day10…20.html` and `/workspace/hspt/worksheets/hspt-day1…12,15…20.html`; the root copy wins when a day is in both.

| Area | Questions |
|---|---|
| Verbal | 40 |
| Quantitative | 56 |
| Reading | 39 |
| Mathematics | 37 |
| Language | 43 |
| **Total (unique)** | **215** (of 221 parsed) |

- **Types:**
  - 138 multiple choice.
  - 76 typed answers, where the key is a number, so the app grades a typed answer instead of inventing choices.
  - 1 "check yourself" item: d01q09, *"Fix (or say fine): Neither of the girls are ready."* The key is a sentence, so Char reveals Path's answer and marks it herself.
- **Answer key rules:** a question gets into the bank only if its answer is actually in that sheet's answer key.
  - A lettered key must name a real choice, and the key's text must match that choice. Otherwise the question is skipped and logged in `bank-report.json → skipped`. Nothing is ever guessed.
  - **Skipped: 0.** One question was accepted on a partial match: d19q10, where the key quotes "between you and me", which appears in only one choice (b). It is flagged in the bank as `key_match: "partial"`.
- **Duplicates:** 6 questions repeat across days, so each one is kept once and lists every sheet it came from (`also_in`):
  - d03q09 = d01q07
  - d04q09 = d02q08
  - d15q03 = d13q03
  - d15q04 = d13q04
  - d15q08 = d05q08
  - d17q03 = d08q03
- **Per-question fields:**
  - Where it came from: area, skill, difficulty, source sheet, day and date. Day 1's sheet has no date, so Sep 18 is inferred and flagged with `date_inferred`.
  - The question: the passage or instruction it uses, the stem, and the choices.
  - Path's answer and his explanation, when the key has one.
- **Typed answers accept equivalent forms:** `1/2` = `0.5`, `$15` = `15.00`, `x = 7` = `7`, `3 1/2`, and units like `12 cm`. A typed answer that doesn't parse is never counted as correct.

## Modes

| Mode | What it does |
|---|---|
| 🗺️ **Daily Quest** | 10 mixed questions, 2 from each area. Picks in priority order: misses due for replay, unseen questions, recent misses, then weaker ones. She can play it again for more practice, but the +30 quest bonus is once a day. |
| 🎯 **Area Drills** | Pick one of the five areas and get 10 questions from it. |
| ⚡ **Timed Sprint** | 10 questions from one area against the clock at real HSPT pace. That's the section time ÷ question count: Verbal 16 min/60 = 16 s, Quantitative 30/52 ≈ 35 s, Reading 25/62 ≈ 24 s, Mathematics 45/64 ≈ 42 s, Language 25/60 = 25 s. Typed questions get +8 s. **Warm-up** gives 1.5× time. |
| 🔁 **Mistake Replay** | Spaced repetition (Leitner boxes). A miss comes back today, then after 1, 3 and 7 days as she gets it right. It graduates after the 4th correct replay. Missing it again sends it back to box 1. |

## Game rules (encouraging, never harsh)

- **XP:**
  - +10 for a correct choice, +12 for a correct typed answer, plus a combo bonus (+2 per question in the current streak of right answers, up to +10), plus +2 in Replay.
  - **+2 for a miss** ("for trying").
  - Session bonus +20, first Daily Quest of the day +30, perfect session +25.
- **Levels:** level L starts at 50·L·(L−1) XP (100, 300, 600, 1000…). Titles: Rookie → Warm-Up Star → Quick Thinker → Pattern Spotter → Word Wizard → Number Ninja → Trailblazer → Pathfinder → Ace → HSPT Legend.
- **Streak flame 🔥:** a day counts when she answers at least 5 questions or finishes the Daily Quest.
- **Area mastery:** for each area, a question that's "solid" (right on its most recent try) counts 1, and a question she has gotten right before but missed last time counts ½. Mastery % is that total ÷ the area's questions. The bars show "N/total solid".
- **Feedback:** a right answer gets confetti, floating XP and a cheer. A miss gets a soft message, Path's answer and explanation, and a note that the question will come back.
- **Keyboard:** A–E or 1–5 pick an answer; Enter goes to the next question.

## Progress export (for Path or a parent)

Home → **Export my progress** downloads `hspt-quest-progress-YYYY-MM-DD.json`:

```
{ app: "HSPT Quest", format: 1, student: "Charlotte", exported_at, test_day,
  bank: {built_at, questions, sheets},
  summary: {xp, level, title, streak_days, best_streak, answered, correct, accuracy_pct,
            by_area: {Verbal: {answered, correct, mastery_pct, solid, questions}, ...},
            replay_waiting, daily_quests_done: [dates]},
  days: {"2026-10-07": {answered, correct}},
  sessions: [{mode, area, started_at, ended_at, total, correct, xp, time_limit_s, pace, time_up,
              items: [{qid, day, num, area, type, given, correct, ms}]}],
  questions: {qid: {seen, right, wrong, box, due, ...}},
  _state: {...} }
```

`qid` is `dDDqNN`, which means Path's Day DD, question NN. **Import** (paste the JSON or pick the file) restores progress on another device.
The live app and the offline file are different browser origins, so they keep separate progress. Use export/import to move between them.

## Files

```
build_bank.py         sheets → data/bank.json + data/bank-report.json (env: HQ_HSPT_ROOT, HQ_OUT)
server.py             127.0.0.1:4444, serves web/ + /bank.json (rebuilt when sheets change) + /healthz
run.sh / stop.sh      background start/stop
web/                  index.html, app.css, app.js (vanilla JS, no CDNs or external fonts)
build_snapshot.py     → dist/hspt-quest-snapshot.html
screenshot.sh         → screenshots/desktop-*.png (1280×800), phone-*.png (390×844)
tests/smoke_test.py   full check (see below)
tests/independent_key.py  separate answer-key reader used to verify the bank and the scoring
tests/e2e.mjs, play.mjs, cdp.mjs, screens.mjs  headless Chrome drivers (node --experimental-websocket)
```

## What the smoke test checks

1. **Bank:** every question has a valid answer, and all 215 answers (including duplicates) agree with a separately written key reader.
2. **Never guess:** on a temp copy of a sheet it injects a wrong key letter, a letter that isn't a choice, and a missing answer. All three get skipped.
3. **Server:** endpoints work, no-store headers are set, there is no path traversal, and it is bound to localhost only.
4. **Snapshot:** the bank is baked in, with no network or external references.
5. **Headless Chrome:**
   - Plays a **full Daily Quest**, answering 7 right and 3 wrong using the independent key. It checks per-question feedback, the 7/10 score, the XP from the rules, the export JSON per question, the streak, and 3 misses in Replay.
   - Plays Replay (the misses move to box 2), a Reading drill, and a Math sprint with its clock.
   - Checks that typed-answer equivalence works and that every typed question accepts its own sheet key.
   - Checks the export → reset → import round trip, and that there are no JS errors.
   - Opens the offline file.
6. **Screenshots:** they exist at the right sizes.
7. **Read-only:** all files under `/workspace/hspt` are unchanged (sha256 + mtime).

Screenshots and tests run in throwaway browser profiles. Their demo progress comes from those scripted plays and is not Char's.


---
## Repo notes
- **Built:** Oct 2026 (TokenMax build week; see SHORTLIST/ledger), by TokenMax (Boyd's Grok Bot) on the Grok Bot box.
- **Run:** `./run.sh` (then open the localhost URL it prints).
- Imported from `/workspace/tokenmax/hspt-quest` on Oct 23, 2026. node_modules, virtualenvs, logs and files over 20 MB were left out.
