// Minimal Chrome DevTools Protocol driver (Node 20: run with --experimental-websocket).
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch(port = 9444) {
  const prof = mkdtempSync(join(tmpdir(), "hqcdp-"));
  const proc = spawn("google-chrome", ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`,
    `--user-data-dir=${prof}`, "--window-size=1280,800", "about:blank"], { stdio: "ignore" });
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {}
  }
  if (!target) throw new Error("chrome did not start");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
  let id = 0; const pending = new Map(); const errors = [];
  ws.addEventListener("message", (m) => {
    const j = JSON.parse(m.data);
    if (j.id && pending.has(j.id)) { pending.get(j.id)(j); pending.delete(j.id); }
    if (j.method === "Runtime.exceptionThrown") errors.push(j.params.exceptionDetails.exception?.description || j.params.exceptionDetails.text);
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, (j) => r(j.result || {})); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Runtime.enable"); await send("Page.enable");
  const ev = async (expr) => {
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error("eval failed: " + expr.slice(0, 80) + " :: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result?.value;
  };
  const viewport = (w, h, mobile = false) => send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile });
  const goto = async (url, wait = 1200) => { await send("Page.navigate", { url }); await sleep(wait); };
  const shot = async (path) => {
    const { writeFileSync } = await import("node:fs");
    const r = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(path, Buffer.from(r.data, "base64"));
  };
  const close = async () => { try { ws.close(); } catch {} proc.kill(); await sleep(300); rmSync(prof, { recursive: true, force: true }); };
  return { send, ev, viewport, goto, shot, close, errors };
}
