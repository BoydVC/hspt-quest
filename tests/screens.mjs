// Screenshots at 1280x800 and 390x844 in a throwaway browser profile (demo progress only; never her real data).
// node --experimental-websocket tests/screens.mjs <key.json> [baseUrl]
import { readFileSync, mkdirSync } from "node:fs";
import { launch, sleep } from "./cdp.mjs";
import { playSession } from "./play.mjs";

const keyMap = JSON.parse(readFileSync(process.argv[2], "utf8"));
const BASE = process.argv[3] || "http://127.0.0.1:4444";
const OUT = new URL("../screenshots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const b = await launch(9445);
const click = (sel) => b.ev(`document.querySelector(${JSON.stringify(sel)}).click()`);
const top = () => b.ev(`window.scrollTo(0,0)`);
async function answerOne(right) {
  const c = await b.ev(`(() => { const c = document.querySelector('.qcard'); return {qid: c.dataset.qid, type: c.dataset.type}; })()`);
  const k = keyMap[c.qid];
  if (c.type === "mc") {
    const L = right ? k.letter : (await b.ev(`[...document.querySelectorAll('.choice')].map(x=>x.dataset.letter)`)).find((l) => l !== k.letter);
    await click(`.choice[data-letter="${L}"]`);
  } else if (c.type === "input") await b.ev(`(() => { ans.value = ${JSON.stringify(right ? k.text : "7")}; check.click(); })()`);
  else { await click("#reveal"); await sleep(80); await click(right ? "#gotit" : "#notyet"); }
}
async function quit() {
  await b.ev(`window.confirm = () => true`); await click("#quit"); await sleep(400);
  if (await b.ev(`!!document.querySelector('[data-go=home]')`)) { await click("[data-go=home]"); await sleep(300); }
}
try {
  for (const [w, h, tag] of [[1280, 800, "desktop"], [390, 844, "phone"]]) {
    await b.viewport(w, h, tag === "phone");
    await b.goto(BASE + "/", 1200); await b.ev(`localStorage.clear()`);
    // seed demo progress by actually playing: one quest + a drill per area
    await b.goto(BASE + "/", 1500);
    await click("[data-start=quest]"); await sleep(300);
    await playSession(b, keyMap, (i) => i % 4 !== 3);
    for (const a of ["Verbal", "Quantitative", "Reading"]) {
      await click("[data-go=home]"); await sleep(200); await click('[data-go="pick-drill"]'); await sleep(200);
      await click(`[data-start=drill][data-area=${a}]`); await sleep(300);
      await playSession(b, keyMap, (i) => i % 3 !== 1);
    }
    await click("[data-go=home]"); await sleep(700); await top();
    await b.shot(`${OUT}${tag}-01-home.png`);
    await click('[data-go="pick-drill"]'); await sleep(400); await top();
    await b.shot(`${OUT}${tag}-02-area-drills.png`);
    // a Reading question with its passage
    await click("[data-start=drill][data-area=Reading]"); await sleep(500); await top();
    await b.shot(`${OUT}${tag}-03-question.png`);
    await answerOne(true); await sleep(250);
    await b.ev(`document.getElementById('fb') && document.getElementById('fb').scrollIntoView({block:'center'})`); await sleep(200);
    await b.shot(`${OUT}${tag}-04-correct-cheer.png`);
    await click("#next"); await sleep(300);
    await answerOne(false); await sleep(1000);
    await b.ev(`document.getElementById('fb') && document.getElementById('fb').scrollIntoView({block:'center'})`); await sleep(200);
    await b.shot(`${OUT}${tag}-05-not-yet.png`);
    await quit();
    // timed sprint, typed math question if possible
    await click('[data-go="pick-sprint"]'); await sleep(300); await top();
    await b.shot(`${OUT}${tag}-06-sprint-picker.png`);
    await click("[data-start=sprint][data-area=Mathematics]"); await sleep(2200); await top();
    await b.shot(`${OUT}${tag}-07-timed-sprint.png`);
    await quit();
    await click("[data-start=replay]"); await sleep(300);
    await playSession(b, keyMap, (i) => i % 2 === 0);
    await top(); await sleep(600);
    await b.shot(`${OUT}${tag}-08-results.png`);
  }
  if (b.errors.length) console.log("JS errors:", b.errors);
  console.log("screens ok");
} finally { await b.close(); }
