// Filme le VRAI site de production, en format téléphone, pour les vidéos (démo et technique) : une séquence par parcours.
// Chaque séquence garde ses images horodatées, les touches (le montage dessine le doigt), les sons joués par l'appli
// (copiés tels quels) et des repères nommés. Rien n'est inventé : ce sont les vraies données du jour.
// Lancer : node scripts/video/capture-demo.mjs [séquence ...]   (sans argument : toutes)
// Résultat : videos/build/capture/<séquence>/{frames/, meta.json, audio-*.mp3}
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { AUDIO_HOOK, Recorder, TapLog, find, goto, launch, scrollBy, scrollTo, sleep, tapText, waitFor } from "./cdp.mjs";

const SITE = process.env.SITE ?? "https://sakia-opal.vercel.app";
const ROOT = path.resolve("videos/build/capture");
const PROFILES = path.resolve(process.env.TEMP ?? ".", "sakia-capture-profiles");
const only = process.argv.slice(2);
// réponses du parcours (mêmes choix que la vidéo Telegram d'Anthony) : dernier arrosage à l'écran et touche de l'appel
const LAST = process.env.DEMO_LAST ?? "Wed"; // il y a 4 jours (Telegram « 3-5 days ago »)
const CALL_AGO_KEY = process.env.DEMO_CALL_KEY ?? "3"; // « il y a 3 à 5 jours »

const hydrated = `(() => { const b = document.querySelector("button"); return !!b && Object.keys(b).some((k) => k.startsWith("__react")); })()`;

async function clip(name, opts, body) {
  if (only.length && !only.includes(name)) return;
  const dir = path.join(ROOT, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  if (opts.fresh) rmSync(path.join(PROFILES, opts.profile), { recursive: true, force: true });
  const { proc, cdp } = await launch({ port: opts.port ?? 9370, userDataDir: path.join(PROFILES, opts.profile), extra: opts.extra ?? [], ...(opts.desktop ? { width: 1536, height: 864, dsf: 1.25, mobile: false } : {}) });
  const log = new TapLog();
  const marks = {};
  const mark = (k) => (marks[k] = Date.now());
  const rec = new Recorder(cdp, dir, opts.desktop ? { maxWidth: 1920, maxHeight: 1080 } : {});
  try {
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: AUDIO_HOOK });
    await cdp.send("Network.enable");
    // le robot ne doit pas compter comme un visiteur : mesure d'audience Vercel (chemin propre au projet, et chemin standard)
    await cdp.send("Network.setBlockedURLs", { urls: ["*/a9a63dfb9d0e3041/*", "*/_vercel/insights/*"] });
    const ctx = { cdp, log, mark, rec, dir };
    await body(ctx);
    const plays = (await cdp.eval(`window.__plays || []`)) ?? [];
    const audio = [];
    for (const [i, p] of plays.entries()) {
      if (!p.b64) continue;
      const file = `audio-${String(i).padStart(2, "0")}.mp3`;
      writeFileSync(path.join(dir, file), Buffer.from(p.b64, "base64"));
      audio.push({ t: p.t, file, ended: p.ended ?? null, paused: p.paused ?? null, src: p.src.slice(0, 80) });
    }
    const meta = { name, site: SITE, capturedAt: new Date().toISOString(), viewport: opts.desktop ? { w: 1536, h: 864, dsf: 1.25 } : { w: 390, h: 844, dsf: 3 }, t0: rec.t0, t1: rec.t1, frames: rec.frames, taps: log.taps, audio, marks };
    writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta));
    const secs = rec.frames.length ? (rec.frames.at(-1).t - rec.frames[0].t) / 1000 : 0;
    console.log(`${name.padEnd(9)} ${rec.frames.length} images, ${secs.toFixed(1)} s, ${log.taps.length} touches, ${audio.length} sons, repères : ${Object.keys(marks).join(", ")}`);
  } catch (e) {
    console.log(`${name} : ÉCHEC — ${e.message}`);
    try {
      const s = await cdp.send("Page.captureScreenshot", { format: "png" });
      writeFileSync(path.join(dir, "echec.png"), Buffer.from(s.data, "base64"));
    } catch {}
  } finally {
    cdp.close();
    proc.kill();
    await sleep(600);
  }
}

// Le questionnaire de l'accueil (ou de /phone) : région, culture, dernier arrosage — comme le ferait l'agriculteur.
async function questionnaire({ cdp, log }, { last }) {
  await tapText(cdp, { selector: "button[aria-haspopup=dialog]", text: "Region" }, log, { pauseBefore: 500 });
  await waitFor(cdp, `[...document.querySelectorAll("button")].some((b) => b.innerText.trim() === "Kairouan" && b.getBoundingClientRect().width > 0)`);
  await sleep(1100);
  await tapText(cdp, { text: "Kairouan", exact: true }, log, { pauseBefore: 250 });
  await sleep(900);
  await tapText(cdp, { selector: "button[aria-haspopup=dialog]", text: "Crop" }, log, { pauseBefore: 400 });
  await waitFor(cdp, `[...document.querySelectorAll("button")].some((b) => b.innerText.trim() === "Pepper" && b.getBoundingClientRect().width > 0)`);
  await sleep(1500); // on laisse voir les images des cultures : pas besoin de lire
  await tapText(cdp, { text: "Pepper", exact: true }, log, { pauseBefore: 250 });
  await sleep(900);
  await tapText(cdp, { text: last, exact: true }, log, { pauseBefore: 300 });
  await sleep(900);
}

// Amène en haut de l'écran (à `offset` pixels) le premier élément dont le texte commence par `start`, en douceur.
async function frameOn(cdp, start, offset = 20, durationMs = 900) {
  const y = await cdp.eval(`(() => {
    const el = [...document.querySelectorAll("div,section,p,span")].find((e) => (e.innerText || "").trim().startsWith(${JSON.stringify(start)}));
    return el ? el.getBoundingClientRect().top + scrollY : null;
  })()`);
  if (y == null) throw new Error(`introuvable : ${start}`);
  const dy = y - offset - (await cdp.eval("scrollY"));
  if (durationMs <= 20) await cdp.eval(`window.scrollBy(0, ${dy}), true`);
  else await scrollBy(cdp, dy, durationMs);
}

const NOW = new Date();
console.log(`Capture du site ${SITE}, ${NOW.toLocaleString("fr-FR")}`);

// 1. Accueil : choisir, écouter, voir le plan
await clip("home", { profile: "demo", fresh: true }, async (c) => {
  const { cdp, log, mark, rec } = c;
  await goto(cdp, `${SITE}/`);
  await waitFor(cdp, hydrated, 30000);
  await cdp.eval(`document.fonts.ready.then(() => true)`);
  await sleep(1500);
  await rec.start();
  mark("hero");
  await sleep(Number(process.env.HERO_DWELL ?? 7500)); // la page d'accueil vit (roue, soleil) pendant l'accroche de la vidéo
  await scrollTo(cdp, { text: "Your field", selector: "h2,h3,p,div", block: 0.12, durationMs: 1100 });
  await sleep(500);
  mark("questions");
  await questionnaire(c, { last: LAST });
  mark("continue");
  await tapText(cdp, { text: "Continue", exact: true }, log, { pauseBefore: 300 });
  await sleep(1400);
  const lis = await find(cdp, { text: "Listen to today", scroll: false });
  if (lis && (lis.y < 120 || lis.y > 700)) await scrollTo(cdp, { text: "YOUR FIELD", selector: "p,div,h2,h3,span", block: 0.02, durationMs: 700 });
  await sleep(700);
  mark("listen");
  await tapText(cdp, { text: "Listen to today", scroll: false }, log, { pauseBefore: 400 });
  await waitFor(cdp, `(window.__plays || []).some((p) => p.src.startsWith("blob:"))`, 20000);
  mark("voice");
  await waitFor(cdp, `(window.__plays || []).some((p) => p.src.startsWith("blob:") && p.ended)`, 40000).catch(() => undefined);
  mark("voiceEnd");
  await sleep(600);
  await scrollBy(cdp, 230, 900);
  await sleep(1800);
  mark("plan");
  await scrollTo(cdp, { text: "One decision a day", selector: "h2,h3,p", block: 0.15, durationMs: 1300 });
  await sleep(2200);
  mark("doors");
  await rec.stop();
});

// 2. Sans réseau : même profil (l'appli installée a gardé la météo). Le navigateur est lancé avec un relais réseau mort :
// AUCUNE requête ne sort, ni de la page ni du service worker (un vrai « mode avion » pour le navigateur).
await clip("offline", { profile: "demo", extra: ["--proxy-server=http://127.0.0.1:9", "--proxy-bypass-list=<-loopback>"] }, async ({ cdp, log, mark, rec }) => {
  await rec.start();
  mark("offline");
  await sleep(400);
  await cdp.send("Page.navigate", { url: `${SITE}/` });
  await waitFor(cdp, `document.readyState === "complete"`, 20000);
  await waitFor(cdp, hydrated, 20000);
  mark("reopened");
  await sleep(1500);
  await scrollTo(cdp, { text: "YOUR FIELD", selector: "p,div,h2,h3,span", block: 0.02, durationMs: 900 }).catch(() => undefined);
  await sleep(1200);
  mark("listen");
  await tapText(cdp, { text: "Listen to today", scroll: false }, log, { pauseBefore: 300 }).catch(() => undefined);
  await sleep(6000);
  mark("end");
  await rec.stop();
  const txt = await cdp.eval(`document.body.innerText.slice(0, 1500)`);
  writeFileSync(path.join(c_dir("offline"), "page.txt"), txt);
});

// 3. « Pas sûr » : le dernier arrosage n'est pas connu
await clip("notsure", { profile: "notsure", fresh: true }, async (c) => {
  const { cdp, log, mark, rec } = c;
  await goto(cdp, `${SITE}/`);
  await waitFor(cdp, hydrated, 30000);
  await sleep(1500);
  await scrollTo(cdp, { text: "Your field", selector: "h2,h3,p,div", block: 0.12, durationMs: 10 });
  await rec.start();
  mark("questions");
  await questionnaire(c, { last: "Don't know" });
  await tapText(cdp, { text: "Continue", exact: true }, log, { pauseBefore: 300 });
  await sleep(1300);
  await scrollTo(cdp, { text: "I am not sure", selector: "p,div,h2,h3,strong,span", block: 0.3, durationMs: 1400 });
  mark("notsure");
  await sleep(3500);
  await rec.stop();
});

// 4. L'appel simulé : clavier, voix, sous-titres anglais
await clip("call", { profile: "call", fresh: true }, async ({ cdp, log, mark, rec }) => {
  await goto(cdp, `${SITE}/call`);
  await waitFor(cdp, hydrated, 30000);
  await sleep(1500);
  const key = async (k, wait) => {
    await tapText(cdp, { selector: "button", text: k, exact: true, scroll: false }, log, { pauseBefore: 200 });
    mark(`key${k}-${Date.now() % 100000}`);
    await sleep(wait);
  };
  await frameOn(cdp, "Sakia ☸", 16, 10); // le téléphone dessiné entier : écran (sous-titres) et clavier
  await sleep(400);
  await rec.start();
  mark("phone");
  await sleep(1200);
  await tapText(cdp, { text: "Call Sakia" }, log, { pauseBefore: 300 });
  mark("call");
  await sleep(6300);
  await key("2", 9300); // arabe à l'accent tunisien, sous-titres anglais
  await key("1", 7800); // Kairouan
  await key("2", 7600); // légumes
  await key("2", 12300); // piment
  const lastKey = Date.now();
  await key(CALL_AGO_KEY, 1000); // dernier arrosage (même réponse que sur le site et Telegram)
  mark("advice");
  // le conseil parlé (gros fichier, ~90 Ko) lancé APRÈS la dernière touche doit avoir été lu jusqu'au bout
  // (la question « quand avez-vous arrosé ? » pèse aussi plus de 60 Ko : on ne s'arrête pas sur elle)
  await waitFor(cdp, `(window.__plays || []).some((x) => x.t > ${lastKey} && x.size > 60000 && x.ended)`, 90000).catch(() => undefined);
  mark("adviceEnd");
  await sleep(1500);
  await rec.stop();
  const tr = await cdp.eval(`(() => { const m = document.querySelector("main").innerText; const i = m.indexOf("Call transcript"); return m.slice(i, i + 3000); })()`);
  writeFileSync(path.join(c_dir("call"), "transcript.txt"), tr);
});

// 5. Le SMS du matin sur un téléphone à touches (simulé)
await clip("sms", { profile: "sms", fresh: true }, async (c) => {
  const { cdp, log, mark, rec } = c;
  await goto(cdp, `${SITE}/phone`);
  await waitFor(cdp, hydrated, 30000);
  await sleep(1500);
  await scrollTo(cdp, { text: "Sign up for the morning SMS", selector: "h2,h3,p,div", block: 0.08, durationMs: 10 });
  await rec.start();
  mark("signup");
  await questionnaire(c, { last: LAST });
  await tapText(cdp, { text: "See the 6 a.m. SMS" }, log, { pauseBefore: 300 });
  await sleep(900);
  await frameOn(cdp, "SAKIA", 70, 1200); // le téléphone à touches entier
  mark("phone");
  await sleep(1300);
  await tapText(cdp, { selector: "button", text: "Read", exact: true, scroll: false }, log, { pauseBefore: 300 }).catch(() => undefined);
  mark("read");
  await sleep(4500);
  await rec.stop();
  const t = await cdp.eval(`(() => { const m = document.querySelector("main").innerText; const i = m.indexOf("SAKIA"); return m.slice(i, i + 1200); })()`);
  writeFileSync(path.join(c_dir("sms"), "sms.txt"), t);
});

// 6. Le bulletin : la présentatrice dessinée lit le conseil, sous-titres
await clip("bulletin", { profile: "bulletin", fresh: true }, async ({ cdp, log, mark, rec }) => {
  await goto(cdp, `${SITE}/bulletin`);
  await waitFor(cdp, hydrated, 30000);
  await sleep(1500);
  // les deux listes déroulantes : on règle la valeur comme le ferait le téléphone
  await cdp.eval(`(() => {
    const pick = (sel, label) => { const s = [...document.querySelectorAll("select")][sel]; const o = [...s.options].find((x) => x.text.trim() === label); const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set; set.call(s, o.value); s.dispatchEvent(new Event("change", { bubbles: true })); };
    pick(0, "Kairouan"); pick(1, "Pepper"); return true; })()`);
  await sleep(800);
  const fri = await find(cdp, { text: "Fri", exact: true, scroll: false });
  if (fri) await tapText(cdp, { text: "Fri", exact: true }, log, { pauseBefore: 200 });
  await sleep(600);
  await scrollTo(cdp, { text: "SAKIA · BULLETIN", selector: "div,span,p", block: 0.03, durationMs: 10 }).catch(() => undefined);
  await sleep(500);
  await rec.start();
  mark("standby");
  await sleep(900);
  const listen = await find(cdp, { selector: "button", text: "Listen", scroll: false });
  if (listen) {
    log.taps.push({ t: Date.now(), x: listen.x, y: listen.y });
    await cdp.eval(`(() => { const el = document.querySelector("[data-cap-target]"); el?.click(); return true; })()`);
  }
  mark("listen");
  await waitFor(cdp, `(window.__plays || []).some((p) => p.src.startsWith("blob:") || p.src.includes("/audio/"))`, 30000).catch(() => undefined);
  mark("voice");
  await sleep(14000);
  mark("end");
  await rec.stop();
});

// 7. La page Lab (format ordinateur, pour la vidéo technique)
await clip("lab", { profile: "lab", fresh: true, desktop: true }, async ({ cdp, log, mark, rec }) => {
  await goto(cdp, `${SITE}/lab`);
  await waitFor(cdp, hydrated, 30000);
  await cdp.eval(`document.fonts.ready.then(() => true)`);
  await sleep(2500);
  await rec.start();
  mark("top");
  await sleep(2500);
  await scrollTo(cdp, { text: "Run it yourself", selector: "h2", block: 0.08, durationMs: 1400 });
  mark("live");
  await sleep(4500);
  await scrollTo(cdp, { text: "How close to the satellite", selector: "h2", block: 0.06, durationMs: 1400 });
  mark("results");
  await sleep(4000);
  await scrollTo(cdp, { text: "Does it travel", selector: "h2", block: 0.06, durationMs: 1400 });
  mark("travel");
  await sleep(4000);
  await rec.stop();
});

function c_dir(name) {
  return path.join(ROOT, name);
}
