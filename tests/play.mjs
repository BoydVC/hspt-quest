// Plays one session headlessly. answerPlan(i, q) -> true (answer correctly) | false (answer wrong).
// The correct answer comes from an INDEPENDENT key (parsed straight from Path's sheets by the Python test),
// passed in as keyMap: { "d07q05": {kind: "letter", letter: "b"} | {kind: "text", text: "$15.00"} }.
import { sleep } from "./cdp.mjs";

export async function playSession(b, keyMap, answerPlan, { sprintFast = false } = {}) {
  const log = [];
  for (let i = 0; i < 40; i++) {
    await sleep(150);
    const onResults = await b.ev(`!!document.querySelector('.res')`);
    if (onResults) break;
    const card = await b.ev(`(() => { const c = document.querySelector('.qcard'); return c ? {qid: c.dataset.qid, type: c.dataset.type, n: document.querySelectorAll('.qprog i').length} : null; })()`);
    if (!card) { await sleep(300); continue; }
    if (log.length && log[log.length - 1].qid === card.qid) { await sleep(200); continue; }
    const key = keyMap[card.qid];
    if (!key) throw new Error("no independent key for " + card.qid);
    const want = answerPlan(log.length, card);
    let given;
    if (card.type === "mc") {
      const letters = await b.ev(`[...document.querySelectorAll('.choice')].map(x => x.dataset.letter)`);
      given = want ? key.letter : letters.find((l) => l !== key.letter);
      await b.ev(`document.querySelector('.choice[data-letter="${given}"]').click()`);
    } else if (card.type === "input") {
      const kv = parseFloat(String(key.text).replace(/[^0-9.\-]/g, ""));
      given = want ? key.text : String(Number.isFinite(kv) ? kv + 1 : 999999);
      await b.ev(`(() => { const a = document.getElementById('ans'); a.value = ${JSON.stringify(given)}; document.getElementById('check').click(); })()`);
    } else {
      await b.ev(`document.getElementById('reveal').click()`); await sleep(100);
      given = want ? "self:got-it" : "self:not-yet";
      await b.ev(`document.getElementById('${want ? "gotit" : "notyet"}').click()`);
    }
    await sleep(120);
    const fb = await b.ev(`document.getElementById('fb') ? document.getElementById('fb').className : ''`);
    log.push({ qid: card.qid, type: card.type, want, given, fbGood: /good/.test(fb) });
    const sprint = await b.ev(`!!document.getElementById('timer')`);
    if (sprint) { await sleep(1500); continue; }
    await b.ev(`document.getElementById('next').click()`);
  }
  await sleep(400);
  const res = await b.ev(`(() => { const r = document.querySelector('.res'); return r ? {correct: +r.dataset.correct, total: +r.dataset.total, xp: +r.dataset.xp} : null; })()`);
  return { log, res };
}
