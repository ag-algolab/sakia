// Parcours complet du téléphone à touches (hors dépôt) : choix, arrivée du SMS, réponses par touches, appel simulé.
// Usage : node phone/flow.mjs [--lang fr] [--vp mobile|desktop|tiny] [--tag nom] [--base http://localhost:3102]
import { chromium } from "playwright-core";
import { choose } from "./pick.mjs";
import fs from "node:fs";
import path from "node:path";

const arg = (n, d) => {
  const i = process.argv.indexOf("--" + n);
  return i > -1 ? process.argv[i + 1] : d;
};
const BASE = arg("base", "http://localhost:3102");
const LANG = arg("lang", "fr");
const VP = arg("vp", "mobile");
const TAG = arg("tag", "phone-flow");
const REGION = arg("region", "kairouan");
const CROP = arg("crop", "tomate");
const OUT = path.join(process.cwd(), "shots", TAG);
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = {
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
  tiny: { viewport: { width: 320, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ ...VIEWPORTS[VP], serviceWorkers: "block", locale: LANG === "fr" ? "fr-FR" : LANG === "en" ? "en-GB" : "ar-TN" });
const page = await ctx.newPage();
const logs = [];
page.on("console", (m) => (m.type() === "error" ? logs.push("console.error: " + m.text().slice(0, 200)) : null));
page.on("pageerror", (e) => logs.push("pageerror: " + String(e).slice(0, 200)));
const api = [];
page.on("response", async (r) => {
  if (r.url().includes("/api/sms/incoming")) {
    let body = "";
    try {
      body = (await r.text()).slice(0, 200);
    } catch {}
    api.push(`${r.status()} ${body}`);
  }
});

const shot = async (name, full = false) => {
  await page.screenshot({ path: path.join(OUT, `${LANG}-${VP}-${name}.png`), fullPage: full });
};
const shotPhone = async (name) => {
  await page.locator('[role="group"][class*="body"]').first().screenshot({ path: path.join(OUT, `${LANG}-${VP}-${name}.png`) });
};
const lcdText = async () => (await page.locator('[class*="lcd"]').first().innerText().catch(() => "")).replace(/\n+/g, " | ");

await page.goto(`${BASE}/phone?lang=${LANG}`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
console.log("1 initial LCD:", await lcdText());
await shot("01-initial", true);

// bouton sans choix : doit afficher les erreurs et mettre le focus sur la région
await page.getByRole("button", { name: /6 h|6 a\.m\.|السادسة/ }).click();
await page.waitForTimeout(300);
console.log("2 focus after click without choice:", await page.evaluate(() => document.activeElement?.closest('[id$="-q"]')?.id));
await shot("02-needchoice");

await choose(page, LANG, REGION, CROP);
await page.waitForTimeout(500);
await shotPhone("03-chosen-idle");
console.log("3 LCD after choice:", await lcdText());
await page.waitForTimeout(3300); // 2.5 s auto + horloge
await shotPhone("04-arriving");
console.log("4 LCD:", await lcdText());
await page.waitForTimeout(2600);
await shotPhone("05-message");
console.log("5 LCD:", await lcdText());

let failures = 0;
const check = (ok, label) => {
  if (!ok) failures++;
  console.log(`${ok ? "OK  " : "FAIL"} ${label}`);
};
// la légende de l'écran du message : 1 Aide, 2 Langue, 3 Stop (plus de touche Pluie)
const legend = await lcdText();
check(/Aide|Help|مساعدة/.test(legend) && !/Pluie|Rain|مطر/.test(legend), "légende du message : Aide, Langue, Stop, sans Pluie : " + legend);
// les sous-titres sous les touches 1 à 4 : 4 n'a plus de légende
const sub = async (k) => (await page.getByRole("button", { name: new RegExp(`^${k}( |$)`) }).first().getAttribute("aria-label")) ?? "";
check(/^1 /.test(await sub(1)) && /^2 /.test(await sub(2)) && /^3 /.test(await sub(3)) && (await sub(4)) === "4", "touches 1, 2 et 3 légendées, 4 sans légende : " + [await sub(1), await sub(2), await sub(3), await sub(4)].join(" / "));
const list = await page.locator("#keys-title").locator("xpath=..").innerText();
check(!/Pluie|rain|مطر|signalement|report/i.test(list), "liste « Répondre avec les touches » sans pluie");

// touches : 1 aide
await page.getByRole("button", { name: /^1( |$)/ }).first().click();
await page.waitForTimeout(2200);
await shotPhone("06-help-reply");
const help = await lcdText();
console.log("6 LCD:", help);
check(/envoyez culture|send crop|أرسل المحصول/.test(help) && !/PLUIE|RAIN|مطر/.test(help), "touche 1 : l'aide du serveur ne parle d'aucune pluie");
console.log("api:", api.join(" || "));
check(api.every((a) => !/PLUIE|RAIN|مطر/.test(a)), "aucun appel au serveur ne parle de pluie");

// langue
await page.getByRole("button", { name: /^2( |$)/ }).first().click();
await page.waitForTimeout(400);
await shotPhone("07-lang-menu");
const lang = await lcdText();
console.log("7 LCD:", lang);
check(/Français/.test(lang) && /العربية/.test(lang) && /English/.test(lang), "touche 2 : choix de la langue");
await page.getByRole("button", { name: /^\*( |$)/ }).first().click();
await page.waitForTimeout(300);

// arrêt : confirmation, puis « Non » pour revenir au message
await page.getByRole("button", { name: /^3( |$)/ }).first().click();
await page.waitForTimeout(400);
await shotPhone("08-stop-confirm");
const stop = await lcdText();
console.log("8 LCD:", stop);
check(/Oui|Yes|نعم/.test(stop) && /Non|No|لا/.test(stop), "touche 3 : confirmation de l'arrêt (1 Oui, 2 Non)");
await page.getByRole("button", { name: /^2( |$)/ }).first().click();
await page.waitForTimeout(300);
check(/Sakia/.test(await lcdText()), "« Non » ramène au message");

await shot("10-full", true);
console.log("api total:", api.length);
console.log("errors:", logs.join(" ; ") || "(aucune)");
await browser.close();
console.log(failures ? `${failures} échec(s)` : "tout est bon");
process.exitCode = failures ? 1 : 0;
