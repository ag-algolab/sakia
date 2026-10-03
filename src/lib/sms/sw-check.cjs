/* eslint-disable @typescript-eslint/no-require-imports */
// Banc d'essai du service worker : node src/lib/sms/sw-check.cjs
// Faux navigateur (caches, fetch) autour de public/sw.js : plan en ligne et hors ligne, pages, audio, mise à jour des 5 h. Aucun réseau.
const fs = require("fs");
const vm = require("vm");

const ORIGIN = "http://localhost:3000";
let failed = 0;
const check = (name, ok, detail = "") => { if (!ok) failed++; console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : " " + detail}`); };

// ---- faux Cache API (clé = URL, comme le fait sw.js) ----
const keyOf = (r) => (typeof r === "string" ? new URL(r, ORIGIN).href : r.url);
class FakeCache {
  constructor() { this.map = new Map(); }
  async match(r) { const e = this.map.get(keyOf(r)); return e ? e.clone() : undefined; }
  async put(r, res) { this.map.set(keyOf(r), res.clone()); }
  async delete(r) { return this.map.delete(keyOf(r)); }
  async keys() { return [...this.map.keys()].map((u) => new Request(u)); }
}
const stores = new Map();
const caches = {
  async open(n) { if (!stores.has(n)) stores.set(n, new FakeCache()); return stores.get(n); },
  async keys() { return [...stores.keys()]; },
  async delete(n) { return stores.delete(n); },
  async has(n) { return stores.has(n); },
};

// ---- faux réseau ----
let online = true;
let slowPlan = false;
let planStatus = 200;
const hits = [];
let dataFetchedAt = new Date().toISOString();
let skew = 0;
const withAge = (res, ms) => { const h = new Headers(res.headers); h.set("x-sakia-cached-at", String(Date.now() - ms)); return new Response(res.body, { headers: h }); };
const HTML = (extra = "") => `<html><script src="/_next/static/chunks/app.js"></script><link href="/_next/static/css/a.css">${extra}</html>`;
async function fakeFetch(input, init) {
  const req = input instanceof Request ? input : new Request(new URL(input, ORIGIN).href, init);
  hits.push(req.url);
  if (!online) throw new TypeError("Failed to fetch");
  const u = new URL(req.url);
  if (u.pathname === "/api/plan" && slowPlan) await new Promise((r) => setTimeout(r, 1500));
  if (u.pathname === "/api/plan" && planStatus !== 200) return new Response("{}", { status: planStatus });
  if (u.pathname === "/audio/demo-index.json") return new Response(JSON.stringify([{ id: "kairouan-olivier-fr" }]), { headers: { "Content-Type": "application/json" } });
  if (u.pathname === "/audio/demo-kairouan-olivier-fr.mp3" || u.pathname === "/audio/demo-kairouan-olivier-fr.json") return new Response("demo-audio", { headers: { "Content-Type": "audio/mpeg" } });
  if (u.pathname === "/boom") return new Response("<html>erreur</html>", { status: 500, headers: { "Content-Type": "text/html" } });
  if (u.pathname.startsWith("/audio/") && req.headers.get("if-none-match") === '"v1"') return new Response(null, { status: 304 });
  if (u.pathname === "/api/plan") return new Response(JSON.stringify({ regionId: "kairouan", dataFetchedAt }), { headers: { "Content-Type": "application/json", Date: new Date(Date.now() + skew).toUTCString() } });
  if (u.pathname === "/api/bad") return new Response("{}", { status: 400 });
  if (u.pathname.startsWith("/audio/")) return new Response(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), { headers: { "Content-Type": "audio/mpeg", ETag: '"v1"' } });
  if (u.pathname.endsWith(".css")) return new Response("body{src:url(/_next/static/media/013b-s.woff2)}");
  if (u.pathname.startsWith("/_next/static/") || u.pathname.startsWith("/icons/")) return new Response("asset:" + u.pathname);
  if (["/", "/phone", "/offline", "/backtest", "/bulletin", "/about"].includes(u.pathname)) return new Response(HTML(u.pathname), { headers: { "Content-Type": "text/html" } });
  return new Response("nope", { status: 404 });
}

// ---- chargement de sw.js ----
const listeners = {};
const posted = [];
const self_ = {
  location: new URL(ORIGIN + "/sw.js"),
  addEventListener: (t, fn) => (listeners[t] = fn),
  skipWaiting: async () => {},
  clients: { claim: async () => {}, matchAll: async () => [{ postMessage: (m) => posted.push(m) }] },
};
const ctx = vm.createContext({ self: self_, caches, fetch: fakeFetch, Response, Request, Headers, URL, URLSearchParams, setTimeout: (fn, ms) => setTimeout(fn, (ms || 0) / 200), clearTimeout, Promise, Symbol, Date, JSON, Object, Number, String, Array, Set, Math, Infinity, Blob, Uint8Array, console });
vm.runInContext(fs.readFileSync(require("path").join(__dirname, "../../../public/sw.js"), "utf8"), ctx, { filename: "sw.js" });

const resetThrottle = () => vm.runInContext("lastAttempt.clear()", ctx);
// ---- aides pour jouer les événements ----
async function run(type, props = {}) {
  const waits = [];
  const ev = { waitUntil: (p) => waits.push(p), ...props };
  await listeners[type](ev);
  await Promise.allSettled(waits);
  return ev;
}
async function doFetch(url, { method = "GET", mode = "cors", headers = {} } = {}) {
  const req = new Request(new URL(url, ORIGIN).href, { method, headers });
  Object.defineProperty(req, "mode", { value: mode });
  let responded;
  const waits = [];
  const ev = { request: req, respondWith: (p) => (responded = Promise.resolve(p)), waitUntil: (p) => waits.push(p) };
  listeners.fetch(ev);
  if (!responded) return { handled: false };
  const res = await responded;
  await Promise.allSettled(waits);
  return { handled: true, res };
}

(async () => {
  // 1. installation
  await run("install");
  const shell = await caches.open("sakia-shell-v1");
  const stat = await caches.open("sakia-static-v1");
  check("installation : /, /phone, /offline gardées", (await shell.match("/")) && (await shell.match("/phone")) && (await shell.match("/offline")));
  check("installation : scripts et styles cités par les pages gardés", !!(await stat.match("/_next/static/chunks/app.js")) && !!(await stat.match("/_next/static/css/a.css")));
  check("installation : polices citées par la feuille de style gardées", !!(await stat.match("/_next/static/media/013b-s.woff2")));
  check("installation : icônes gardées", !!(await stat.match("/icons/icon-192.png")));
  await run("activate");

  // 2. plan en ligne puis hors ligne
  const q = "/api/plan?region=kairouan&crop=olivier";
  let r = await doFetch(q);
  check("plan en ligne : réponse du réseau", r.res.headers.get("x-sakia-served-from") === "network");
  check("plan en ligne : heures posées", Number(r.res.headers.get("x-sakia-cached-at")) > 0 && Number(r.res.headers.get("x-sakia-data-at")) > 0);
  online = false;
  r = await doFetch(q);
  const body = await r.res.json();
  check("plan hors ligne : dernière réponse rendue", r.res.status === 200 && r.res.headers.get("x-sakia-served-from") === "cache" && body.regionId === "kairouan");
  check("plan hors ligne : âge de la donnée présent", Math.abs(Number(r.res.headers.get("x-sakia-data-at")) - Date.parse(dataFetchedAt)) < 2500);
  r = await doFetch("/api/plan?region=sfax&crop=ble");
  check("plan jamais vu hors ligne : 503 clair", r.res.status === 503 && r.res.headers.get("x-sakia-served-from") === "none" && (await r.res.json()).offline === true);

  // 3. navigation hors ligne
  r = await doFetch("/phone", { mode: "navigate" });
  check("/phone hors ligne : page gardée", r.res.status === 200 && (await r.res.text()).includes("/phone"));
  r = await doFetch("/", { mode: "navigate" });
  check("/ hors ligne : page gardée", r.res.status === 200);
  r = await doFetch("/jamais-vue", { mode: "navigate" });
  check("page jamais vue hors ligne : /offline", r.res.status === 200 && (await r.res.text()).includes("/offline"));
  online = true;
  r = await doFetch("/bulletin", { mode: "navigate" });
  await new Promise((s) => setTimeout(s, 20));
  online = false;
  r = await doFetch("/bulletin", { mode: "navigate" });
  check("page visitée en ligne puis hors ligne : gardée", (await r.res.text()).includes("/bulletin"));

  // 4. mise à jour (5 h)
  online = true;
  const data = await caches.open("sakia-data-v1");
  const planKey = new URL(q, ORIGIN).href;
  const setAges = async (dataAgeH, cachedAgeH) => {
    const cur = await data.match(planKey);
    const h = new Headers(cur.headers);
    h.set("x-sakia-data-at", String(Date.now() - dataAgeH * 3600e3));
    h.set("x-sakia-cached-at", String(Date.now() - cachedAgeH * 3600e3));
    await data.put(planKey, new Response(cur.body, { headers: h }));
  };
  const planFetches = () => hits.filter((u) => u.includes("/api/plan?region=kairouan")).length;
  await setAges(1, 1);
  let before = planFetches();
  await run("message", { data: { type: "REFRESH_STALE" } });
  check("plan de 1 h : pas rafraîchi", planFetches() === before);
  await setAges(6, 6);
  resetThrottle();
  dataFetchedAt = new Date().toISOString();
  before = planFetches();
  posted.length = 0;
  await run("message", { data: { type: "REFRESH_STALE" } });
  check("plan de 6 h : rafraîchi", planFetches() === before + 1);
  const fresh = await data.match(planKey);
  check("plan rafraîchi : nouvelle heure gardée", Date.now() - Number(fresh.headers.get("x-sakia-data-at")) < 5000);
  check("page prévenue de la mise à jour", posted.some((m) => m.type === "PLANS_REFRESHED"));
  await setAges(6, 0.01); // donnée ancienne mais essai tout récent : pas de rafale
  before = planFetches();
  await run("message", { data: { type: "REFRESH_STALE" } });
  check("pas deux essais en moins de 10 min", planFetches() === before);
  await setAges(6, 6);
  online = false;
  before = planFetches();
  await run("message", { data: { type: "REFRESH_STALE" } });
  const kept = await data.match(planKey);
  check("plan ancien et pas de réseau : l'ancien plan est gardé", !!kept && Date.now() - Number(kept.headers.get("x-sakia-data-at")) > 5 * 3600e3);
  online = true;
  await setAges(1, 1);
  before = planFetches();
  await run("periodicsync", { tag: "sakia-refresh" });
  check("synchronisation périodique : rien si le plan est récent", planFetches() === before);
  await setAges(7, 7);
  resetThrottle();
  await run("periodicsync", { tag: "sakia-refresh" });
  check("synchronisation périodique : rafraîchit un plan de 7 h", planFetches() === before + 1);
  await run("periodicsync", { tag: "autre" });

  // 5. audio avec « Range »
  r = await doFetch("/audio/bulletin-fr.mp3", { headers: { Range: "bytes=2-5" } });
  check("audio en ligne, Range : 206 et bons octets", r.res.status === 206 && [...new Uint8Array(await r.res.arrayBuffer())].join() === "2,3,4,5");
  online = false;
  r = await doFetch("/audio/bulletin-fr.mp3", { headers: { Range: "bytes=0-" } });
  check("audio hors ligne : lu depuis la mémoire", r.res.status === 206 && r.res.headers.get("content-range") === "bytes 0-9/10");
  r = await doFetch("/audio/bulletin-fr.mp3");
  check("audio hors ligne sans Range : fichier entier", r.res.status === 200 && (await r.res.arrayBuffer()).byteLength === 10);
  r = await doFetch("/audio/bulletin-fr.mp3", { headers: { Range: "bytes=-3" } });
  check("audio : fin de fichier (bytes=-3)", r.res.status === 206 && [...new Uint8Array(await r.res.arrayBuffer())].join() === "7,8,9");
  r = await doFetch("/audio/jamais-vu.mp3");
  check("audio jamais gardé hors ligne : 503", r.res.status === 503);

  // 5b. cas relevés par la relecture
  online = true;
  const dstore = await caches.open("sakia-audio-v1");
  check("installation : bulletins de démonstration gardés", !!(await dstore.match("/audio/demo-kairouan-olivier-fr.mp3")) && !!(await dstore.match("/audio/demo-index.json")));
  check("installation : /bulletin, /backtest gardées", !!(await shell.match("/bulletin")) && !!(await shell.match("/backtest")));
  const audioKey = new URL("/audio/bulletin-fr.mp3", ORIGIN).href;
  const old = await dstore.match(audioKey);
  await dstore.put(audioKey, withAge(old, 3 * 3600e3));
  before = hits.length;
  r = await doFetch("/audio/bulletin-fr.mp3");
  check("audio de plus d'1 h : redemandé avec l'ETag, 304 -> copie gardée renouvelée", r.res.status === 200 && hits.length === before + 1 && (await r.res.arrayBuffer()).byteLength === 10);
  r = await doFetch("/audio/bulletin-fr.mp3");
  check("audio renouvelé : plus de requête pendant 1 h", hits.length === before + 1);

  // lenteur : copie servie si elle existe, sinon on attend
  slowPlan = true;
  r = await doFetch(q);
  check("réseau lent, copie gardée : la copie est servie", r.res.headers.get("x-sakia-served-from") === "cache");
  const fresh2 = await data.match(planKey);
  check("réseau lent : la réponse tardive est quand même gardée", Date.now() - Number(fresh2.headers.get("x-sakia-cached-at")) < 5000);
  r = await doFetch("/api/plan?region=tunis&crop=ble");
  check("réseau lent, rien de gardé : on attend la réponse (pas d'échec)", r.res.status === 200 && r.res.headers.get("x-sakia-served-from") === "network");
  slowPlan = false;

  // erreur du serveur (5xx)
  planStatus = 502;
  r = await doFetch(q);
  check("plan : le serveur répond 502, copie gardée servie", r.res.status === 200 && r.res.headers.get("x-sakia-served-from") === "cache");
  r = await doFetch("/api/plan?region=sfax&crop=orge");
  check("plan : 502 et rien de gardé -> erreur transmise, pas d'écriture en mémoire", r.res.status === 502 && !(await data.match(new URL("/api/plan?region=sfax&crop=orge", ORIGIN).href)));
  planStatus = 200;
  r = await doFetch("/boom", { mode: "navigate" });
  check("page en erreur 500 sans copie : l'erreur est transmise", r.res.status === 500);
  await shell.put(new URL("/boom", ORIGIN).href, new Response("<html>copie /boom</html>", { headers: { "Content-Type": "text/html" } }));
  r = await doFetch("/boom", { mode: "navigate" });
  check("page en erreur 500 avec copie : la copie est servie", r.res.status === 200 && (await r.res.text()).includes("copie"));

  // horloge de l'appareil décalée : l'âge de la donnée vient du serveur (en-tête Date), pas de la comparaison des deux horloges
  skew = 6 * 3600e3;
  dataFetchedAt = new Date(Date.now() + skew - 2 * 3600e3).toISOString(); // donnée vieille de 2 h selon le serveur
  r = await doFetch("/api/plan?region=tunis&crop=orge");
  const ageH = (Date.now() - Number(r.res.headers.get("x-sakia-data-at"))) / 3600e3;
  check("horloge du serveur 6 h plus loin : âge de la donnée = 2 h (mesuré avec Date)", Math.abs(ageH - 2) < 0.1, String(ageH));
  skew = 0;

  // les essais ratés ne sont pas répétés pendant 10 min
  await setAges(7, 7);
  resetThrottle();
  online = false;
  before = planFetches();
  await run("message", { data: { type: "REFRESH_STALE" } });
  const after1 = planFetches();
  await run("message", { data: { type: "REFRESH_STALE" } });
  check("mise à jour ratée : un seul essai, pas de rafale", after1 === before + 1 && planFetches() === after1, `${before} ${after1} ${planFetches()}`);
  online = true;

  // 6. ce qu'on ne touche pas
  online = true;
  for (const [url, opt] of [["/api/sms/incoming", { method: "POST" }], ["/api/sms/incoming", {}], ["/api/telegram/webhook", {}], ["/api/voice/tts", {}], ["/_next/webpack-hmr", {}]]) {
    r = await doFetch(url, opt);
    check(`${opt.method ?? "GET"} ${url} : laissé au réseau`, r.handled === false);
  }
  r = await doFetch("/api/bad");
  check("/api/bad : laissé au réseau", r.handled === false);

  // 7. message PRECACHE : seulement des adresses connues
  hits.length = 0;
  await run("message", { data: { type: "PRECACHE", urls: ["//evil.example/x.js", "/api/sms/incoming", "/secret", "/_next/static/chunks/more.js", "/icons/icon.svg"], pages: ["//evil.example/", "/api/plan", "/backtest"] } });
  check("PRECACHE : adresses étrangères ou /api refusées", !hits.some((u) => u.includes("evil") || u.includes("/api/") || u.includes("/secret")), hits.join(" "));
  check("PRECACHE : adresses permises gardées", hits.some((u) => u.endsWith("/_next/static/chunks/more.js")) && hits.some((u) => u.endsWith("/backtest")));

  // 8. nettoyage des anciennes versions
  await caches.open("sakia-shell-v0");
  await caches.open("autre-site");
  await run("activate");
  check("activation : anciennes mémoires 'sakia-' supprimées, les autres intactes", !stores.has("sakia-shell-v0") && stores.has("autre-site"));

  console.log(failed ? `\n${failed} contrôle(s) en échec` : "\ntous les contrôles passent");
  process.exit(failed ? 1 : 0);
})();
