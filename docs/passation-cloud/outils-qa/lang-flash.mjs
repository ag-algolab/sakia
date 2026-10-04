// Quand la langue gardée est la darija : que voit-on avant que la page ne bascule ?
import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox"] });
for (const rate of [1, 4]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  await ctx.addInitScript(() => localStorage.setItem("sakia-lang", "aeb"));
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  await page.addInitScript(() => {
    window.__log = [];
    const snap = (why) => window.__log.push({ t: Math.round(performance.now()), why, lang: document.documentElement.lang, dir: document.documentElement.dir, h1: document.querySelector("h1")?.textContent?.slice(0, 28), vis: document.body ? getComputedStyle(document.body).visibility : "?" });
    new MutationObserver(() => snap("mutation")).observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["lang", "dir"] });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) snap(e.name); }).observe({ type: "paint", buffered: true });
  });
  await page.goto("http://localhost:3100/", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const log = await page.evaluate(() => window.__log);
  const compact = [];
  let last = "";
  for (const e of log) { const k = `${e.lang}|${e.dir}|${e.h1}|${e.vis}`; if (k !== last) { compact.push(`${e.t} ms lang=${e.lang} dir=${e.dir} h1="${e.h1}" visibilité=${e.vis}`); last = k; } }
  console.log(`CPU ×${rate} :`); console.log("  " + compact.join("\n  "));
  await ctx.close();
}
await browser.close();
