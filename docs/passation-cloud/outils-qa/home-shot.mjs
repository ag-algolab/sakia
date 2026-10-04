import { chromium } from "playwright-core";
import fs from "node:fs";
const BASE = process.env.BASE || "http://localhost:3100";
const OUT = "./qa-out/home";
fs.mkdirSync(OUT, { recursive: true });
const tag = process.env.TAG || "after";
const cases = [
  { lang: "en", w: 1280, h: 800 }, { lang: "fr", w: 1440, h: 900 }, { lang: "en", w: 1920, h: 1000 }, { lang: "ar", w: 1280, h: 800 }, { lang: "en", w: 390, h: 844, mobile: true }, { lang: "fr", w: 390, h: 844, mobile: true },
];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox"] });
for (const c of cases) {
  const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, serviceWorkers: "block", isMobile: !!c.mobile, hasTouch: !!c.mobile });
  await ctx.addInitScript(([l]) => { localStorage.setItem("sakia-lang", l); localStorage.setItem("sakia-form", JSON.stringify({ region: "kairouan", crop: "olivier", soil: "limoneux", system: "goutte", planting: "", agoDate: "" })); }, [c.lang]);
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(3000);
  const m = await page.evaluate(() => {
    const vis = (el) => el && el.getClientRects().length > 0;
    const h1 = [...document.querySelectorAll("h1")].find(vis);
    const p = h1?.parentElement?.querySelector("p:not(:first-child)") ?? null;
    const lines = (el) => (el ? Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)) : null);
    const tag = h1?.parentElement?.querySelector("p");
    return { h1: h1?.textContent, h1lines: lines(h1), h1w: Math.round(h1?.getBoundingClientRect().width ?? 0), sub: p?.textContent?.slice(0, 40), sublines: lines(p), subw: Math.round(p?.getBoundingClientRect().width ?? 0), chip: tag?.textContent, docW: document.documentElement.scrollWidth };
  });
  console.log(`${c.lang} ${c.w}x${c.h}`, JSON.stringify(m));
  await page.screenshot({ path: `${OUT}/${tag}-${c.lang}-${c.w}x${c.h}.png` });
  await ctx.close();
}
await browser.close();
