import { chromium } from "playwright-core";
const BASE = process.env.BASE || "http://localhost:3100";
const pages = ["/", "/backtest", "/about", "/bulletin", "/phone", "/telegram", "/call", "/offline"];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
await ctx.addInitScript(() => {
  localStorage.setItem("sakia-lang", "en");
  localStorage.setItem("sakia-form", JSON.stringify({ region: "kairouan", crop: "olivier", soil: "limoneux", system: "goutte", planting: "", agoDate: "" }));
});
for (const p of pages) {
  const page = await ctx.newPage();
  await page.goto(BASE + p, { waitUntil: "load" });
  await page.waitForTimeout(3500);
  const text = await page.evaluate(() => document.body.innerText);
  const hits = new Set();
  for (const m of text.matchAll(/[^\n.]{0,70}(\d[\d.,  ]*\s?(%|×|x\b|million|km³| times))[^\n.]{0,50}/gi)) hits.add(m[0].trim().replace(/\s+/g, " "));
  console.log(`\n##### ${p} (${hits.size})`);
  for (const h of hits) console.log("  -", h);
  await page.close();
}
await browser.close();
