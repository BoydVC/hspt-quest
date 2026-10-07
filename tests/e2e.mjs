// End-to-end: plays a full Daily Quest headlessly against an independent answer key and verifies scoring.
// node --experimental-websocket tests/e2e.mjs <key.json> [baseUrl] [snapshotPath]
import { readFileSync } from "node:fs";
import { launch, sleep } from "./cdp.mjs";
import { playSession } from "./play.mjs";

const keyMap = JSON.parse(readFileSync(process.argv[2], "utf8"));
const BASE = process.argv[3] || "http://127.0.0.1:4444";
const SNAP = process.argv[4];
let pass = 0, fail = 0;
const check = (n, c, d = "") => { console.log((c ? "PASS " : "FAIL ") + n + (c ? "" : "  " + d)); c ? pass++ : fail++; };

const b = await launch(9444);
try {
  await b.goto(BASE + "/", 1500);
  await b.ev(`localStorage.clear()`); await b.goto(BASE + "/", 1500);
  check("home renders", await b.ev(`!!document.querySelector('.hero') && document.querySelectorAll('.mode').length === 4`));
  check("five mastery bars", (await b.ev(`document.querySelectorAll('.mrow').length`)) === 5);

  // ---- Daily Quest: answer 2 of every 3 correctly
  await b.ev(`document.querySelector('[data-start=quest]').click()`); await sleep(400);
  const plan = (i) => i % 3 !== 2;
  const { log, res } = await playSession(b, keyMap, plan);
  check("quest has 10 questions", log.length === 10, String(log.length));
  const areas = await b.ev(`(${JSON.stringify(log.map((l) => l.qid))}).map(id => HQ.bank.questions.find(q => q.id === id).area)`);
  const counts = {}; areas.forEach((a) => counts[a] = (counts[a] || 0) + 1);
  check("quest mixes all 5 areas (2 each)", Object.keys(counts).length === 5 && Object.values(counts).every((n) => n === 2), JSON.stringify(counts));
  check("instant feedback matched the key on every question", log.every((l) => l.fbGood === l.want), JSON.stringify(log.filter((l) => l.fbGood !== l.want)));
  const expected = log.filter((l) => l.want).length;
  check(`results score = ${expected}/10 (from the independent key)`, res && res.correct === expected && res.total === 10, JSON.stringify(res));

  // XP check: recompute from the rules
  let xp = 0, combo = 0;
  for (const l of log) { if (l.want) { xp += (l.type === "mc" ? 10 : 12) + Math.min(10, 2 * combo); combo++; } else { xp += 2; combo = 0; } }
  xp += 20 + 30 + (expected === 10 ? 25 : 0);
  check(`XP = ${xp} by the rules`, res.xp === xp, String(res.xp));

  // Export JSON
  const ex = await b.ev(`HQ.exportData()`);
  const s0 = ex.sessions[0];
  check("export has the session with per-question results", ex.app === "HSPT Quest" && s0 && s0.items.length === 10 && s0.correct === expected);
  check("export items match the key per question", s0.items.every((it, i) => it.qid === log[i].qid && it.correct === log[i].want && typeof it.day === "number"));
  check("export summary totals", ex.summary.answered === 10 && ex.summary.correct === expected && ex.summary.xp === xp, JSON.stringify(ex.summary).slice(0, 200));
  check("daily quest marked done + streak 1", ex.summary.daily_quests_done.length === 1 && ex.summary.streak_days === 1);
  const misses = 10 - expected;
  check(`${misses} misses waiting in Mistake Replay`, ex.summary.replay_waiting === misses, String(ex.summary.replay_waiting));

  // ---- Mistake Replay: answer all correctly -> they move to box 2 (due tomorrow)
  await b.ev(`document.querySelector('[data-go=home]').click()`); await sleep(300);
  check("replay card shows the count", (await b.ev(`document.querySelector('[data-start=replay] .tag').textContent`)).startsWith(String(misses)));
  await b.ev(`document.querySelector('[data-start=replay]').click()`); await sleep(400);
  const rp = await playSession(b, keyMap, () => true);
  check("replay serves exactly the missed questions", rp.log.length === misses && rp.log.every((l) => log.some((m) => m.qid === l.qid && !m.want)), JSON.stringify(rp.log.map((l) => l.qid)));
  check("replay all correct scored", rp.res && rp.res.correct === misses);
  const st = await b.ev(`HQ.state`);
  const boxes = rp.log.map((l) => st.q[l.qid].box);
  check("replayed items advanced to box 2 (spaced)", boxes.every((x) => x === 2), JSON.stringify(boxes));

  // ---- Area drill (Reading) and Timed Sprint (Mathematics)
  await b.ev(`document.querySelector('[data-go=home]').click()`); await sleep(300);
  await b.ev(`document.querySelector('[data-go="pick-drill"]').click()`); await sleep(300);
  await b.ev(`document.querySelector('[data-start=drill][data-area=Reading]').click()`); await sleep(400);
  const dr = await b.ev(`(() => { const c = document.querySelector('.qcard'); return HQ.bank.questions.find(q => q.id === c.dataset.qid).area; })()`);
  check("area drill serves only that area", dr === "Reading", dr);
  const drill = await playSession(b, keyMap, () => true);
  check("area drill: 10 Reading questions all scored correct", drill.res && drill.res.correct === 10 && drill.res.total === 10, JSON.stringify(drill.res));
  await b.ev(`document.querySelector('[data-go=home]').click()`); await sleep(300);
  await b.ev(`document.querySelector('[data-go="pick-sprint"]').click()`); await sleep(300);
  await b.ev(`document.querySelector('[data-start=sprint][data-area=Mathematics]').click()`); await sleep(700);
  const clk = await b.ev(`document.getElementById('clock') && document.getElementById('clock').textContent`);
  check("timed sprint shows a countdown", /⏱️ \d+:\d\d/.test(clk || ""), clk);
  const sp = await b.ev(`(() => { const s = HQ.state; return true; })()`);
  const sprint = await playSession(b, keyMap, () => true);
  check("timed sprint scored", sprint.res && sprint.res.correct === sprint.log.length, JSON.stringify(sprint.res));
  const lastS = (await b.ev(`HQ.exportData()`)).sessions.pop();
  check("sprint records its time limit (HSPT pace)", lastS.mode === "sprint" && lastS.time_limit_s > 0 && lastS.pace === "hspt", JSON.stringify({m: lastS.mode, t: lastS.time_limit_s}));

  // ---- Wrong typed answer never counts; equivalent forms do
  const eq = await b.ev(`(() => { const q = HQ.bank.questions.find(q => q.id === 'd20q09'); return q ? q.answer_value : null; })()`);
  check("fraction key stored as a value (1/2 = 0.5)", eq === 0.5, String(eq));
  const nv = await b.ev(`[HQ.numericValue("1/2"), HQ.numericValue("$15.00"), HQ.numericValue("x = 4"), HQ.numericValue("3 1/2"), HQ.numericValue("12 cm"), HQ.numericValue("banana")]`);
  check("typed answers accept equivalent forms only", JSON.stringify(nv) === JSON.stringify([0.5, 15, 4, 3.5, 12, null]), JSON.stringify(nv));
  const typedKeys = Object.fromEntries(Object.entries(keyMap).filter(([, k]) => k.kind === "text"));
  const tk = await b.ev(`(() => { const K = ${JSON.stringify(typedKeys)}; const bad = []; let n = 0;
    for (const q of HQ.bank.questions) { if (q.type !== 'input') continue; n++;
      const k = K[q.id]; if (!k || Math.abs(HQ.numericValue(k.text) - q.answer_value) > 1e-6) bad.push(q.id); }
    return {n, bad}; })()`);
  check(`every typed question (${tk.n}) grades its own sheet key as correct`, tk.n > 0 && tk.bad.length === 0, JSON.stringify(tk.bad));
  // ---- Export -> reset -> import round trip
  await b.ev(`document.querySelector('[data-go=home]') && document.querySelector('[data-go=home]').click()`); await sleep(300);
  const snapX = await b.ev(`JSON.stringify(HQ.exportData())`);
  const xpBefore = await b.ev(`HQ.state.xp`);
  await b.ev(`window.confirm = () => true; document.getElementById('reset').click()`); await sleep(300);
  check("reset clears progress", (await b.ev(`HQ.state.xp`)) === 0);
  await b.ev(`document.getElementById('import').click()`); await sleep(200);
  await b.ev(`(() => { document.getElementById('impt').value = '{"app":"Something else"}'; document.getElementById('impo').click(); })()`); await sleep(200);
  check("import rejects a non-HSPT-Quest file", (await b.ev(`HQ.state.xp`)) === 0 && (await b.ev(`!!document.querySelector('dialog[open]')`)));
  await b.ev(`(() => { document.getElementById('impt').value = ${JSON.stringify(snapX)}; document.getElementById('impo').click(); })()`); await sleep(300);
  check("import restores exported progress", (await b.ev(`HQ.state.xp`)) === xpBefore && (await b.ev(`HQ.exportData().sessions.length`)) >= 4, String(xpBefore));
  check("no JS errors", b.errors.length === 0, b.errors.join(" | "));

  // ---- Offline snapshot: loads with the bank baked in and plays one question
  if (SNAP) {
    await b.goto("file://" + SNAP, 1500);
    const n = await b.ev(`HQ.bank && HQ.bank.questions.length`);
    check("offline snapshot loads the baked-in bank", n > 0, String(n));
    await b.ev(`document.querySelector('[data-start=quest]').click()`); await sleep(300);
    check("offline snapshot starts a quest", await b.ev(`!!document.querySelector('.qcard')`));
  }
} catch (e) { check("e2e run", false, e.stack || String(e)); }
finally { await b.close(); }
console.log(`\n${pass}/${pass + fail} e2e checks passed`);
process.exit(fail ? 1 : 0);
