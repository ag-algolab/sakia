// Sous-titres du bouton d'écoute : vraie route /api/advice (stockage simulé), vrai navigateur, quatre langues d'écran.
import { chromium } from "playwright-core";
const BASE = process.env.BASE || "http://localhost:3110";
const OUT = process.env.OUT || "./qa-out/subs";
import fs from "node:fs";
fs.mkdirSync(OUT, { recursive: true });
const langs = (process.env.LANGS || "en,fr,ar,aeb").split(",");
const viewports = { desktop: { width: 1280, height: 900 }, mobile: { width: 390, height: 844 } };
const vp = process.env.VP || "desktop";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required", "--mute-audio"] });
for (const lang of langs) {
  const ctx = await browser.newContext({ viewport: viewports[vp], serviceWorkers: "block", isMobile: vp === "mobile", hasTouch: vp === "mobile" });
  await ctx.addInitScript(([l]) => {
    localStorage.setItem("sakia-lang", l);
    localStorage.setItem("sakia-form", JSON.stringify({ region: "kairouan", crop: "olivier", soil: "limoneux", system: "goutte", planting: "", agoDate: "" }));
  }, [lang]);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 200)); });
  const adviceCalls = [];
  const bad = [];
  page.on("response", (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url().replace(BASE, "")}`); });
  page.on("response", async (r) => {
    if (!r.url().includes("/api/advice")) return;
    const h = r.headers();
    adviceCalls.push({ url: r.url().replace(BASE, ""), status: r.status(), level: h["x-advice-level"], today: h["x-advice-today"], subsBytes: (h["x-advice-subs"] || "").length });
  });
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForSelector("#listen button", { timeout: 20000 });
  await page.waitForTimeout(2500); // laisse le chargement d'avance se faire
  const strip = page.locator('#listen [role="group"]');
  console.log(`\n=== langue d'écran : ${lang} (${vp}) ===`);
  console.log("avant l'appui, bande de sous-titres présente :", await strip.count());
  const t0 = Date.now();
  await page.locator("#listen button").first().click();
  let last = "";
  const notInView = [];
  const seen = [];
  let shot1 = false, shot2 = false;
  for (let i = 0; i < 70; i++) {
    await page.waitForTimeout(500);
    const n = await strip.count();
    const text = n ? (await strip.locator("p").first().innerText()).replace(/\s+/g, " ") : "";
    if (n) {
      const r = await strip.evaluate((el) => { const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), vh: innerHeight }; });
      const inView = r.top >= 0 && r.bottom <= r.vh;
      if (!inView) notInView.push(`${Date.now() - t0} ms : bande ${r.top}–${r.bottom} pour un écran de ${r.vh}`);
    }
    const st = Date.now() - t0;
    if (text !== last) { seen.push({ ms: st, text }); last = text; }
    if (n && !shot1 && st > 3500) { await page.screenshot({ path: `${OUT}/${lang}-${vp}-a.png` }); shot1 = true; }
    if (n && !shot2 && st > 12000) { await page.screenshot({ path: `${OUT}/${lang}-${vp}-b.png` }); shot2 = true; }
    if (!n && seen.length > 1) break;
  }
  for (const s of seen) console.log(`  ${String(s.ms).padStart(6)} ms  ${s.text || "(bande retirée)"}`);
  console.log("bande entièrement visible à chaque instant :", notInView.length === 0 ? "oui" : "NON " + JSON.stringify(notInView.slice(0, 3)));
  console.log("appels /api/advice :", JSON.stringify(adviceCalls));
  console.log("réponses en erreur :", bad.length ? bad : "aucune");
  console.log("erreurs :", errors.length ? errors : "aucune");
  await ctx.close();
}
await browser.close();
