// Playwright: drives the sprint like a student. Synthetic student name only ("Alex").
import { test, expect } from "@playwright/test";
const U = (day, extra = "") => `/sprint/?today=${day}${extra}`;
async function fresh(page, day = "2026-11-05") { await page.goto(U(day)); await page.evaluate(() => localStorage.clear()); await page.goto(U(day)); await expect(page.locator(".count")).toBeVisible(); }
async function answerAll(page, pickRight) {
  while (await page.locator(".choice").count()) {
    const qid = await page.locator(".qcard").getAttribute("data-qid");
    const key = await page.evaluate((id) => HS.bank.items.find((q) => q.id === id).answer, qid);
    const n = await page.locator(".choice").count();
    await page.locator(".choice").nth(pickRight(qid) ? key : (key + 1) % n).click();
    const nx = page.locator("[data-next]"); if (await nx.count()) await nx.click();
  }
}

test("home shows 12-day countdown and day 1 sets at real pace", async ({ page }) => {
  await fresh(page);
  await expect(page.locator(".count")).toHaveAttribute("data-days-left", "12");
  await expect(page.locator(".kicker")).toContainText("Day 1 of 12");
  await expect(page.locator(".btn.set")).toHaveCount(2);
  await expect(page.locator(".btn.set").first()).toContainText("15 questions · 4:00");
  await expect(page.locator(".sname")).toHaveText("Alex");
});
test("plan lists 12 days plus test day, with mocks", async ({ page }) => {
  await fresh(page); await page.click("a[href='#plan']");
  await expect(page.locator(".pday")).toHaveCount(13);
  await expect(page.locator(".pday.full-mock")).toContainText("Nov 13");
  await expect(page.locator(".pday.test")).toContainText("298 questions · 141 minutes");
});
test("mini-set: feedback, misses enter spaced review due tomorrow", async ({ page }) => {
  await fresh(page);
  await page.locator(".btn.set").first().click();
  await expect(page.locator(".clock")).toHaveText(/^[34]:\d\d$/);
  let i = 0; await answerAll(page, () => i++ % 3 !== 0);
  await expect(page.locator(".results h2")).toHaveText("10 / 15");
  await expect(page.locator(".miss li")).toHaveCount(5);
  await page.goto(U("2026-11-06"));
  await expect(page.locator(".due-n")).toHaveText("5");
  await page.click("[data-review]");
  await answerAll(page, () => true);
  await expect(page.locator(".results h2")).toHaveText("5 / 5");
  await page.goto(U("2026-11-06")); await expect(page.locator(".due-n")).toHaveText("0");
  await page.goto(U("2026-11-08")); await expect(page.locator(".due-n")).toHaveText("5");
});
test("weakness dashboard ranks the missed section's skills first and drills them", async ({ page }) => {
  await fresh(page);
  await page.locator(".btn.set", { hasText: "Quantitative" }).click();
  await answerAll(page, () => false);
  await page.click("a[href='#dash']");
  await expect(page.locator(".wrow").first()).toContainText("Quantitative");
  await expect(page.locator(".wrow").first().locator(".wnum")).toContainText("0%");
  await page.locator(".wrow").first().locator("[data-drill]").click();
  await expect(page.locator(".rlabel")).toContainText("Drill:");
});
test("weak-spot day (Nov 14) targets the weakest sections", async ({ page }) => {
  await fresh(page);
  await page.locator(".btn.set", { hasText: "Verbal" }).click();
  await answerAll(page, () => false);
  await page.goto(U("2026-11-14"));
  await expect(page.locator(".hero h2")).toContainText("Weak-spot day");
  await expect(page.locator(".btn.set").first()).toContainText("Verbal");
});
test("timer runs out and ends the set", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-05T16:00:00") });
  await fresh(page);
  await page.locator(".btn.set").first().click();
  await page.clock.runFor(241000);
  await expect(page.locator(".results h2")).toContainText("Time!");
  await expect(page.locator(".results p").first()).toContainText("left blank");
});
test("full mock: real section sizes, section breaks, results table", async ({ page }) => {
  await fresh(page); await page.click("a[href='#mock']");
  await expect(page.locator(".fmt tr.tot")).toContainText("298");
  await page.click("[data-mock]");
  const sizes = [];
  for (const sec of ["Verbal", "Quantitative", "Reading", "Mathematics", "Language"]) {
    await expect(page.locator(".rlabel")).toHaveText(sec);
    sizes.push(await page.locator(".rprog").textContent());
    // answer 3 then end the section early
    for (let k = 0; k < 3; k++) await page.locator(".choice").first().click();
    await page.click("[data-quit]");
    if (sec !== "Language") await page.click("#nextsec");
  }
  expect(sizes).toEqual(["1 / 60", "1 / 52", "1 / 62", "1 / 64", "1 / 60"]);
  await expect(page.locator(".results h2")).toContainText("/ 298");
  await expect(page.locator(".results tr")).toHaveCount(6);
});
test("mock has no instant feedback (like the real test)", async ({ page }) => {
  await fresh(page); await page.click("a[href='#mock']"); await page.click("[data-mock]");
  await page.locator(".choice").first().click();
  await expect(page.locator(".rprog")).toHaveText("2 / 60");
  await expect(page.locator(".fb")).toHaveCount(0);
});
test("printable answer sheet has 298 rows with A-D bubbles and the student name", async ({ page }) => {
  await fresh(page); await page.click("a[href='#sheet']");
  await expect(page.locator(".srow")).toHaveCount(298);
  await expect(page.locator(".srow").last()).toContainText("298");
  await expect(page.locator(".srow").first().locator(".bub")).toHaveCount(4);
  await expect(page.locator(".shead")).toContainText("Alex");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".noprint")).toBeHidden();
});
test("keyboard: A-D answers, Enter advances", async ({ page }) => {
  await fresh(page); await page.locator(".btn.set").first().click();
  await page.keyboard.press("b"); await expect(page.locator(".fb")).toBeVisible();
  await page.keyboard.press("Enter"); await expect(page.locator(".rprog")).toHaveText("2 / 15");
});
test("progress persists across reloads", async ({ page }) => {
  await fresh(page); await page.locator(".btn.set").first().click(); await answerAll(page, () => true);
  await page.reload(); await expect(page.locator(".kicker")).toContainText("done");
});
test("phone layout has no horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const h of ["home", "plan", "dash", "mock", "sheet"]) {
    await fresh(page); await page.goto(U("2026-11-05") + "#" + h);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(over, h).toBeLessThanOrEqual(1);
  }
});
test("test day and before-sprint states", async ({ page }) => {
  await fresh(page, "2026-11-17"); await expect(page.locator(".hero h2")).toContainText("Test day");
  await fresh(page, "2026-11-02"); await expect(page.locator(".hero h2")).toContainText("Sprint starts");
});
