import { chromium } from "playwright-core";
import fs from "node:fs";
const BASE = process.env.BASE || "http://localhost:3100";
const OUT = process.env.OUT || "./qa-out/proof";
fs.mkdirSync(OUT, { recursive: true });
const lang = process.env.LANG_UI || "fr";
const crop = process.env.CROP || "olivier";
const sizes = (process.env.SIZES || "1440x900").split(",").map((s) => s.split("x").map(Number));
const tag = process.env.TAG || "before";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox"] });
for (const [w, h] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: "block" });
  await ctx.addInitScript(([l, c]) => {
    localStorage.setItem("sakia-lang", l);
    localStorage.setItem("sakia-form", JSON.stringify({ region: "kairouan", crop: c, soil: "limoneux", system: "goutte", planting: "", agoDate: "" }));
  }, [lang, crop]);
  const page = await ctx.newPage();
  await page.goto(BASE + "/backtest", { waitUntil: "load" });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${OUT}/${tag}-${lang}-${crop}-${w}x${h}-top.png` });
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 350) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(250); }
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${tag}-${lang}-${crop}-${w}x${h}-full.png`, fullPage: true });
  const m = await page.evaluate(() => {
    const h1 = document.querySelector("h1");
    const r = h1.getBoundingClientRect();
    const lh = parseFloat(getComputedStyle(h1).lineHeight);
    return { h1w: Math.round(r.width), h1h: Math.round(r.height), lines: Math.round(r.height / lh), font: getComputedStyle(h1).fontSize, docW: document.documentElement.scrollWidth };
  });
  console.log(`${w}x${h}`, JSON.stringify(m));
  await ctx.close();
}
await browser.close();
