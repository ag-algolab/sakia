// Côté navigateur : récupère le message parlé court (/api/advice), le charge D'AVANCE et le garde sur l'appareil.
// But : quand la personne appuie sur « écouter », le son part tout de suite (déjà chargé), même avec un mauvais réseau,
// et se rejoue sans connexion avec le dernier message gardé (12 h au plus).
// RÈGLE DE SÉCURITÉ : une copie gardée n'est rejouée que si elle dit la même chose que l'écran. Chaque message est gardé avec le
// niveau de fiabilité et le jour du plan qui l'a produit (en-têtes x-advice-level et x-advice-today) ; si le plan affiché a changé de
// niveau (météo devenue trop ancienne : phrase « pas sûr » à dire ou à ne plus dire) ou de jour (« demain » ne veut plus dire la
// même chose), la copie est écartée plutôt que jouée. Mieux vaut le silence qu'une voix qui contredit l'écran.
// SOUS-TITRES : le serveur renvoie, dans l'en-tête x-advice-subs, les phrases du message dans la langue demandée (`subs`), construites à
// partir du même plan que la voix. Elles sont gardées avec le son (même copie, même durée de vie) : un message rejoué sans connexion
// garde ses sous-titres.
// Ne dépend d'aucun code serveur : importable depuis un composant « use client ».
//
// Les copies sont gardées dans l'API Cache de la page, sous un nom SANS le préfixe « sakia- » : le service worker supprime
// tous les caches « sakia-* » qu'il ne connaît pas à chaque mise à jour (public/sw.js, activate).

export type AdviceQuery = {
  region: string;
  crop: string;
  ago: string; // "" = inconnu
  soil: string;
  system: string;
  planting: string;
  asOf?: string;
  subs?: string; // langue des sous-titres (en, fr, ar ou aeb) ; absent = pas de sous-titres
};

// Une phrase sous-titrée. `w` = poids de la phrase dans le son (lettres dites) : sert à caler l'affichage sur la lecture.
export type Sub = { id: string; text: string; w: number };
export type Clip = { blob: Blob; subs: Sub[] };

// Ce que dit l'écran : niveau de confiance et jour du plan affiché (null tant que le plan n'est pas là : aucune copie n'est rejouée).
export type AdviceExpect = { level: string; today: string } | null;
export type StoredAdvice = Clip & { ageMs: number };

const CACHE_NAME = "advice-clips-v1";
export const ADVICE_MAX_AGE_MS = 12 * 3600 * 1000;
const MEM_MS = 5 * 60 * 1000; // une copie chargée il y a moins de 5 min est rejouée sans rien redemander
const PREFETCH_TIMEOUT_MS = 15000;
const KEEP = 8;
const MIN_BYTES = 1000; // en dessous, ce n'est pas un message (réponse d'erreur, fichier tronqué)

type Meta = { level: string; today: string };
type Entry = { blob: Blob; at: number; meta: Meta; subs: string }; // `subs` : l'en-tête x-advice-subs tel que reçu ("" = aucun)

const mem = new Map<string, Entry>();
const pending = new Map<string, Promise<void>>(); // chargements d'avance en cours
const clicking = new Set<string>(); // chargements demandés par un appui en cours

export function adviceUrl(q: AdviceQuery, prefetch = false): string {
  const p = new URLSearchParams({ region: q.region, crop: q.crop, lang: "aeb", soil: q.soil, system: q.system });
  if (q.ago !== "") p.set("ago", q.ago);
  if (q.planting) p.set("planting", q.planting);
  if (q.asOf) p.set("asOf", q.asOf);
  if (q.subs) p.set("subs", q.subs);
  if (prefetch) p.set("prefetch", "1");
  return `/api/advice?${p}`;
}

const sameAsScreen = (m: Meta, expect: AdviceExpect) => expect != null && m.level === expect.level && m.today === expect.today;

// En-tête → phrases. Tout ce qui n'a pas la bonne forme est écarté : au pire, le son se joue sans sous-titres.
function parseSubs(raw: string): Sub[] {
  if (!raw) return [];
  try {
    const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    const v: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!Array.isArray(v)) return [];
    return v
      .filter((x): x is Sub => !!x && typeof x.id === "string" && typeof x.text === "string" && x.text !== "" && Number.isFinite(x.w) && x.w > 0)
      .slice(0, 8);
  } catch {
    return [];
  }
}

// Phrase à afficher à l'instant `t` (secondes) d'un message qui dure `d` secondes : proportion des lettres dites, avec une marge de
// silence au début et à la fin du fichier. C'est une estimation, pas un alignement : la phrase peut avoir une seconde d'avance ou de retard.
const LEAD_S = 0.2;
const TAIL_S = 0.5;
export const CLIP_BYTES_PER_SECOND = 4000; // mp3_22050_32 (voir src/lib/voice/voices.ts) : 32 kbit/s, pour estimer la durée si le lecteur ne la donne pas
export function subtitleAt(subs: Sub[], t: number, d: number): number {
  if (subs.length === 0) return -1;
  const total = subs.reduce((a, s) => a + s.w, 0);
  const span = Math.max(1, d - LEAD_S - TAIL_S);
  const at = Math.min(1, Math.max(0, (t - LEAD_S) / span)) * total;
  let acc = 0;
  for (let i = 0; i < subs.length; i++) {
    acc += subs[i].w;
    if (at < acc) return i;
  }
  return subs.length - 1;
}

// Réponse valide : 200, un fichier audio, d'une taille plausible. Sinon null (rien n'est gardé).
async function readClip(res: Response): Promise<Entry | null> {
  if (res.status !== 200 || !(res.headers.get("content-type") ?? "").startsWith("audio/")) return null;
  const blob = await res.blob();
  if (blob.size < MIN_BYTES) return null;
  return {
    blob,
    at: Date.now(),
    meta: { level: res.headers.get("x-advice-level") ?? "?", today: res.headers.get("x-advice-today") ?? "?" },
    subs: res.headers.get("x-advice-subs") ?? "",
  };
}

async function keep(url: string, e: Entry): Promise<void> {
  try {
    if (typeof caches === "undefined") return;
    const cache = await caches.open(CACHE_NAME);
    await cache.put(
      url,
      new Response(e.blob, {
        headers: { "content-type": "audio/mpeg", "x-saved-at": String(e.at), "x-advice-level": e.meta.level, "x-advice-today": e.meta.today, "x-advice-subs": e.subs },
      }),
    );
    const all = await Promise.all((await cache.keys()).map(async (r) => ({ r, at: Number((await cache.match(r))?.headers.get("x-saved-at")) || 0 })));
    all.sort((a, b) => a.at - b.at);
    for (const old of all.slice(0, Math.max(0, all.length - KEEP))) await cache.delete(old.r);
  } catch {
    // stockage plein ou bloqué : le message se joue quand même
  }
}

// Dernier message gardé pour cette demande : moins de 12 h ET identique à l'écran (niveau et jour). Sinon null.
export async function storedAdvice(q: AdviceQuery, expect: AdviceExpect): Promise<StoredAdvice | null> {
  try {
    if (typeof caches === "undefined" || expect == null) return null;
    const hit = await (await caches.open(CACHE_NAME)).match(adviceUrl(q));
    if (!hit) return null;
    const meta = { level: hit.headers.get("x-advice-level") ?? "?", today: hit.headers.get("x-advice-today") ?? "?" };
    const ageMs = Date.now() - (Number(hit.headers.get("x-saved-at")) || 0);
    if (ageMs > ADVICE_MAX_AGE_MS || !sameAsScreen(meta, expect)) return null;
    return { blob: await hit.blob(), subs: parseSubs(hit.headers.get("x-advice-subs") ?? ""), ageMs };
  } catch {
    return null;
  }
}

// Oublie la copie d'une demande (fichier illisible à la lecture : il ne doit pas être rejoué pendant 12 h).
export async function forgetAdvice(q: AdviceQuery): Promise<void> {
  const url = adviceUrl(q);
  mem.delete(url);
  try {
    if (typeof caches !== "undefined") await (await caches.open(CACHE_NAME)).delete(url);
  } catch {
    // rien à faire
  }
}

// Charge le message (son et sous-titres) : copie en mémoire si elle est toute fraîche ET identique à l'écran (chargée d'avance), sinon le
// réseau. Lève une erreur si le réseau échoue, répond autre chose qu'un vrai fichier audio, ou si `signal` est annulé : l'appelant se
// replie alors sur storedAdvice().
export async function loadAdvice(q: AdviceQuery, expect: AdviceExpect, signal?: AbortSignal): Promise<Clip> {
  const url = adviceUrl(q);
  const early = pending.get(url);
  if (early) {
    // un chargement d'avance est déjà en route : on l'attend, sauf si la personne annule ou si le délai tombe
    await Promise.race([early, new Promise<void>((done) => signal?.addEventListener("abort", () => done(), { once: true }))]);
  }
  if (signal?.aborted) throw new DOMException("annulé", "AbortError");
  const hot = mem.get(url);
  if (hot && Date.now() - hot.at < MEM_MS && sameAsScreen(hot.meta, expect)) return { blob: hot.blob, subs: parseSubs(hot.subs) };
  clicking.add(url);
  try {
    const entry = await readClip(await fetch(url, { signal }));
    if (!entry) throw new Error("réponse inutilisable");
    mem.set(url, entry);
    void keep(url, entry);
    return { blob: entry.blob, subs: parseSubs(entry.subs) };
  } finally {
    clicking.delete(url);
  }
}

// Chargement d'avance, discret : seulement les messages DÉJÀ préparés (le serveur répond 204 sinon, sans rien fabriquer ni dépenser).
// Pas d'avance si le réseau est coupé, si la personne a demandé d'économiser ses données, ou si un appui charge déjà ce message.
export function prefetchAdvice(q: AdviceQuery): void {
  if (typeof navigator === "undefined" || navigator.onLine === false) return;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return;
  const url = adviceUrl(q);
  const hot = mem.get(url);
  if (pending.has(url) || clicking.has(url) || (hot && Date.now() - hot.at < MEM_MS)) return;
  const job = fetch(adviceUrl(q, true), { signal: AbortSignal.timeout(PREFETCH_TIMEOUT_MS) })
    .then(async (res) => {
      const entry = await readClip(res);
      if (!entry) return;
      mem.set(url, entry);
      void keep(url, entry);
    })
    .catch(() => undefined)
    .finally(() => {
      pending.delete(url);
    });
  pending.set(url, job);
}
