// Mesure, dans un navigateur réel (Edge sans écran), le poids, le temps de chargement et la tenue hors connexion d'une page d'accueil sur un réseau
// bridé (3G, 2G) avec un processeur de téléphone d'entrée de gamme (ralenti ×4), pour Sakia et pour des sites qui servent à peu près le même besoin
// (prévision météo, conseil agricole). Aucun parti pris : mêmes conditions pour tous, résultats écrits tels quels, échecs compris.
// Préparation (hors dépôt, aucune dépendance ajoutée à package.json) : mkdir /tmp/perf && cd /tmp/perf && npm i puppeteer-core
// Lancer : node scripts/perf-compare.mjs <dossier avec puppeteer-core> <fichier de sortie.json> [profil: 3G|2G|all]
import { createRequire } from "node:module";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";

const dir = path.resolve(process.argv[2] ?? ".");
const out = process.argv[3] ?? "perf-results.json";
const only = process.argv[4] ?? "all";
const puppeteer = createRequire(path.join(dir, "x.js"))("puppeteer-core");
const EDGE = process.env.BROWSER ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

const SITES = [
  { id: "sakia", name: "Sakia (home page)", url: "https://sakia-opal.vercel.app/" },
  { id: "meteotn", name: "meteo.tn (national weather institute)", url: "https://www.meteo.tn/" },
  { id: "wapor", name: "FAO WaPOR portal (the data behind national irrigation tools)", url: "https://wapor.apps.fao.org/home/WAPOR_2/1" },
  { id: "meteoblue", name: "meteoblue, Kairouan forecast", url: "https://www.meteoblue.com/en/weather/week/kairouan_tunisia_2473482" },
  { id: "timeanddate", name: "timeanddate.com, Kairouan weather", url: "https://www.timeanddate.com/weather/tunisia/kairouan" },
  { id: "yrno", name: "yr.no, Kairouan forecast (a lean reference)", url: "https://www.yr.no/en/forecast/daily-table/2-2473482/Tunisia/Kairouan/Kairouan/Kairouan" },
];
// profils usuels de WebPageTest : 3G « normale » et 2G
const PROFILES = {
  "3G": { down: (1.6 * 1024 * 1024) / 8, up: (768 * 1024) / 8, latency: 300 },
  "2G": { down: (280 * 1024) / 8, up: (256 * 1024) / 8, latency: 800 },
};
const UA = "Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36";
const LOAD_TIMEOUT = 150000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function measure(site, profile) {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ["--disable-features=Translate", "--no-first-run"] });
  const res = { site: site.id, name: site.name, url: site.url, profile };
  try {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setUserAgent(UA);
    await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true });
    const cdp = await page.createCDPSession();
    await cdp.send("Network.enable");
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const p = PROFILES[profile];
    const net = (offline = false) => cdp.send("Network.emulateNetworkConditions", { offline, latency: p.latency, downloadThroughput: p.down, uploadThroughput: p.up });
    await net();
    let bytes = 0;
    let requests = 0;
    cdp.on("Network.requestWillBeSent", () => requests++);
    cdp.on("Network.loadingFinished", (e) => (bytes += e.encodedDataLength || 0));
    const visit = async (label, cacheDisabled) => {
      bytes = 0;
      requests = 0;
      await cdp.send("Network.setCacheDisabled", { cacheDisabled });
      const t0 = Date.now();
      let ok = true;
      let note = "";
      try {
        await page.goto(site.url, { waitUntil: "load", timeout: LOAD_TIMEOUT });
      } catch (e) {
        ok = false;
        note = String(e.message).includes("Timeout") ? `no load event within ${LOAD_TIMEOUT / 1000} s` : String(e.message).slice(0, 60);
      }
      const ms = Date.now() - t0;
      const fcp = await page.evaluate(() => performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null).catch(() => null);
      const m = Object.fromEntries((await cdp.send("Performance.getMetrics").catch(() => ({ metrics: [] }))).metrics.map((x) => [x.name, x.value]));
      return { label, loaded: ok, note, kb: Math.round(bytes / 1024), requests, loadSeconds: Math.round(ms / 100) / 10, fcpSeconds: fcp ? Math.round(fcp / 100) / 10 : null, scriptSeconds: m.ScriptDuration != null ? Math.round(m.ScriptDuration * 10) / 10 : null };
    };
    await cdp.send("Performance.enable");
    res.cold = await visit("cold", true);
    await sleep(4000); // laisse le service worker s'installer s'il y en a un
    res.repeat = await visit("repeat", false);
    // hors connexion : la page se recharge-t-elle sans aucun réseau ?
    await net(true);
    try {
      await page.reload({ waitUntil: "load", timeout: 30000 });
      const title = await page.title();
      const len = await page.evaluate(() => document.body?.innerText?.length ?? 0);
      res.offline = { works: len > 200 && !/err_|ne peut pas|can.t be reached/i.test(title), textLength: len };
    } catch (e) {
      res.offline = { works: false, note: String(e.message).slice(0, 50) };
    }
  } catch (e) {
    res.error = String(e.message).slice(0, 100);
  } finally {
    await browser.close().catch(() => {});
  }
  return res;
}

const results = existsSync(out) ? (JSON.parse(readFileSync(out, "utf8")).results ?? []) : [];
for (const profile of Object.keys(PROFILES)) {
  if (only !== "all" && only !== profile) continue;
  for (const site of SITES) {
    if (results.some((r) => r.site === site.id && r.profile === profile && !r.error)) continue;
    const r = await measure(site, profile);
    const i = results.findIndex((x) => x.site === r.site && x.profile === r.profile);
    if (i >= 0) results[i] = r;
    else results.push(r);
    writeFileSync(out, JSON.stringify({ measuredAt: new Date().toISOString(), conditions: { cpuThrottle: "4x", viewport: "412x915 mobile", browser: "Microsoft Edge headless", from: "Tunis (Tunisia), the author's connection, network bridled by the browser", profiles: PROFILES }, results }, null, 1));
    console.log(profile, site.id, JSON.stringify({ cold: r.cold, repeat: r.repeat && { kb: r.repeat.kb, s: r.repeat.loadSeconds }, offline: r.offline, error: r.error }));
  }
}
