// Simulation web du bot Telegram (page /telegram). On exécute handleUpdate, le VRAI code du bot, avec :
//  - une fausse API Telegram qui note ce que le bot enverrait (aucun appel à api.telegram.org) ;
//  - une base en mémoire, remplie avec l'abonné que le navigateur renvoie : le serveur ne garde rien d'un appel à l'autre,
//    donc cela marche sur des instances sans état (serverless) ;
//  - aucune voix (synth renvoie null : le bot répond alors par le texte du bulletin) et aucune reconnaissance vocale ;
//  - le vrai moteur et la vraie météo (lecture seule).
// Rien n'est écrit dans Supabase, rien n'est envoyé à Telegram. Les identifiants de conversation sont fabriqués ici,
// jamais repris du navigateur.

import { getCrop } from "../crops";
import { getRegion } from "../regions";
import { EFFICIENCY, SOILS } from "../waterBalance";
import { TelegramError } from "./api";
import type { BotApi } from "./api";
import { computePlan, handleUpdate } from "./bot";
import type { Deps } from "./bot";
import { parseAction } from "./keyboards";
import { RateLimiter } from "./ratelimit";
import type { Store, Subscriber } from "./store";
import type { InlineKeyboard, TgUpdate } from "./types";

// Négatif : jamais l'identifiant d'une vraie conversation privée de Telegram (toujours positif).
export const SIM_CHAT_ID = -4242;

export const MAX_BODY_BYTES = 8 * 1024; // un appel normal pèse moins de 2 Ko
const MAX_TEXT = 200; // même plafond que le champ de saisie de la page (le bot coupe l'écho à 200 aussi)
const MAX_MESSAGE_ID = 1_000_000;
const MAX_MESSAGE_TEXT = 4096; // limite d'un message Telegram
const MAX_OUT = 12; // messages renvoyés par appel (le bot en envoie 3 au plus)
const DEADLINE_MS = 20_000; // la météo peut traîner : au-delà, le navigateur reçoit une erreur claire

// Ce que le navigateur affiche : un message envoyé, un message modifié (même bulle), un petit message flottant
// (réponse à l'appui sur un bouton) ou un fichier audio (jamais produit tant que la voix est absente).
export type SimMessage = { kind: "send" | "edit" | "answer" | "audio"; text: string; markup?: InlineKeyboard; messageId?: number };
export type SimOutput = { messages: SimMessage[]; subscriber: Subscriber | null };

export type SimInput = {
  update: TgUpdate;
  subscriber: Subscriber | null;
  // Message portant le bouton pressé, tel que le navigateur l'affiche : sert à refuser une modification identique,
  // comme Telegram (« message is not modified »), pour que « Mettre à jour » réponde « Déjà à jour ».
  current: { id: number; text?: string } | null;
};

export class SimTimeout extends Error {}

// ---------- validation de l'appel ----------

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const onlyKeys = (o: Record<string, unknown>, allowed: string[]) => Object.keys(o).every((k) => allowed.includes(k));
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/; // tout sauf tabulation et sauts de ligne

function validDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// Abonné renvoyé par le navigateur : chaque champ est vérifié contre le catalogue ; chat_id est toujours refabriqué.
// undefined = refusé.
function parseSubscriber(x: unknown): Subscriber | null | undefined {
  if (x === null || x === undefined) return null;
  if (!isObj(x) || !onlyKeys(x, ["chat_id", "lang", "region_id", "crop_id", "soil", "system", "last_irrigation", "daily_bulletin"])) return undefined;
  const { lang, region_id, crop_id, soil, system, last_irrigation, daily_bulletin } = x;
  if (lang !== "fr" && lang !== "ar" && lang !== "en") return undefined;
  if (typeof region_id !== "string" || !getRegion(region_id)) return undefined;
  if (typeof crop_id !== "string" || !getCrop(crop_id)) return undefined;
  if (typeof soil !== "string" || !Object.hasOwn(SOILS, soil)) return undefined;
  if (typeof system !== "string" || !Object.hasOwn(EFFICIENCY, system)) return undefined;
  if (last_irrigation !== null && !(typeof last_irrigation === "string" && validDate(last_irrigation))) return undefined;
  if (typeof daily_bulletin !== "boolean") return undefined;
  return { chat_id: SIM_CHAT_ID, lang, region_id, crop_id, soil, system, last_irrigation, daily_bulletin };
}

// Code de langue de l'utilisateur (comme Telegram : « fr », « ar », « en-GB »…). undefined = refusé ; null = absent.
function parseLangCode(from: unknown): string | null | undefined {
  if (from === undefined) return null;
  if (!isObj(from)) return undefined;
  const code = from.language_code;
  if (code === undefined) return null;
  return typeof code === "string" && /^[A-Za-z]{2,3}([-_][A-Za-z0-9]{2,8})?$/.test(code) ? code : undefined;
}

const isId = (x: unknown): x is number => typeof x === "number" && Number.isSafeInteger(x) && x >= 1 && x <= MAX_MESSAGE_ID;

let seq = 0; // numéros fabriqués ici pour update_id, message_id et identifiant de bouton

// Reconstruit une mise à jour propre à partir des seuls champs lus : tout le reste (chat, date, identifiants) est fabriqué.
function parseUpdate(x: unknown): { update: TgUpdate; current: SimInput["current"] } | null {
  if (!isObj(x)) return null;
  const msg = x.message;
  const cb = x.callback_query;
  if ((msg === undefined) === (cb === undefined)) return null; // exactement un des deux
  const chat = { id: SIM_CHAT_ID, type: "private" };
  const date = Math.floor(Date.now() / 1000);

  if (msg !== undefined) {
    if (!isObj(msg) || msg.voice !== undefined) return null; // pas de message vocal dans la démonstration
    const lang = parseLangCode(msg.from);
    if (lang === undefined || typeof msg.text !== "string") return null;
    const text = msg.text.trim();
    if (!text || text.length > MAX_TEXT || CONTROL.test(text)) return null;
    const id = ++seq;
    const from = { id: SIM_CHAT_ID, ...(lang ? { language_code: lang } : {}) };
    return { update: { update_id: id, message: { message_id: id, chat, from, text, date } }, current: null };
  }

  if (!isObj(cb) || typeof cb.data !== "string" || cb.data.length > 64 || parseAction(cb.data) === null) return null;
  const m = cb.message;
  if (!isObj(m) || !isId(m.message_id)) return null;
  if (m.text !== undefined && (typeof m.text !== "string" || m.text.length > MAX_MESSAGE_TEXT)) return null;
  const lang = parseLangCode(cb.from);
  if (lang === undefined) return null;
  const id = ++seq;
  const from = { id: SIM_CHAT_ID, ...(lang ? { language_code: lang } : {}) };
  return {
    update: { update_id: id, callback_query: { id: String(id), from, data: cb.data, message: { message_id: m.message_id, chat, date } } },
    current: { id: m.message_id, text: typeof m.text === "string" ? m.text : undefined },
  };
}

export type ParsedBody = { ok: true; value: SimInput } | { ok: false; error: "invalid_update" | "invalid_subscriber" | "invalid_body" };

export function parseSimBody(raw: unknown): ParsedBody {
  if (!isObj(raw) || !onlyKeys(raw, ["update", "subscriber"])) return { ok: false, error: "invalid_body" };
  const parsed = parseUpdate(raw.update);
  if (!parsed) return { ok: false, error: "invalid_update" };
  const subscriber = parseSubscriber(raw.subscriber);
  if (subscriber === undefined) return { ok: false, error: "invalid_subscriber" };
  return { ok: true, value: { update: parsed.update, subscriber, current: parsed.current } };
}

// Lit le corps de l'appel en s'arrêtant dès que la limite est franchie (l'en-tête Content-Length peut manquer ou mentir).
export async function readLimitedText(request: Request, max: number = MAX_BODY_BYTES): Promise<{ ok: true; text: string } | { ok: false }> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) return { ok: false };
  const reader = request.body?.getReader();
  if (!reader) return { ok: true, text: "" };
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => undefined);
      return { ok: false };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(bytes) };
}

// ---------- limite par adresse ----------

const WINDOW_MS = 60_000;
export const SIM_PER_IP = 60; // appels par minute et par adresse : un humain qui clique n'approche jamais cela
export const SIM_GLOBAL = 1200; // plafond de l'instance, au cas où l'en-tête d'adresse serait falsifié
const hits = new Map<string, number[]>();
let lastPrune = 0;
let globalStart = 0;
let globalCount = 0;

// Mémoire du processus, comme les autres limites du site : un frein, pas un blocage strict en déploiement multi-instances.
export function simAllowed(address: string, now: number = Date.now()): { ok: true } | { ok: false; retryAfter: number } {
  const ip = address.slice(0, 64); // l'en-tête d'adresse vient du client : on borne la taille de la clé gardée en mémoire
  if (now - globalStart >= WINDOW_MS) {
    globalStart = now;
    globalCount = 0;
  }
  if (++globalCount > SIM_GLOBAL) return { ok: false, retryAfter: Math.max(1, Math.ceil((globalStart + WINDOW_MS - now) / 1000)) };

  if (now - lastPrune >= WINDOW_MS || hits.size > 5000) {
    lastPrune = now;
    for (const [k, ts] of hits) if (!ts.some((t) => now - t < WINDOW_MS)) hits.delete(k);
    if (hits.size > 5000) hits.clear(); // attaque avec des milliers d'adresses : le plafond global protège déjà l'instance
  }
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= SIM_PER_IP) {
    hits.set(ip, recent);
    return { ok: false, retryAfter: Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000)) };
  }
  recent.push(now);
  hits.set(ip, recent);
  return { ok: true };
}

// ---------- exécution ----------

// Valeurs par défaut des colonnes de la table subscribers (docs/supabase.sql), SAUF la région et la culture : la démonstration
// ne devine jamais l'une ni l'autre (la vraie table, elle, aurait « Kairouan » et « olivier » par défaut).
const DEFAULT_ROW = { lang: "en", soil: "limoneux", system: "goutte", last_irrigation: null, daily_bulletin: true } as const;

function memoryStore(seed: Subscriber | null): Store & { row: () => Subscriber | null } {
  let row = seed;
  return {
    async get() {
      return row;
    },
    async upsert(_id, patch) {
      // Pas de ligne sans région ni culture choisies : la fin de la configuration (finishSetup) les donne toujours.
      if (!row && (!patch.region_id || !patch.crop_id)) throw new Error("région et culture obligatoires");
      row = { ...DEFAULT_ROW, ...row, ...patch, chat_id: SIM_CHAT_ID } as Subscriber;
      return row;
    },
    async remove() {
      row = null;
    },
    async listDaily() {
      return []; // la démonstration n'envoie jamais de bulletin
    },
    row: () => row,
  };
}

function capturingApi(out: SimMessage[], current: SimInput["current"]): BotApi {
  const push = (m: SimMessage) => {
    if (out.length < MAX_OUT) out.push(m);
  };
  return {
    async sendMessage(_chat, text, markup) {
      push({ kind: "send", text, markup });
    },
    async editMessage(_chat, messageId, text, markup) {
      // Telegram refuse un contenu identique : le bot en tient compte (« Déjà à jour »).
      if (current && current.id === messageId && current.text === text) throw new TelegramError("editMessageText", 400, "Bad Request: message is not modified");
      push({ kind: "edit", messageId, text, markup });
    },
    async answerCallback(_id, text) {
      if (text) push({ kind: "answer", text }); // sans texte, Telegram ne montre rien
    },
    async sendChatAction() {},
    async sendAudio(_chat, _audio, _mime, caption) {
      push({ kind: "audio", text: caption });
    },
    async downloadFile() {
      throw new TelegramError("getFile", 0, "indisponible dans la démonstration");
    },
  };
}

// Rejoue une mise à jour. Api, base, voix et signalements sont toujours factices ; seuls le moteur et la météo sont réels.
export async function runSimulation(input: SimInput): Promise<SimOutput> {
  const messages: SimMessage[] = [];
  const store = memoryStore(input.subscriber);
  const deps: Deps = {
    api: capturingApi(messages, input.current),
    store,
    synth: async () => null,
    stt: async () => {
      throw new Error("reconnaissance vocale indisponible dans la démonstration");
    },
    limiter: new RateLimiter(),
    voiceLimiter: new RateLimiter(10, 3_600_000),
    reportLimiter: new RateLimiter(20, 3_600_000),
    reports: {
      // signalements de pluie : acceptés puis oubliés (rien n'est écrit dans la vraie base ; le bot compte le sien tout seul)
      async save() {
        return true;
      },
      async load() {
        return [];
      },
    },
    plan: computePlan,
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<"late">((resolve) => {
    timer = setTimeout(() => resolve("late"), DEADLINE_MS);
  });
  const done = handleUpdate(input.update, deps).then(() => "done" as const);
  const outcome = await Promise.race([done, late]).finally(() => clearTimeout(timer));
  if (outcome === "late") throw new SimTimeout();
  return { messages, subscriber: store.row() };
}
