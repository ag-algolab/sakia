import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox"] });
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis" }).format(new Date());
for (const [name, seed] of [["premier visiteur", null], ["profil complet", { region: "kairouan", crop: "olivier", soil: "limoneux", system: "goutte", planting: "", agoDate: today, ago: "0" }]]) {
  for (const [vp, opts] of [["mobile", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }], ["bureau", { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 }]]) {
    const ctx = await browser.newContext({ ...opts, serviceWorkers: "block" });
    if (seed) await ctx.addInitScript((p) => localStorage.setItem("sakia-form", JSON.stringify(p)), seed);
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.addInitScript(() => {
      window.__shifts = [];
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput && e.value > 0.005) window.__shifts.push({ t: Math.round(e.startTime), v: +e.value.toFixed(3), src: e.sources.map((s) => (s.node?.nodeName ?? "?") + "." + String(s.node?.className ?? "").toString().split(" ").slice(0, 3).join(".") + "#" + (s.node?.id ?? "")).slice(0, 3) }); }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto("http://localhost:3100/?lang=fr", { waitUntil: "load" });
    await page.waitForTimeout(3500);
    const sh = await page.evaluate(() => window.__shifts);
    const total = sh.reduce((a, b) => a + b.v, 0);
    console.log(`${name} · ${vp} : CLS ${total.toFixed(3)}`);
    for (const s of sh) console.log("   ", s.t + " ms", s.v, s.src.join(" | "));
    await ctx.close();
  }
}
await browser.close();
