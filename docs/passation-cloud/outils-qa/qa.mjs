// Contrôle qualité de l'interface : captures + vérifications automatiques (hors dépôt).
// Usage : node qa.mjs [--pages /,/about] [--langs en,ar] [--vps mobile,desktop] [--tag nom]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");

const arg = (name, def) => {
  const i = process.argv.indexOf("--" + name);
  return i > -1 ? process.argv[i + 1] : def;
};
const BASE = arg("base", "http://localhost:3100");
const TAG = arg("tag", "run");
const OUT = path.join(process.cwd(), "shots", TAG);
fs.mkdirSync(OUT, { recursive: true });

const PAGES = arg("pages", "/,/backtest,/bulletin,/phone,/about,/call,/offline,/call/talk").split(",");
const LANGS = arg("langs", "en,fr,aeb,ar").split(",");
const VPS = arg("vps", "mobile,desktop").split(",");
// Les pages secondaires ne sont vues que dans un sous-ensemble (en + ar), la page d'accueil dans tout.
const FULL_MATRIX_PAGES = new Set(["/"]);

const VIEWPORTS = {
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
  narrow: { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tiny: { viewport: { width: 320, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

const slug = (p) => (p === "/" ? "home" : p.replace(/^\//, "").replace(/\//g, "-"));

async function autoscroll(page) {
  await page.evaluate(async () => {
    const step = Math.max(300, Math.floor(window.innerHeight * 0.7));
    for (let y = 0; y < document.documentElement.scrollHeight + step; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 400));
  });
}

const inPage = {
  overflow: () => {
    const vw = document.documentElement.clientWidth;
    const sw = document.documentElement.scrollWidth;
    const offenders = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (getComputedStyle(el).position === "fixed") continue;
      if (r.right > vw + 1 || r.left < -1) {
        let p = el.parentElement;
        let clipped = false;
        while (p && p !== document.body) {
          if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) {
            clipped = true;
            break;
          }
          p = p.parentElement;
        }
        if (!clipped)
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: String(el.className?.baseVal ?? el.className ?? "").slice(0, 70),
            text: (el.textContent || "").trim().slice(0, 40),
            left: Math.round(r.left),
            right: Math.round(r.right),
          });
      }
    }
    return { vw, sw, scrolls: sw > vw + 1, offenders: offenders.slice(0, 12) };
  },
  smallTargets: () =>
    [...document.querySelectorAll("a, button, select, input:not([type=hidden]), summary, [role=button], [role=radio], [role=tab]")]
      .map((el) => ({ el, r: el.getBoundingClientRect(), cs: getComputedStyle(el) }))
      .filter(({ r, cs }) => r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && (r.height < 40 || r.width < 40))
      .map(({ el, r }) => ({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || el.getAttribute("aria-label") || el.getAttribute("title") || "").trim().slice(0, 30),
        w: Math.round(r.width),
        h: Math.round(r.height),
      }))
      .slice(0, 15),
  structure: () => ({
    htmlLang: document.documentElement.lang,
    htmlDir: document.documentElement.dir,
    title: document.title,
    mains: document.querySelectorAll("main").length,
    h1: [...document.querySelectorAll("h1")].map((h) => h.textContent.trim().slice(0, 60)),
    headings: [...document.querySelectorAll("h1,h2,h3,h4")].map((h) => h.tagName + ":" + h.textContent.trim().slice(0, 40)),
    imgNoAlt: [...document.querySelectorAll("img:not([alt])")].length,
  }),
};

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox"] });

const report = [];
for (const pg of PAGES) {
  for (const lang of LANGS) {
    for (const vpName of VPS) {
      if (!FULL_MATRIX_PAGES.has(pg) && !(lang === "en" || lang === "ar")) continue;
      if (!FULL_MATRIX_PAGES.has(pg) && vpName === "desktop" && lang === "ar") continue;
      const ctx = await browser.newContext({ ...VIEWPORTS[vpName], serviceWorkers: "block", locale: lang === "fr" ? "fr-FR" : lang === "en" ? "en-GB" : "ar-TN" });
      const page = await ctx.newPage();
      const consoleMsgs = [];
      const failed = [];
      page.on("console", (m) => {
        if (m.type() === "error" || m.type() === "warning") consoleMsgs.push(`${m.type()}: ${m.text().slice(0, 200)}`);
      });
      page.on("pageerror", (e) => consoleMsgs.push("pageerror: " + String(e).slice(0, 200)));
      page.on("response", (r) => {
        if (r.status() >= 400) failed.push(`${r.status()} ${r.url().replace(BASE, "")}`);
      });
      const sep = pg.includes("?") ? "&" : "?";
      const entry = { page: pg, lang, vp: vpName };
      try {
        await page.goto(`${BASE}${pg}${sep}lang=${lang}`, { waitUntil: "networkidle", timeout: 30000 });
        if (pg === "/") await page.waitForSelector("#plan-title, [role=alert]", { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(500);
        await autoscroll(page);
        const file = `${slug(pg)}-${lang}-${vpName}.png`;
        await page.screenshot({ path: path.join(OUT, file), fullPage: true });
        entry.shot = file;
        entry.structure = await page.evaluate(inPage.structure);
        entry.overflow = await page.evaluate(inPage.overflow);
        entry.smallTargets = await page.evaluate(inPage.smallTargets);
        await page.addScriptTag({ path: axePath });
        const axe = await page.evaluate(async () => {
          const res = await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "best-practice"] });
          return res.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            n: v.nodes.length,
            targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ").slice(0, 90)),
            fail: v.nodes.slice(0, 1).map((n) => (n.any[0]?.message ?? n.all[0]?.message ?? "").slice(0, 140)),
          }));
        });
        entry.axe = axe;
      } catch (e) {
        entry.error = String(e).slice(0, 300);
      }
      entry.console = [...new Set(consoleMsgs)].slice(0, 8);
      entry.failedRequests = [...new Set(failed)].slice(0, 8);
      report.push(entry);
      await ctx.close();
      process.stdout.write(`${entry.error ? "✗" : "✓"} ${pg} ${lang} ${vpName}\n`);
    }
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 1));
console.log("rapport :", path.join(OUT, "report.json"), `(${report.length} vues)`);
