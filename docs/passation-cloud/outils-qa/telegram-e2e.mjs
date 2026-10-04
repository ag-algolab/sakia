// Parcours complet du chat /telegram dans un vrai navigateur (hors dépôt).
// Usage : node telegram/e2e.mjs [--base http://localhost:3103] [--vp mobile|tiny|desktop] [--lang fr] [--tag nom]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const arg = (n, d) => {
  const i = process.argv.indexOf("--" + n);
  return i > -1 ? process.argv[i + 1] : d;
};
const BASE = arg("base", "http://localhost:3103");
const VP = arg("vp", "mobile");
const LANG = arg("lang", "fr");
const TAG = arg("tag", "e2e");
const OUT = path.join(process.cwd(), "shots", TAG);
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = {
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tiny: { viewport: { width: 320, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  narrow: { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
};

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ ...VIEWPORTS[VP], serviceWorkers: "block", locale: LANG === "fr" ? "fr-FR" : LANG === "en" ? "en-GB" : "ar-TN" });
const page = await ctx.newPage();
const problems = [];
const apiCalls = [];
page.on("console", (m) => {
  if ((m.type() === "error" || m.type() === "warning") && !/Service Worker/.test(m.text())) problems.push(`${m.type()}: ${m.text().slice(0, 200)}`);
});
page.on("pageerror", (e) => problems.push("pageerror: " + String(e).slice(0, 200)));
page.on("request", (r) => {
  if (r.url().includes("/api/telegram/sim")) apiCalls.push({ body: r.postData() });
});

let step = 0;
const frame = () => page.locator("xpath=//*[@role='log']/ancestor::div[contains(@class,'max-w-[22rem]')]").first();
const log = () => page.locator("[role=log]");
const shot = async (name) => {
  step++;
  const f = `${String(step).padStart(2, "0")}-${name}.png`;
  await frame().screenshot({ path: path.join(OUT, f) });
  console.log("  📷", f);
};
const idle = () => page.waitForSelector("[role=log][aria-busy=false]", { timeout: 30000 });
const bubbles = () => page.locator("[data-bubble]").count();
const lastText = async () => (await page.locator("[data-bubble]").last().innerText()).replace(/\s+/g, " ").slice(0, 160);
const click = async (text, opts = {}) => {
  const b = log().getByRole("button", { name: text, exact: opts.exact ?? false }).last();
  await b.scrollIntoViewIfNeeded();
  await b.click();
  await idle();
};
let failures = 0;
const check = (ok, label) => {
  if (!ok) failures++;
  console.log(`${ok ? "OK  " : "FAIL"} ${label}`);
};

await page.goto(`${BASE}/telegram?lang=${LANG}`, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.removeItem("sakia.telegram.v1"));
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);
await frame().scrollIntoViewIfNeeded();
await shot("accueil");
check((await bubbles()) === 1, "un seul message d'accueil au départ");

// 1. langue
await click("Français");
check((await bubbles()) === 1, "langue : la bulle est REMPLACÉE (edit), pas dupliquée");
check(/région|gouvernorat/i.test(await lastText()), "langue → question « région » (" + (await lastText()).slice(0, 50) + ")");
await shot("region");

// 2. région
await click("Kairouan");
check((await bubbles()) === 1 && /culture/i.test(await lastText()), "région → question « culture »");
await shot("culture");

// 3. culture
await click("Olivier");
check((await bubbles()) === 1 && /arrosage/i.test(await lastText()), "culture → question « dernier arrosage »");
await shot("arrosage");

// 4. dernier arrosage → plan
const t0 = Date.now();
await click("1-2 jours");
check((await bubbles()) === 2, "arrosage → bulle « ✅ Olivier · Kairouan » puis le plan (2 bulles)");
await page.waitForTimeout(300);
await shot("plan");
const planTxt = await page.locator("[data-bubble]").last().innerText();
check(/indicatif/i.test(planTxt), "le plan affiche « conseil indicatif »");

// 5. mettre à jour (même texte : « Déjà à jour »)
await click("Mettre à jour");
const toast = await page.locator("[role=status]").innerText();
check(/Déjà à jour/.test(toast), "« Mettre à jour » sans changement → petit message « Déjà à jour » (" + toast + ")");
await shot("deja-a-jour");

// 6. j'ai arrosé aujourd'hui
await click("J'ai arrosé");
check(/Noté/.test(await page.locator("[role=status]").innerText()), "« J'ai arrosé » → petit message « Noté »");

// 7. changer de langue : saisie de /langue puis bouton arabe
await log().scrollIntoViewIfNeeded();
await page.getByLabel(/Votre message|Your message/).fill("/langue");
await page.keyboard.press("Enter");
await idle();
check((await bubbles()) >= 4, "saisie « /langue » : bulle « vous » puis réponse du bot");
await click("العربية");
await page.waitForTimeout(500);
await shot("plan-arabe");
const ar = await page.locator("[data-bubble]").last().innerText();
check(/[؀-ۿ]/.test(ar), "après changement de langue : plan en arabe");
const dirs = await page.locator("[data-bubble]").last().locator("[dir=auto]").evaluateAll((els) => els.slice(0, 3).map((e) => getComputedStyle(e).direction));
check(dirs.includes("rtl"), "lignes arabes : direction rtl (" + dirs.join(",") + ")");

// 8. texte libre
await page.getByLabel(/Votre message|Your message/).fill("zitoun kairouan");
await page.keyboard.press("Enter");
await idle();
await page.waitForTimeout(400);
await shot("zitoun-kairouan");
check(/[؀-ۿ]/.test(await lastText()), "« zitoun kairouan » → un plan");

// 9. /start puis recommencer
await page.getByRole("button", { name: /Envoyer la commande \/start/ }).click();
await idle();
await shot("start");
const n = await bubbles();
await page.getByRole("button", { name: /Recommencer/ }).last().click();
await page.waitForTimeout(300);
check((await bubbles()) === 1, `« Recommencer » : retour à 1 bulle (avant : ${n})`);
await shot("recommence");

// 10. rechargement : l'état doit revenir
await click("English");
await click("Sfax");
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);
check(/crop/i.test(await lastText()), "après rechargement, la conversation est reprise (" + (await lastText()).slice(0, 40) + ")");
await shot("reprise");

// axe sur la page à la fin
await page.addScriptTag({ path: axePath });
const axeAll = await page.evaluate(async () =>
  (await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "best-practice"] })).violations.map((v) => ({ id: v.id, n: v.nodes.length, first: v.nodes[0].target.join(" ").slice(0, 80), htmls: v.nodes.map((x) => x.html.slice(0, 60)) })),
);
// les <nav aria-label="Sakia"> en double de l'en-tête et du pied de page (fichiers du site) ne viennent pas de cette page
const globalNav = axeAll.filter((v) => v.id === "landmark-unique" && v.htmls.every((h) => /^<nav aria-label="Sakia"/.test(h)));
const axe = axeAll.filter((v) => !globalNav.includes(v)).map((v) => `${v.id} (${v.n}) ${v.first}`);
check(axe.length === 0, "axe : aucune violation de la page en fin de parcours " + JSON.stringify(axe) + (globalNav.length ? "  [hors périmètre : landmark-unique des <nav> d'en-tête et de pied de page]" : ""));

// aucun appel n'envoie de choses étranges
check(apiCalls.every((c) => (c.body ?? "").length < 2000), `${apiCalls.length} appels, tous < 2 Ko`);
console.log(problems.length ? "console : " + problems.join(" | ") : "console : propre");
console.log(`durée ${(Date.now() - t0) / 1000}s ;`, failures ? `${failures} échec(s)` : "tout est bon");
await browser.close();
process.exitCode = failures ? 1 : 0;
