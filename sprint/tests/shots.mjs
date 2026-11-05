// Screenshots + demo GIF frames. Synthetic student "Alex" and synthetic progress only.
// node tests/shots.mjs [base] [outDir]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const BASE = process.argv[2] || "http://127.0.0.1:4455", OUT = process.argv[3] || "../screenshots/sprint";
mkdirSync(OUT + "/frames", { recursive: true });
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
let f = 0;
async function seed(page, day) {
  await page.goto(`${BASE}/sprint/?today=${day}`); await page.waitForFunction(() => window.HS); await page.evaluate(() => {
    const st = { v: 1, name: "Alex", q: {}, sessions: [], done: { "2026-11-05": true, "2026-11-06": true, "2026-11-07": true } };
    // synthetic history: strong Verbal/Reading, weaker Quant comparisons & Language usage
    const plan = { "Verbal": 0.85, "Quantitative": 0.55, "Reading": 0.8, "Mathematics": 0.7, "Language": 0.6 };
    HS.bank.items.forEach((q, i) => { if (i % 3) return; const p = plan[q.section] - (/comparison|usage|algebra/.test(q.skill) ? 0.3 : 0); const ok = ((i * 37) % 100) / 100 < p;
      st.q[q.id] = { box: ok ? 0 : 1, right: ok ? 1 : 0, wrong: ok ? 0 : 1, seen: 1, last: ok, due: ok ? null : "2026-11-08" }; });
    st.sessions.push({ mode: "mock", date: "2026-11-10", parts: [{ section: "Verbal", correct: 49, total: 60 }, { section: "Quantitative", correct: 33, total: 52 }, { section: "Reading", correct: 50, total: 62 }] });
    localStorage.setItem("hspt-sprint-v1", JSON.stringify(st)); });
}
async function shot(page, name, frame = 1) { await page.waitForTimeout(250); await page.screenshot({ path: `${OUT}/${name}.png` }); for (let k = 0; k < frame; k++) await page.screenshot({ path: `${OUT}/frames/${String(f++).padStart(3, "0")}.png` }); }
for (const [tag, vp] of [["desktop", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: tag === "phone" ? 2 : 1 }); const page = await ctx.newPage();
  const g = tag === "desktop"; const fr = (n) => (g ? n : 0);
  await seed(page, "2026-11-08"); await page.goto(`${BASE}/sprint/?today=2026-11-08`);
  await shot(page, `${tag}-01-today`, fr(3));
  await page.click("a[href='#plan']"); await shot(page, `${tag}-02-plan`, fr(3));
  await page.click("a[href='#home']"); await page.locator(".btn.set").first().click(); await shot(page, `${tag}-03-question`, fr(2));
  const qid = await page.locator(".qcard").getAttribute("data-qid"); const key = await page.evaluate((id) => HS.bank.items.find((q) => q.id === id).answer, qid);
  await page.locator(".choice").nth((key + 1) % 4).click(); await shot(page, `${tag}-04-feedback-miss`, fr(3));
  await page.goto(`${BASE}/sprint/?today=2026-11-08&r=${Math.random()}#home`); await page.click("[data-review]"); await shot(page, `${tag}-05-spaced-review`, fr(2));
  await page.goto(`${BASE}/sprint/?today=2026-11-06&r=${Math.random()}#home`); await page.locator(".btn.set", { hasText: "Reading" }).click(); await shot(page, `${tag}-06-reading-passage`, fr(2));
  await page.goto(`${BASE}/sprint/?today=2026-11-08&r=${Math.random()}#dash`); await shot(page, `${tag}-07-weak-spots`, fr(3));
  await page.click("a[href='#mock']"); await shot(page, `${tag}-08-mock-intro`, fr(2));
  await page.click("[data-mock]"); for (let k = 0; k < 7; k++) await page.locator(".choice").first().click(); await shot(page, `${tag}-09-mock-running`, fr(2));
  await page.click("[data-quit]"); await shot(page, `${tag}-10-mock-break`, fr(1));
  await page.goto(`${BASE}/sprint/?today=2026-11-08&r=${Math.random()}#sheet`); await shot(page, `${tag}-11-answer-sheet`, fr(2));
  await ctx.close();
}
await browser.close(); console.log("frames", f);
