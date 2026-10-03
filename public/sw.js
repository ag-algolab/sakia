/* Sakia : service worker. Garde l'application et le dernier plan en mémoire pour qu'ils s'ouvrent sans internet.
 *
 *  - pages (navigation)        : réseau d'abord ; si le réseau est lent (4 s) ou coupé, la copie gardée ; sinon /offline
 *  - /api/plan                 : réseau d'abord, repli sur la dernière réponse. Chaque réponse gardée est horodatée
 *                                (x-sakia-cached-at, x-sakia-data-at) et ressort avec x-sakia-served-from: network | cache
 *  - /_next/static, icônes     : copie d'abord (fichiers à empreinte) ; en développement, réseau d'abord
 *  - /audio/*                  : bulletins parlés, gardés pour être lus sans internet (requêtes « Range » comprises)
 *  - mise à jour               : à l'ouverture et au retour du réseau (message de la page) si le plan a plus de 5 h ;
 *                                en plus, synchronisation périodique « au mieux » (Chrome sur Android installé :
 *                                le navigateur décide du moment, absente sur iPhone). Rien n'est garanti toutes les 5 h.
 *  - jamais mis en mémoire     : tout ce qui n'est pas un GET de ce site (SMS, Telegram...), les réponses en erreur.
 *
 * Le calcul du plan hors connexion ne passe PAS par ici : la page garde la météo brute et recalcule elle-même
 * (src/components/phone/usePlan.ts). /api/forecast n'est donc volontairement PAS servi depuis la mémoire d'ici :
 * la page doit savoir quand le serveur ne répond pas (une copie servie en douce lui ferait croire qu'elle est en ligne).
 */

const VERSION = "v1";
const SHELL = `sakia-shell-${VERSION}`; // pages HTML
const STATIC = `sakia-static-${VERSION}`; // scripts, styles, polices, icônes
const DATA = `sakia-data-${VERSION}`; // réponses de l'API (plan, catalogue, preuve)
const AUDIO = `sakia-audio-${VERSION}`; // bulletins parlés
const KEEP = [SHELL, STATIC, DATA, AUDIO];

const STALE_MS = 5 * 60 * 60 * 1000; // un plan de plus de 5 h est rafraîchi dès que possible
const MIN_RETRY_MS = 10 * 60 * 1000; // mais jamais plus d'un essai toutes les 10 min par plan
const NAV_TIMEOUT_MS = 4000; // réseau lent : on sert la copie gardée, si elle existe, pendant que la page se télécharge
const API_TIMEOUT_MS = 6000;
const AUDIO_FRESH_MS = 60 * 60 * 1000;
const MAX_DATA = 60;
const MAX_AUDIO = 40;
const MAX_STATIC = 400;
const MAX_SHELL = 40;

const PRECACHE_PAGES = ["/", "/phone", "/offline", "/bulletin", "/backtest", "/about"]; // une page absente (404) est simplement ignorée
const PRECACHE_FILES = ["/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon.svg"];
const ASSET_PREFIXES = ["/_next/static/", "/__nextjs_font/", "/icons/", "/audio/"];

// En local, les fichiers changent sans changer de nom : on préfère le réseau.
const IS_DEV = ["localhost", "127.0.0.1", "[::1]"].includes(self.location.hostname);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- utilitaires ----------

function withHeaders(response, extra) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

// Ajoute l'heure de mise en mémoire et, pour un plan, l'heure de la donnée (dataFetchedAt). L'âge de la donnée est mesuré
// avec l'horloge du serveur (en-tête Date) puis ramené à l'horloge de l'appareil : une horloge d'appareil fausse ne fausse pas l'âge.
async function stamp(response) {
  const now = Date.now();
  const extra = { "x-sakia-cached-at": String(now) };
  if ((response.headers.get("content-type") || "").includes("json")) {
    try {
      const body = await response.clone().json();
      const fetchedAt = Date.parse(body && body.dataFetchedAt);
      if (fetchedAt) {
        const serverNow = Date.parse(response.headers.get("date"));
        const age = serverNow ? Math.max(0, serverNow - fetchedAt) : Math.max(0, now - fetchedAt);
        extra["x-sakia-data-at"] = String(now - age);
      }
    } catch {
      // pas de date lisible : on ne garde que l'heure de mise en mémoire
    }
  }
  return withHeaders(response, extra);
}

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key);
}

const isCacheable = (res) => res && res.status === 200 && res.type !== "opaque";

async function putQuietly(cache, request, response) {
  try {
    await cache.put(request, response);
  } catch {
    // espace plein ou réponse non gardable : on continue sans
  }
}

// ---------- installation ----------

async function cacheAsset(url) {
  const cache = await caches.open(STATIC);
  if (await cache.match(url)) return;
  try {
    const res = await fetch(url);
    if (!isCacheable(res)) return;
    await putQuietly(cache, url, res.clone());
    // une feuille de style cite ses polices : on les garde aussi, sinon le texte change de police hors connexion
    if (/\.css(\?|$)/.test(url)) {
      const fonts = [...new Set((await res.text()).match(/\/_next\/static\/media\/[^"'\\\s)]+/g) || [])];
      await Promise.allSettled(fonts.map(cacheAsset));
    }
  } catch {
    // hors connexion pendant l'installation : ce fichier sera gardé à sa première utilisation
  }
}

// Garde une page et les fichiers qu'elle cite (scripts, styles) pour qu'elle s'ouvre sans internet.
async function cachePage(path) {
  const shell = await caches.open(SHELL);
  const res = await fetch(path, { cache: "reload" });
  if (!isCacheable(res) || res.redirected) return;
  await putQuietly(shell, new URL(path, self.location.origin).href, res.clone());
  const html = await res.text();
  const assets = [...new Set(html.match(/\/_next\/static\/[^"'\\\s<>)]+/g) || [])];
  await Promise.allSettled(assets.map(cacheAsset));
}

// Bulletins de démonstration (public/audio/demo-*) : listés par demo-index.json, gardés dès l'installation pour être lus sans internet.
async function cacheDemoAudio() {
  const res = await fetch("/audio/demo-index.json");
  if (!isCacheable(res)) return;
  const index = await res.clone().json();
  const cache = await caches.open(AUDIO);
  await putQuietly(cache, "/audio/demo-index.json", await stamp(res));
  const files = (Array.isArray(index) ? index : []).flatMap((e) => (e && /^[\w-]+$/.test(e.id) ? [`/audio/demo-${e.id}.mp3`, `/audio/demo-${e.id}.json`] : []));
  await Promise.allSettled(
    files.slice(0, 20).map(async (f) => {
      if (await cache.match(f)) return;
      const r = await fetch(f);
      if (isCacheable(r)) await putQuietly(cache, f, await stamp(r));
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await Promise.allSettled([...PRECACHE_PAGES.map(cachePage), ...PRECACHE_FILES.map(cacheAsset), cacheDemoAudio()]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) if (name.startsWith("sakia-") && !KEEP.includes(name)) await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});

// ---------- stratégies ----------

// Réseau d'abord. La copie gardée sert seulement si le réseau échoue, répond en erreur serveur (5xx), ou est lent (`timeout`)
// ET qu'une copie existe : sans copie on attend le réseau, même lent. Une réponse tardive est quand même gardée.
async function networkFirst(event, cacheName, { timeout = API_TIMEOUT_MS, accept = isCacheable, stampIt = false, onMiss, max } = {}) {
  const request = event.request;
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request.url);
  const net = fetch(request).then(async (res) => {
    if (!accept(res)) return res;
    const stored = stampIt ? await stamp(res.clone()) : res.clone();
    event.waitUntil(
      putQuietly(cache, request.url, stored.clone()).then(() => (max ? trim(cacheName, max) : undefined)),
    );
    return stampIt ? withHeaders(stored, { "x-sakia-served-from": "network" }) : res;
  });
  event.waitUntil(net.catch(() => {}));
  let res = null;
  try {
    res = hit && timeout ? await Promise.race([net, delay(timeout).then(() => null)]) : await net;
  } catch {
    res = null;
  }
  if (res && res.status < 500) return res;
  if (hit) return stampIt ? withHeaders(hit, { "x-sakia-served-from": "cache" }) : hit;
  if (res) return res; // erreur serveur et rien de gardé : on la montre telle quelle
  return onMiss ? onMiss() : Response.error();
}

const planOffline = () =>
  new Response(JSON.stringify({ error: "offline", offline: true }), {
    status: 503,
    headers: { "Content-Type": "application/json", "x-sakia-served-from": "none" },
  });

async function offlinePage() {
  const cache = await caches.open(SHELL);
  return (
    (await cache.match(new URL("/offline", self.location.origin).href)) ||
    new Response("Sakia : hors connexion. Ouvrez l'application une fois avec internet.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  );
}

async function handleNavigation(event) {
  const request = event.request;
  const cache = await caches.open(SHELL);
  const path = new URL(request.url).pathname;
  const hit = (await cache.match(request.url)) || (await cache.match(new URL(path, self.location.origin).href));
  const net = fetch(request).then((res) => {
    if (isCacheable(res) && !res.redirected && (res.headers.get("content-type") || "").includes("text/html")) {
      event.waitUntil(putQuietly(cache, request.url, res.clone()).then(() => trim(SHELL, MAX_SHELL)));
    }
    return res;
  });
  event.waitUntil(net.catch(() => {}));
  let res = null;
  try {
    res = hit && !IS_DEV ? await Promise.race([net, delay(NAV_TIMEOUT_MS).then(() => null)]) : await net;
  } catch {
    res = null;
  }
  if (res && res.status < 500) return res;
  return hit || res || (await offlinePage());
}

async function cacheFirst(event, cacheName, max) {
  const request = event.request;
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request.url);
  if (hit) return hit;
  const res = await fetch(request);
  if (isCacheable(res)) event.waitUntil(putQuietly(cache, request.url, res.clone()).then(() => trim(cacheName, max)));
  return res;
}

async function staleWhileRevalidate(event, cacheName, max) {
  const request = event.request;
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request.url);
  const net = fetch(request).then(async (res) => {
    if (isCacheable(res)) await putQuietly(cache, request.url, res.clone());
    return res;
  });
  event.waitUntil(net.then(() => trim(cacheName, max)).catch(() => {}));
  return hit || net;
}

// Un lecteur audio demande des morceaux (« Range ») : on garde le fichier entier et on découpe nous-mêmes.
async function rangeResponse(response, request) {
  const header = request.headers.get("range");
  if (!header) return response;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  const blob = await response.clone().blob();
  const size = blob.size;
  const type = response.headers.get("content-type") || "audio/mpeg";
  if (!m || (m[1] === "" && m[2] === "")) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  const start = m[1] === "" ? Math.max(0, size - Number(m[2])) : Number(m[1]);
  const end = m[1] === "" || m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (start > end || start >= size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: { "Content-Type": type, "Content-Length": String(end - start + 1), "Content-Range": `bytes ${start}-${end}/${size}`, "Accept-Ranges": "bytes" },
  });
}

// Audio : la copie gardée sert pendant 1 h ; au-delà on redemande au serveur avec l'empreinte du fichier (ETag) : s'il n'a pas changé,
// il répond « inchangé » sans renvoyer l'audio. Réseau coupé : la copie gardée, quel que soit son âge.
async function handleAudio(event) {
  const request = event.request;
  const cache = await caches.open(AUDIO);
  const hit = await cache.match(request.url);
  const age = hit ? Date.now() - Number(hit.headers.get("x-sakia-cached-at") || 0) : Infinity;
  if (hit && age < AUDIO_FRESH_MS) return rangeResponse(hit, request);
  try {
    const headers = hit && hit.headers.get("etag") ? { "If-None-Match": hit.headers.get("etag") } : {};
    const res = await Promise.race([fetch(new Request(request.url, { headers })), delay(hit ? API_TIMEOUT_MS : 60000).then(() => Promise.reject(new Error("timeout")))]);
    if (res.status === 304 && hit) {
      const renewed = await stamp(hit.clone());
      await putQuietly(cache, request.url, renewed.clone());
      return rangeResponse(renewed, request);
    }
    if (!isCacheable(res)) return hit ? rangeResponse(hit, request) : res;
    const stored = await stamp(res.clone());
    await putQuietly(cache, request.url, stored.clone());
    event.waitUntil(trim(AUDIO, MAX_AUDIO));
    return rangeResponse(stored, request);
  } catch {
    if (hit) return rangeResponse(hit, request);
    return new Response("", { status: 503 });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname;

  if (request.mode === "navigate") return event.respondWith(handleNavigation(event));
  if (path === "/api/plan") return event.respondWith(networkFirst(event, DATA, { stampIt: true, accept: (r) => r.ok, onMiss: planOffline, max: MAX_DATA }));
  if (path === "/api/catalog" || path === "/api/backtest") return event.respondWith(networkFirst(event, DATA, { max: MAX_DATA }));
  if (path.startsWith("/audio/")) return event.respondWith(handleAudio(event));
  if (path.startsWith("/_next/static/") || path.startsWith("/__nextjs_font/"))
    return event.respondWith(IS_DEV ? networkFirst(event, STATIC, { max: MAX_STATIC }) : cacheFirst(event, STATIC, MAX_STATIC));
  if (path.startsWith("/icons/") || path.startsWith("/_next/image") || path === "/manifest.webmanifest")
    return event.respondWith(staleWhileRevalidate(event, STATIC, MAX_STATIC));
  // tout le reste (autres API, SMS, Telegram, flux de développement) passe sans toucher à la mémoire
});

// ---------- mise à jour des plans gardés ----------

async function notifyClients(message) {
  for (const client of await self.clients.matchAll({ includeUncontrolled: true })) client.postMessage(message);
}

const lastAttempt = new Map(); // URL -> heure du dernier essai (réussi ou non), pour ne pas insister quand le réseau est mauvais
let refreshing = null; // une seule mise à jour à la fois, même si la page, le retour du réseau et la synchronisation périodique la demandent ensemble

function refreshStalePlans(force) {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const cache = await caches.open(DATA);
    let refreshed = 0;
    for (const request of await cache.keys()) {
      if (new URL(request.url).pathname !== "/api/plan") continue;
      const hit = await cache.match(request);
      if (!hit) continue;
      const cachedAt = Number(hit.headers.get("x-sakia-cached-at")) || 0;
      const dataAt = Number(hit.headers.get("x-sakia-data-at")) || cachedAt;
      const now = Date.now();
      if (!force && (now - dataAt < STALE_MS || now - (lastAttempt.get(request.url) || 0) < MIN_RETRY_MS || now - cachedAt < MIN_RETRY_MS)) continue;
      lastAttempt.set(request.url, now);
      try {
        const res = await Promise.race([fetch(new Request(request.url, { cache: "no-store" })), delay(API_TIMEOUT_MS).then(() => Promise.reject(new Error("timeout")))]);
        if (res.ok) {
          await putQuietly(cache, request.url, await stamp(res));
          refreshed++;
        }
      } catch {
        // pas de réseau : on garde l'ancien plan, il sera réessayé plus tard
      }
    }
    if (refreshed) await notifyClients({ type: "PLANS_REFRESHED", count: refreshed });
    return refreshed;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

// Seules des adresses de ce site et de dossiers connus sont acceptées (la page est de confiance, mais on vérifie).
const allowedAsset = (u) => typeof u === "string" && u.startsWith("/") && !u.startsWith("//") && ASSET_PREFIXES.some((p) => u.startsWith(p));
const allowedPage = (u) => typeof u === "string" && /^\/[A-Za-z0-9/_\-.?=&%]*$/.test(u) && !u.startsWith("//") && !u.startsWith("/api/");

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "PRECACHE") {
    const assets = (Array.isArray(data.urls) ? data.urls : []).filter(allowedAsset).slice(0, 80);
    const pages = (Array.isArray(data.pages) ? data.pages : []).filter(allowedPage).slice(0, 5);
    event.waitUntil(Promise.allSettled([...assets.filter((u) => !u.startsWith("/audio/")).map(cacheAsset), ...pages.map(cachePage)]));
  } else if (data.type === "REFRESH_STALE") {
    event.waitUntil(refreshStalePlans(!!data.force));
  } else if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Synchronisation périodique : le navigateur (Chrome sur Android, application installée) choisit le moment, parfois jamais.
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "sakia-refresh") event.waitUntil(refreshStalePlans(false));
});
